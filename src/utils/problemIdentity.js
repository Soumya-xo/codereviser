import { formatDate } from "./date.js";

export function normalizeProblemUrl(url = "") {
  try {
    const parsedUrl = new URL(url.trim());
    parsedUrl.hash = "";
    parsedUrl.search = "";
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
    return parsedUrl.toString().toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
}

export function mergeProblemByUrl(existingProblem, incomingProblem) {
  return {
    ...existingProblem,
    name: existingProblem.name || incomingProblem.name,
    platform: existingProblem.platform || incomingProblem.platform,
    difficulty: existingProblem.difficulty || incomingProblem.difficulty,
    topic: existingProblem.topic || incomingProblem.topic,
    description: existingProblem.description || incomingProblem.description,
    url: existingProblem.url || incomingProblem.url,
    updatedAt: formatDate()
  };
}

export function upsertProblemByUrl(problems, incomingProblem) {
  const normalizedIncomingUrl = normalizeProblemUrl(incomingProblem.url);
  let didFindExisting = false;

  const nextProblems = problems.reduce((acc, problem) => {
    const isSameProblem = normalizedIncomingUrl && normalizeProblemUrl(problem.url) === normalizedIncomingUrl;
    if (!isSameProblem) return [...acc, problem];

    if (!didFindExisting) {
      didFindExisting = true;
      return [...acc, mergeProblemByUrl(problem, incomingProblem)];
    }

    return acc;
  }, []);

  return {
    problems: didFindExisting ? nextProblems : [incomingProblem, ...nextProblems],
    didCreate: !didFindExisting
  };
}

export function dedupeProblemsByUrl(problems) {
  return problems.reduce((acc, problem) => {
    const normalizedUrl = normalizeProblemUrl(problem.url);
    if (!normalizedUrl) return [...acc, problem];

    const existingIndex = acc.findIndex((item) => normalizeProblemUrl(item.url) === normalizedUrl);
    if (existingIndex === -1) return [...acc, problem];

    const next = [...acc];
    next[existingIndex] = mergeProblemByUrl(next[existingIndex], problem);
    return next;
  }, []);
}
