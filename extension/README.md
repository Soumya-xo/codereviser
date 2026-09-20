# CodeRevise Capture Extension

This Chrome extension captures the active tab and sends it to CodeRevise on `/capture` with the page URL and title. If CodeRevise is already open, the extension reuses that tab. If it is not open, it creates one.

On LeetCode problem pages, it also reads the real difficulty (Easy/Medium/Hard) directly from the page before sending it to CodeRevise, instead of relying only on a small hardcoded list of known problems. This requires the `activeTab` and `scripting` permissions, which only ever apply to the tab you click "Capture" on - the extension has no standing access to any page and cannot read pages in the background. If the difficulty can't be reliably read off the page, it is sent as `Unknown` rather than guessed. Other platforms (GeeksForGeeks, Codeforces, CodeChef, HackerRank) are unaffected by this and continue to work as before.

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
