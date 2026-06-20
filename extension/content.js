let baselineData = null;
let settings = { hideStandingsCheck: false, disableCaching: false };

async function loadBaseline() {
  if (baselineData) return baselineData;
  const url = chrome.runtime.getURL("baseline.json");
  const res = await fetch(url);
  baselineData = await res.json();
  return baselineData;
}

async function fetchFromCF(handle) {
  try {
    const [ratingRes, statusRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.rating?handle=${handle}`),
      fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`)
    ]);

    const ratingData = await ratingRes.json();
    const statusData = await statusRes.json();

    if (ratingData.status !== "OK" || statusData.status !== "OK") {
      return null;
    }

    return {
      rating: ratingData.result || [],
      status: statusData.result || []
    };
  } catch (err) {
    console.error("CF API Error:", err);
    return null;
  }
}

async function getScoreLocal(handle) {
  const CACHE_KEY = "cfp_cache_" + handle;
  if (!settings.disableCaching) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        // Cache for 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.result;
        }
      } catch (e) {}
    }
  }

  const baseline = await loadBaseline();
  const cfData = await fetchFromCF(handle);
  if (!cfData) return null;

  const res = window.CFPoliceEngine.evaluateUser(handle, cfData.rating, cfData.status, baseline);
  
  if (!settings.disableCaching) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), result: res }));
    } catch (e) {}
  }
  
  return res;
}

function getBadgeColorClass(score) {
  if (score < 1.0) return "cfp-green";
  if (score < 2.0) return "cfp-yellow-green";
  if (score < 3.0) return "cfp-yellow";
  if (score < 4.0) return "cfp-orange";
  return "cfp-red";
}

function createPill(data) {
  if (!data) return null;
  const pill = document.createElement("span");
  pill.className = `cfp-pill ${getBadgeColorClass(data.score)}`;
  pill.textContent = `${data.label} (${data.score.toFixed(1)}/5.0)`;
  return pill;
}

async function injectProfilePill(handle) {
  const data = await getScoreLocal(handle);
  if (!data) return;

  const pill = createPill(data);
  if (!pill) return;

  const titleElem = document.querySelector(".info h1") || document.querySelector("h1");
  if (titleElem) {
    titleElem.appendChild(pill);
    
    // Add Report False Positive link for flagged users
    if (data.score >= 2.0) {
      const reportLink = document.createElement("a");
      reportLink.href = `https://github.com/codewithayuu/cf-police/issues/new?title=False+Positive%3A+${handle}&body=**Handle**%3A+${handle}%0A**Score**%3A+${data.score.toFixed(2)}%0A**Label**%3A+${data.label}%0A%0A**Why+do+you+believe+this+is+a+false+positive%3F**%0A`;
      reportLink.target = "_blank";
      reportLink.textContent = "Report False Positive";
      reportLink.style.fontSize = "14px";
      reportLink.style.marginLeft = "15px";
      reportLink.style.color = "#888";
      reportLink.style.textDecoration = "underline";
      titleElem.appendChild(reportLink);
    }
  }
}

let isCheckingAll = false;

function injectStandingsCheckers() {
  const tableElem = document.querySelector("table.standings");
  if (!tableElem) return;

  // 1. Add Header
  const headerRow = tableElem.querySelector("tr");
  if (!headerRow) return;
  const th = document.createElement("th");
  th.style.width = "180px";
  
  const headerContainer = document.createElement("div");
  headerContainer.style.display = "flex";
  headerContainer.style.gap = "5px";
  headerContainer.style.alignItems = "center";
  headerContainer.style.justifyContent = "center";
  headerContainer.style.flexWrap = "wrap";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = "CF-Police";
  
  const checkAllBtn = document.createElement("button");
  checkAllBtn.textContent = "Check All";
  checkAllBtn.className = "cfp-scanner-btn";
  checkAllBtn.style.padding = "2px 5px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "cfp-scanner-btn";
  cancelBtn.style.display = "none";
  cancelBtn.style.backgroundColor = "#f44336";
  cancelBtn.style.padding = "2px 5px";

  headerContainer.appendChild(titleSpan);
  headerContainer.appendChild(checkAllBtn);
  headerContainer.appendChild(cancelBtn);
  th.appendChild(headerContainer);
  headerRow.appendChild(th);

  // 2. Add Button to each row
  const rows = Array.from(tableElem.querySelectorAll("tr")).slice(1);
  const checkButtons = [];

  for (const row of rows) {
    const handleLink = row.querySelector(".contestant-cell a[href^='/profile/']") || row.querySelector("td:nth-child(2) a[href^='/profile/']");
    const td = document.createElement("td");
    
    if (handleLink) {
      const handle = handleLink.textContent.trim();
      let cachedData = null;
      if (!settings.disableCaching) {
        try {
          const cachedStr = localStorage.getItem("cfp_cache_" + handle);
          if (cachedStr) {
             const parsed = JSON.parse(cachedStr);
             if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                 cachedData = parsed.result;
             }
          }
        } catch(e) {}
      }

      if (cachedData) {
        const pill = createPill(cachedData);
        td.appendChild(pill);
      } else {
        const btn = document.createElement("button");
        btn.className = "cfp-scanner-btn";
        btn.textContent = "Check";
        
        const doCheck = async () => {
          btn.disabled = true;
          btn.textContent = "...";
          const data = await getScoreLocal(handle);
          if (data) {
            const pill = createPill(data);
            td.innerHTML = "";
            td.appendChild(pill);
            return true;
          } else {
            btn.textContent = "Check";
            btn.disabled = false;
            return false;
          }
        };

        btn.onclick = doCheck;
        checkButtons.push({ btn, doCheck, handle });
        td.appendChild(btn);
      }
    }
    
    row.appendChild(td);
  }

  checkAllBtn.onclick = async () => {
    isCheckingAll = true;
    checkAllBtn.style.display = "none";
    cancelBtn.style.display = "block";

    for (const item of checkButtons) {
      if (!isCheckingAll) break;
      if (item.btn.disabled) continue; // Already checked or checking
      
      let isCached = false;
      if (!settings.disableCaching) {
        try {
          const cachedStr = localStorage.getItem("cfp_cache_" + item.handle);
          if (cachedStr) {
             const parsed = JSON.parse(cachedStr);
             if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) isCached = true;
          }
        } catch(e) {}
      }
      
      const success = await item.doCheck();
      
      if (!success) {
        isCheckingAll = false;
        checkAllBtn.style.display = "block";
        cancelBtn.style.display = "none";
        break;
      }
      
      // Delay only if it wasn't cached to avoid API rate limits
      if (isCheckingAll && !isCached) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    isCheckingAll = false;
    checkAllBtn.style.display = "block";
    cancelBtn.style.display = "none";
  };

  cancelBtn.onclick = () => {
    isCheckingAll = false;
    checkAllBtn.style.display = "block";
    cancelBtn.style.display = "none";
  };
}

async function init() {
  await new Promise(r => {
    chrome.storage.sync.get({ hideStandingsCheck: false, disableCaching: false }, (res) => {
      settings = res;
      r();
    });
  });

  const pathParts = window.location.pathname.split("/");
  
  if (pathParts.length >= 3 && pathParts[1] === "profile") {
    const handle = pathParts[2];
    injectProfilePill(handle);
  }
  
  if (pathParts.length >= 4 && pathParts[1] === "contest" && pathParts[3].startsWith("standings")) {
    if (!settings.hideStandingsCheck) {
      injectStandingsCheckers();
    }
  }
}

init();
