const CODE_REVISE_CAPTURE_URL = "http://127.0.0.1:5173/capture";
const CODE_REVISE_ORIGIN = "http://127.0.0.1:5173";

const button = document.getElementById("captureButton");
const statusText = document.getElementById("status");

function setStatus(message) {
  statusText.textContent = message;
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

  const captureUrl = new URL(CODE_REVISE_CAPTURE_URL);
  captureUrl.searchParams.set("url", tab.url);
  captureUrl.searchParams.set("title", tab.title || "");

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
