# CodeRevise Capture Extension

A Chrome extension (Manifest V3) that captures a coding problem page into CodeRevise. Click the button on a supported problem page, review the preview, optionally correct the metadata, and save.

- **Supported sites:** LeetCode, GeeksforGeeks, Codeforces, CodeChef, and HackerRank.
- **Difficulty is never guessed.** If a page does not expose Easy, Medium, or Hard, it is sent as `Unknown`.
- **Permissions:** `tabs`, `windows`, `activeTab`, and `scripting`. There are no host permissions. A page is read only after you click the button on that tab.
- **Status:** a local, unpublished extension. Load it unpacked. It is not on the Chrome Web Store.

Extraction runs in `extraction.js` and is tested in `tests/`. The preview and capture-parameter logic lives in `lib/preview.js`.

## Local setup

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Open a problem page on a supported site and click the CodeRevise extension button.

## Target app

The extension sends problems to the production app by default:

```js
const USE_DEVELOPMENT_APP = false; // popup.js
// production:  https://codereviser.vercel.app/capture
// development: http://127.0.0.1:5173/capture  (when USE_DEVELOPMENT_APP = true)
```

To test against a local app, run `npm run dev`, set `USE_DEVELOPMENT_APP` to `true`, and reload the extension. Set it back to `false` before testing production. No other file needs to change.

If CodeRevise is open in a tab, the extension reuses that tab. Otherwise it opens a new one.
