import {
  DIFFICULTY_CHOICES,
  SUPPORTED_PLATFORMS,
  buildCaptureParams,
  classifyDetection,
  describePreview,
  normalizeDifficultyChoice,
  normalizeTitleInput,
  parseTopicsInput
} from "./lib/preview.js";

const APP_ORIGIN_PRODUCTION = "https://codereviser.vercel.app";
const APP_ORIGIN_DEVELOPMENT = "http://127.0.0.1:5173";
// Development only: set to true while running `npm run dev`. Keep false for the production build.
const USE_DEVELOPMENT_APP = false;
const APP_ORIGIN = USE_DEVELOPMENT_APP ? APP_ORIGIN_DEVELOPMENT : APP_ORIGIN_PRODUCTION;
const CODE_REVISE_CAPTURE_URL = `${APP_ORIGIN}/capture`;

const statusText = document.getElementById("status");
const preview = document.getElementById("preview");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const previewTopics = document.getElementById("previewTopics");
const previewDescription = document.getElementById("previewDescription");
const checklist = document.getElementById("checklist");
const editForm = document.getElementById("editForm");
const editTitle = document.getElementById("editTitle");
const editDifficulty = document.getElementById("editDifficulty");
const editTopics = document.getElementById("editTopics");
const previewActions = document.getElementById("previewActions");
const editButton = document.getElementById("editButton");
const saveButton = document.getElementById("saveButton");
const result = document.getElementById("result");
const resultHeading = document.getElementById("resultHeading");
const resultName = document.getElementById("resultName");
const resultMeta = document.getElementById("resultMeta");
const retryButton = document.getElementById("retryButton");

let activeTab = null;
let detected = null;
let current = null;

for (const choice of DIFFICULTY_CHOICES) {
  editDifficulty.append(new Option(choice, choice));
}

function setStatus(message) {
  statusText.textContent = message;
}

function hideAll() {
  preview.hidden = true;
  result.hidden = true;
  retryButton.hidden = true;
}

function showFailure(kind) {
  const unsupported = kind === "unsupported";
  result.className = "result error";
  resultHeading.textContent = unsupported
    ? "This page is not a supported coding problem."
    : "Unable to detect this problem.";
  resultName.textContent = "";
  resultMeta.textContent = unsupported
    ? `Supported sites: ${SUPPORTED_PLATFORMS.join(", ")}.`
    : "Open a supported coding problem and try again.";
  result.hidden = false;
  retryButton.hidden = false;
  setStatus("");
}

function checklistRow(label, state, value) {
  const row = document.createElement("li");
  row.dataset.state = state;
  const mark = document.createElement("span");
  mark.className = "mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = state === "unavailable" || state === "not-on-platform" ? "—" : "✓";
  const labelEl = document.createElement("span");
  labelEl.className = "label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "value";
  valueEl.textContent = value;
  row.append(mark, labelEl, valueEl);
  return row;
}

function renderChecklist(p) {
  const titleValue = p.status.title === "fallback" ? "from tab title" : p.status.title === "edited" ? "edited" : "";
  const difficultyValue = {
    detected: p.difficulty,
    edited: `${p.difficulty} (edited)`,
    unavailable: "Unknown",
    "not-on-platform": "Not on this site"
  }[p.status.difficulty];
  const topicsValue = p.topics.length ? `${p.topics.length} found` : "None found";
  const descriptionValue = p.description ? "Found" : "None found";

  checklist.replaceChildren(
    checklistRow("Title", p.status.title === "unavailable" ? "unavailable" : "detected", titleValue),
    checklistRow("Difficulty", p.status.difficulty, difficultyValue),
    checklistRow("Topics", p.status.topics, topicsValue),
    checklistRow("Description", p.status.description, descriptionValue)
  );
}

function renderPreview(p) {
  previewTitle.textContent = p.title;
  previewMeta.textContent = `${p.difficulty} · ${p.platform}`;
  previewTopics.textContent = p.topics.length ? p.topics.join(" · ") : "No topics";
  renderChecklist(p);
  previewDescription.textContent = describePreview(p.description);
  previewDescription.hidden = !p.description;
  saveButton.disabled = !p.title;
  preview.hidden = false;
  result.hidden = true;
}

function openEditForm() {
  editTitle.value = current.title || "";
  editDifficulty.value = current.difficulty;
  editTopics.value = current.topics.join(", ");
  editForm.hidden = false;
  previewActions.hidden = true;
  editTitle.focus();
}

function closeEditForm() {
  editForm.hidden = true;
  previewActions.hidden = false;
  editButton.focus();
}

function applyEdit(event) {
  event.preventDefault();
  const title = normalizeTitleInput(editTitle.value);
  if (!title) {
    editTitle.focus();
    return;
  }

  const difficulty = normalizeDifficultyChoice(editDifficulty.value);
  const topics = parseTopicsInput(editTopics.value);
  const status = { ...current.status };
  if (title !== detected.title) status.title = "edited";
  if (difficulty !== detected.difficulty) status.difficulty = "edited";
  if (topics.join("|") !== detected.topics.join("|")) status.topics = topics.length ? "edited" : "unavailable";

  current = { ...current, title, difficulty, topics, status };
  renderPreview(current);
  closeEditForm();
}

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

async function detect() {
  hideAll();
  setStatus("Detecting problem...");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    setStatus("");
    showFailure("failed");
    return;
  }

  activeTab = tab;
  const details = await readProblemDetails(tab);
  const outcome = classifyDetection(details, tab.url);
  if (outcome.kind !== "preview") {
    showFailure(outcome.kind);
    return;
  }

  detected = outcome.preview;
  current = outcome.preview;
  setStatus("Review the details, then save.");
  renderPreview(current);
  saveButton.focus();
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
    await chrome.tabs.update(existingCodeReviseTab.id, { active: true, url: captureUrl.toString() });
    if (existingCodeReviseTab.windowId) {
      await chrome.windows.update(existingCodeReviseTab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: captureUrl.toString() });
  }
}

async function save() {
  if (!current?.title) return;
  saveButton.disabled = true;
  editButton.disabled = true;
  setStatus("Saving...");

  const captureUrl = new URL(CODE_REVISE_CAPTURE_URL);
  for (const [key, value] of buildCaptureParams(current, activeTab.url)) {
    captureUrl.searchParams.append(key, value);
  }

  try {
    await openInCodeRevise(captureUrl);
    setStatus("Sent to CodeRevise. Check that tab to confirm it was saved.");
  } catch {
    setStatus("Could not open CodeRevise. Try again.");
    saveButton.disabled = false;
    editButton.disabled = false;
  }
}

editButton.addEventListener("click", openEditForm);
saveButton.addEventListener("click", save);
editForm.addEventListener("submit", applyEdit);
document.getElementById("cancelEdit").addEventListener("click", closeEditForm);
editForm.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeEditForm();
});
retryButton.addEventListener("click", detect);

detect();
