# CodeRevise Capture Extension

This Chrome extension captures the active tab and sends it to CodeRevise on `/capture` with the page URL and title. If CodeRevise is already open, the extension reuses that tab. If it is not open, it creates one.

## Local Setup

1. Start CodeRevise:

```bash
npm run dev
```

2. Open Chrome and go to:

```text
chrome://extensions
```

3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder:

```text
codereviser/extension
```

6. Open a problem page on LeetCode, GeeksForGeeks, HackerRank, CodeChef, or Codeforces.
7. Click the CodeRevise extension button.

The extension focuses CodeRevise, saves the problem to the logged-in account, and reuses the existing CodeRevise tab when one is already open.

## Deployed App

If CodeRevise is deployed, update `CODE_REVISE_CAPTURE_URL` and `CODE_REVISE_ORIGIN` in `popup.js`:

```js
const CODE_REVISE_CAPTURE_URL = "https://your-app-url.com/capture";
const CODE_REVISE_ORIGIN = "https://your-app-url.com";
```
