const APP_ORIGIN_PRODUCTION = "https://codereviser.vercel.app";
const APP_ORIGIN_DEVELOPMENT = "http://127.0.0.1:5173";
// Development only: set to true while running `npm run dev`. Keep false for the production build.
const USE_DEVELOPMENT_APP = false;
const APP_ORIGIN = USE_DEVELOPMENT_APP ? APP_ORIGIN_DEVELOPMENT : APP_ORIGIN_PRODUCTION;
const CODE_REVISE_CAPTURE_URL = `${APP_ORIGIN}/capture`;
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const SUPPORTED_SITES = "LeetCode, GeeksforGeeks, Codeforces, CodeChef, HackerRank";

const button = document.getElementById("captureButton");
const statusText = document.getElementById("status");
const resultBox = document.getElementById("result");
const resultHeading = document.getElementById("resultHeading");
const resultName = document.getElementById("resultName");
const resultMeta = document.getElementById("resultMeta");

function setStatus(message) {
  statusText.textContent = message;
}

function showResult({ tone, heading, name = "", meta = "" }) {
  resultBox.className = `result ${tone}`;
  resultHeading.textContent = heading;
  resultName.textContent = name;
  resultName.hidden = !name;
  resultMeta.textContent = meta;
  resultMeta.hidden = !meta;
  resultBox.hidden = false;
}

function clearResult() {
  resultBox.hidden = true;
}

function showFailure() {
  showResult({
    tone: "error",
    heading: "Unable to detect this problem.",
    meta: "Open a supported coding problem and try again."
  });
}

function showUnsupported() {
  showResult({
    tone: "error",
    heading: "This page is not a supported coding problem.",
    meta: `Supported sites: ${SUPPORTED_SITES}.`
  });
}

// Injects extraction.js into the tab and returns its result, or null if the page
// cannot be read (restricted URL, injection error, or extraction threw).
async function readProblemDetails(tab) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["extraction.js"] });
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (tabTitle) =>
        typeof window.__codeReviseExtractMetadata === "function" ? window.__codeReviseExtractMetadata(tabTitle) : null,
      args: [tab.title || ""]
    });
    return injection?.result || null;
  } catch {
    return null;
  }
}

function isWebPage(url) {
  return /^https?:/i.test(url || "");
}

function buildCaptureUrl(tab, details) {
  const captureUrl = new URL(CODE_REVISE_CAPTURE_URL);
  captureUrl.searchParams.set("url", tab.url);
  captureUrl.searchParams.set("title", details.title);
  captureUrl.searchParams.set("platform", details.platform);
  if (VALID_DIFFICULTIES.includes(details.difficulty)) {
    captureUrl.searchParams.set("difficulty", details.difficulty);
  }
  details.topics.forEach((topic) => captureUrl.searchParams.append("topic", topic));
  if (details.description) {
    captureUrl.searchParams.set("description", details.description);
  }
  return captureUrl;
}

async function openInCodeRevise(captureUrl) {
  const tabs = await chrome.tabs.query({});
  const existingCodeReviseTab = tabs.find((candidate) => {
    if (!candidate.url) return false;
    try {
      return new URL(candidate.url).origin === APP_ORIGIN;
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
}

button.addEventListener("click", async () => {
  button.disabled = true;
  clearResult();
  setStatus("Reading current tab...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      setStatus("Could not read the current tab URL.");
      return;
    }

    setStatus("Reading problem details...");
    const details = await readProblemDetails(tab);

    if (details?.status === "unsupported" || (!details && !isWebPage(tab.url))) {
      setStatus("");
      showUnsupported();
      return;
    }

    if (details?.status !== "ok" || !details.title) {
      setStatus("");
      showFailure();
      return;
    }

    const difficulty = VALID_DIFFICULTIES.includes(details.difficulty) ? details.difficulty : "Unknown";
    showResult({
      tone: "success",
      heading: "Problem captured",
      name: details.title,
      meta: `${difficulty} · ${details.platform}`
    });
    setStatus("Sending to CodeRevise...");

    await openInCodeRevise(buildCaptureUrl(tab, { ...details, difficulty }));
    setStatus("Opened in CodeRevise.");
  } finally {
    button.disabled = false;
  }
});
