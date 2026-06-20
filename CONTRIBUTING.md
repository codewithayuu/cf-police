# Contributing to CF-Police

First off, thank you for considering contributing to CF-Police! It's people like you that make CF-Police such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Developing the Extension Locally

CF-Police is a client-side JavaScript extension (Manifest V3) with no external backend dependencies. All the algorithmic logic lives directly in `engine.js`.

### Installation

1. Fork and clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the `extension` folder from your cloned repository.
5. The extension is now installed! Any changes you make to the code will require you to click the "Refresh" button on the extension card in `chrome://extensions/`.

### Modifying the Engine (`engine.js`)
If you are tweaking the anomaly detection algorithms:
- `engine.js` contains `evaluateUser`, which consumes Codeforces API data and returns a score.
- You can write simple local Node.js test scripts to test your tweaks without needing to use the browser extension. Simply `eval` the engine script and pass in some mock API data!

### Pull Requests
- Fill out the provided Pull Request template.
- Ensure any UI changes look good in Dark Mode.
- Please test your changes on a Codeforces profile page AND the standings page before submitting.
