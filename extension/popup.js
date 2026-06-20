document.addEventListener("DOMContentLoaded", () => {
    const hideStandingsCheck = document.getElementById("hideStandingsCheck");
    const disableCaching = document.getElementById("disableCaching");

    // Load existing settings
    chrome.storage.sync.get({ hideStandingsCheck: false, disableCaching: false }, (res) => {
        hideStandingsCheck.checked = res.hideStandingsCheck;
        disableCaching.checked = res.disableCaching;
    });

    // Save on change
    hideStandingsCheck.addEventListener("change", () => {
        chrome.storage.sync.set({ hideStandingsCheck: hideStandingsCheck.checked });
    });

    disableCaching.addEventListener("change", () => {
        chrome.storage.sync.set({ disableCaching: disableCaching.checked });
    });

    document.getElementById("reportBtn").addEventListener("click", () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let handle = "";
            if (tabs && tabs[0] && tabs[0].url) {
                const url = tabs[0].url;
                if (url.includes("codeforces.com/profile/")) {
                    const parts = url.split("codeforces.com/profile/");
                    if (parts.length > 1) {
                        handle = parts[1].split(/[/?#]/)[0];
                    }
                }
            }
            
            const issueUrl = `https://github.com/codewithayuu/cf-police/issues/new?title=False+Positive%3A+${handle}&body=**Handle**%3A+${handle}%0A**Score**%3A+%5BEnter+Score%5D%0A%0A**Why+do+you+believe+this+is+a+false+positive%3F**%0A`;
            chrome.tabs.create({ url: issueUrl });
        });
    });
});
