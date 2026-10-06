const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const EXPLICIT_DIFFICULTIES = [...VALID_DIFFICULTIES, "Unknown"];
const SUPPORTED_PLATFORMS = ["LeetCode", "GeeksForGeeks", "Codeforces", "CodeChef", "HackerRank"];
const GENERIC_NAMES = ["Coding Problem", "CodeChef Problem", "Codeforces Problem", "HackerRank Challenge"];
const MAX_TITLE_LENGTH = 200;
const MAX_TOPIC_LENGTH = 60;
const MAX_TOPICS = 20;
const MAX_DESCRIPTION_LENGTH = 1000;

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanTopics(values) {
  const seen = new Set();
  const topics = [];
  values.forEach((value) => {
    const topic = cleanText(value);
    const key = topic.toLowerCase();
    if (!topic || topic.length > MAX_TOPIC_LENGTH || seen.has(key) || topics.length >= MAX_TOPICS) return;
    seen.add(key);
    topics.push(topic);
  });
  return topics;
}

// Params sent by the extension are authoritative: difficulty Unknown stays Unknown and
// topics are not replaced by catalog guesses. Legacy params keep the URL-catalog fallback.
export function resolveCaptureDetails({ title = "", platform = "", difficulty = "", topics = [], description = "", fromExtension = false }, metadata, today = new Date().toISOString().slice(0, 10)) {
  if (!metadata) return null;

  const pageTitle = cleanText(title).slice(0, MAX_TITLE_LENGTH);
  const fallbackName = GENERIC_NAMES.includes(metadata.name) && title ? title : metadata.name;
  const cleanedTopics = cleanTopics(topics);
  const cleanedDescription = cleanText(description).slice(0, MAX_DESCRIPTION_LENGTH);

  if (fromExtension) {
    return {
      ...metadata,
      name: pageTitle || fallbackName,
      platform: SUPPORTED_PLATFORMS.includes(platform) ? platform : metadata.platform,
      difficulty: EXPLICIT_DIFFICULTIES.includes(difficulty) ? difficulty : "Unknown",
      topic: cleanedTopics.length ? cleanedTopics.join(", ") : "Other",
      description: cleanedDescription,
      dateSolved: today,
      notes: "",
      favorite: false
    };
  }

  return {
    ...metadata,
    name: pageTitle || fallbackName,
    platform: SUPPORTED_PLATFORMS.includes(platform) ? platform : metadata.platform,
    difficulty: VALID_DIFFICULTIES.includes(difficulty) ? difficulty : metadata.difficulty,
    topic: cleanedTopics.length ? cleanedTopics.join(", ") : metadata.topic,
    description: cleanedDescription || metadata.description,
    dateSolved: today,
    notes: "",
    favorite: false
  };
}

export function decideCaptureOutcome({ ready, alreadyExists }) {
  if (!ready) return null;
  return alreadyExists ? "duplicate" : "captured";
}

export function problemFocusPath(problemId) {
  return problemId ? `/problems?focus=${encodeURIComponent(problemId)}` : "/problems";
}

export function canAddToFuturePractice({ problem, pending }) {
  return Boolean(problem) && !problem.practiceLater && !pending;
}
