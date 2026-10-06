export const SUPPORTED_PLATFORMS = ["LeetCode", "GeeksForGeeks", "Codeforces", "CodeChef", "HackerRank"];
export const DIFFICULTY_CHOICES = ["Easy", "Medium", "Hard", "Unknown"];

const MAX_TITLE_LENGTH = 200;
const MAX_TOPIC_LENGTH = 60;
const MAX_TOPICS = 20;
const MAX_DESCRIPTION_LENGTH = 1000;
const PREVIEW_DESCRIPTION_LENGTH = 160;

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isWebPage(url) {
  return /^https?:/i.test(url || "");
}

export function normalizeDifficultyChoice(value) {
  const text = cleanText(value).toLowerCase();
  return DIFFICULTY_CHOICES.find((choice) => choice.toLowerCase() === text) || "Unknown";
}

export function normalizeTitleInput(value) {
  const text = cleanText(value);
  return text && text.length <= MAX_TITLE_LENGTH ? text : null;
}

export function normalizeTopicList(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const topics = [];
  for (const value of values) {
    const topic = cleanText(value);
    const key = topic.toLowerCase();
    if (!topic || topic.length > MAX_TOPIC_LENGTH || seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
    if (topics.length === MAX_TOPICS) break;
  }
  return topics;
}

export function parseTopicsInput(text) {
  return normalizeTopicList(typeof text === "string" ? text.split(",") : []);
}

export function normalizeDescription(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text.length > MAX_DESCRIPTION_LENGTH ? text.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd() : text;
}

export function describePreview(description) {
  if (!description) return "";
  return description.length > PREVIEW_DESCRIPTION_LENGTH
    ? `${description.slice(0, PREVIEW_DESCRIPTION_LENGTH).trimEnd()}…`
    : description;
}

export function buildPreview(details) {
  const title = normalizeTitleInput(details.title);
  const difficulty = normalizeDifficultyChoice(details.difficulty);
  const topics = normalizeTopicList(details.topics);
  const description = normalizeDescription(details.description);

  let titleStatus = "unavailable";
  if (title && details.titleSource === "page") titleStatus = "detected";
  else if (title) titleStatus = "fallback";

  let difficultyStatus = "detected";
  if (difficulty === "Unknown") {
    difficultyStatus = details.difficultySupported === false ? "not-on-platform" : "unavailable";
  }

  return {
    platform: details.platform,
    url: details.url,
    title,
    difficulty,
    topics,
    description,
    status: {
      title: titleStatus,
      difficulty: difficultyStatus,
      topics: topics.length ? "detected" : "unavailable",
      description: description ? "detected" : "unavailable"
    }
  };
}

export function classifyDetection(details, tabUrl) {
  if (details?.status === "unsupported") return { kind: "unsupported" };
  if (!details) return { kind: isWebPage(tabUrl) ? "failed" : "unsupported" };
  if (!SUPPORTED_PLATFORMS.includes(details.platform)) return { kind: "failed" };
  if (details.status !== "ok" || !normalizeTitleInput(details.title)) return { kind: "failed" };
  return { kind: "preview", preview: buildPreview(details) };
}

export function buildCaptureParams(preview, tabUrl) {
  const params = [
    ["url", tabUrl],
    ["title", preview.title],
    ["platform", preview.platform],
    ["difficulty", preview.difficulty],
    ["source", "extension"]
  ];
  preview.topics.forEach((topic) => params.push(["topic", topic]));
  if (preview.description) params.push(["description", preview.description]);
  return params;
}
