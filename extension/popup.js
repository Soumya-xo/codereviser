const CODE_REVISE_CAPTURE_URL = "http://127.0.0.1:5173/capture";
const CODE_REVISE_ORIGIN = "http://127.0.0.1:5173";
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];

const button = document.getElementById("captureButton");
const statusText = document.getElementById("status");

function setStatus(message) {
  statusText.textContent = message;
}

// Best-effort: reads real page metadata (currently just difficulty) from the tab the
// user is capturing. Never throws and never blocks the capture flow - any failure
// (unsupported page, restricted URL, injection error) simply means no extra metadata
// is available, and capture proceeds exactly as it did before this existed.
async function tryExtractPageMetadata(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["extraction.js"] });
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (typeof window.__codeReviseExtractMetadata === "function" ? window.__codeReviseExtractMetadata() : null)
    });
    return injectionResults?.[0]?.result || null;
  } catch {
    return null;
  }
}

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Reading current tab...");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    setStatus("Could not read the current tab URL.");
    button.disabled = false;
    return;
  }

  setStatus("Reading problem details...");
  const extracted = await tryExtractPageMetadata(tab.id);

  const captureUrl = new URL(CODE_REVISE_CAPTURE_URL);
  captureUrl.searchParams.set("url", tab.url);
  captureUrl.searchParams.set("title", tab.title || "");
  if (extracted?.difficulty && VALID_DIFFICULTIES.includes(extracted.difficulty)) {
    captureUrl.searchParams.set("difficulty", extracted.difficulty);
  }

  setStatus("Sending to CodeRevise...");

  const tabs = await chrome.tabs.query({});
  const existingCodeReviseTab = tabs.find((candidate) => {
    if (!candidate.url) return false;
    try {
      return new URL(candidate.url).origin === CODE_REVISE_ORIGIN;
    } catch {
      return false;
    }
  });

  if (existingCodeReviseTab?.id) {
    await chrome.tabs.update(existingCodeReviseTab.id, {
      active: true,
      url: captureUrl.toString()
    });

    if (existingCodeReviseTab.windowId) {
      await chrome.windows.update(existingCodeReviseTab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: captureUrl.toString() });
  }

  setStatus("Captured in CodeRevise.");
  window.close();
});
