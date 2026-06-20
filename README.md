# CF-Police

A behavioral anomaly detection system for [Codeforces](https://codeforces.com) that analyzes user activity patterns to flag potential cheating. It runs entirely inside your browser as an extension!

## Features

- **Profile Badges**: Automatically evaluates users and injects a color-coded "CF-Police Pill" directly onto their Codeforces profile page.
- **Standings Scanner**: A "Check All" button in the standings table that evaluates all participants sequentially, adding CF-Police pills right next to their rank!
- **Local Caching**: Profiles are cached locally for 24 hours to prevent API rate-limiting from Codeforces.
- **False Positive Reporting**: One-click button on flagged profiles to submit an automatic GitHub issue for edge cases.

## How It Works

CF-Police computes a **behavioral anomaly score (0.0–5.0)** by evaluating a user's contest history and submission patterns using a locally-embedded engine. It looks for anomalies in their speed-to-milestone ratio, difficulty jumps, rating spikes, and more.

## Installation

### From Releases (Chrome & Firefox)
1. Go to the [Releases](https://github.com/codewithayuu/cf-police/releases) page.
2. Download the `.zip` file for your browser.
3. Unzip the file.
4. **Chrome**: Go to `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**. Select the unzipped folder.
5. **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the `manifest.json` file.

### Local Development
See the [CONTRIBUTING.md](CONTRIBUTING.md) guide to learn how to build and install from source!

## Scoring

The score combines weighted feature percentiles with guardrail penalties, clipped to 0.0–5.0:

- **0.0–1.0** — Likely Genuine
- **1.0–2.0** — Suspicious
- **2.0–3.0** — Maybe Cheated
- **3.0–4.0** — Most Probably Cheated
- **4.0–5.0** — Cheater

## License

MIT
