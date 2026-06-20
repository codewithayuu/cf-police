<div align="center">
  <img src="extension/icon.png" alt="CF-Police" width="80" height="80">
  <h1>CF-Police</h1>
  <p><strong>Behavioral Anomaly Detection for Codeforces</strong></p>

  <!-- Badges -->
  <p>
    <a href="https://github.com/codewithayuu/cf-police/releases">
      <img src="https://img.shields.io/github/v/release/codewithayuu/cf-police?style=flat&label=version&color=2196F3" alt="Version">
    </a>
    <a href="https://github.com/codewithayuu/cf-police/actions/workflows/release.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/codewithayuu/cf-police/release.yml?style=flat&label=build&color=4CAF50" alt="Build">
    </a>
    <a href="https://github.com/codewithayuu/cf-police/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/codewithayuu/cf-police?style=flat&label=license&color=FF9800" alt="License">
    </a>
    <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat&logo=googlechrome&logoColor=white" alt="Chrome">
    <img src="https://img.shields.io/badge/Firefox-MV3-FF7139?style=flat&logo=firefox&logoColor=white" alt="Firefox">
  </p>

  <p>
    <img src="https://github.com/codewithayuu/cf-police/raw/master/.github/assets/demo.gif" alt="Demo" width="700">
  </p>
</div>

---

## Overview

**CF-Police** is a browser extension that analyzes Codeforces user activity and flags potential cheating. It runs a full statistical engine **entirely client-side** — no server, no API keys, no data collection. Just install and browse.

### What It Looks Like

| Profile Page | Standings Page |
|---|---|
| ![Profile](https://github.com/codewithayuu/cf-police/raw/master/.github/assets/profile-pill.png) | ![Standings](https://github.com/codewithayuu/cf-police/raw/master/.github/assets/standings-scanner.png) |
| Color-coded badge injects next to the username | "Check All" button evaluates every participant |

---

## Features

<div>
  <table>
    <tr>
      <td width="50%">
        <h3>🛡️ Profile Viewer</h3>
        <p>Visit any Codeforces profile — the extension automatically fetches their data and displays a color-coded anomaly score next to their name.</p>
      </td>
      <td width="50%">
        <h3>📊 Standings Scanner</h3>
        <p>In contest standings, a "Check All" button evaluates every participant with rate-limited API calls and color-coded results inline.</p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <h3>⚡ Fully Local</h3>
        <p>All scoring logic runs in your browser via <code>engine.js</code>. Zero data sent anywhere. Cached results prevent redundant API calls.</p>
      </td>
      <td width="50%">
        <h3>🚨 False Positive Reports</h3>
        <p>Flagged profiles get a one-click "Report False Positive" button that pre-fills a GitHub issue with the user's handle and score.</p>
      </td>
    </tr>
  </table>
</div>

---

## How It Works

The extension computes a **behavioral anomaly score (0.0–5.0)** using 9 features built from Codeforces public API data, plus 5 guardrail heuristics for obvious cheating patterns.

```mermaid
flowchart LR
    A[Codeforces API] --> B[Rating History]
    A --> C[Submission History]
    B --> D[9 Features]
    C --> D
    D --> E[Weighted Score]
    F[Guardrails] --> E
    E --> G[0.0 – 5.0]
```

### Scoring Scale

| Score | Label | Color |
|---|---|---|
| 0.0 – 1.0 | Likely Genuine | 🟢 Green |
| 1.0 – 2.0 | Suspicious | 🟡 Yellow-Green |
| 2.0 – 3.0 | Maybe Cheated | 🟠 Yellow |
| 3.0 – 4.0 | Most Probably Cheated | 🔴 Orange |
| 4.0 – 5.0 | Cheater | 🔴 Red (pulsing) |

---

## Installation

<div align="center">
  <table>
    <tr>
      <th align="center">Chrome / Edge (MV3)</th>
      <th align="center">Firefox (MV3)</th>
    </tr>
    <tr>
      <td align="center">
        <a href="https://github.com/codewithayuu/cf-police/releases">
          <img src="https://img.shields.io/badge/Download-Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Download for Chrome">
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/codewithayuu/cf-police/releases">
          <img src="https://img.shields.io/badge/Download-Firefox-FF7139?style=for-the-badge&logo=firefox&logoColor=white" alt="Download for Firefox">
        </a>
      </td>
    </tr>
    <tr>
      <td>
        1. Download <code>cf-police-chrome.zip</code> from <a href="https://github.com/codewithayuu/cf-police/releases">Releases</a><br>
        2. Unzip the file<br>
        3. Go to <code>chrome://extensions</code><br>
        4. Enable <strong>Developer mode</strong><br>
        5. Click <strong>Load unpacked</strong> → select the folder
      </td>
      <td>
        1. Download <code>cf-police-firefox.zip</code> from <a href="https://github.com/codewithayuu/cf-police/releases">Releases</a><br>
        2. Unzip the file<br>
        3. Go to <code>about:debugging#/runtime/this-firefox</code><br>
        4. Click <strong>Load Temporary Add-on</strong><br>
        5. Select <code>manifest.json</code> from the folder
      </td>
    </tr>
  </table>
</div>

> **Note:** The extension is not on the Chrome Web Store or AMO yet. For now, install via Developer mode.

---

## Development

```bash
git clone https://github.com/codewithayuu/cf-police.git
cd cf-police/extension
```

Then load the `extension` folder as an unpacked extension in your browser. See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## Release Process

1. Go to **Actions → Bump Version → Run workflow**
2. Pick `patch`, `minor`, or `major`
3. The workflow bumps the version, creates a tag, and the release workflow auto-builds `cf-police-chrome.zip` and `cf-police-firefox.zip`
4. A GitHub Release is created with both zips attached

---

## License

[MIT](LICENSE) © Ayush Jha
