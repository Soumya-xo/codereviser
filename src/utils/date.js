export const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value, days) {
  const date = value instanceof Date ? new Date(value) : toDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function isSameDate(a, b) {
  return formatDate(a) === formatDate(b);
}

export function isPastOrToday(value) {
  if (!value) return false;
  return toDate(value).getTime() <= toDate(formatDate()).getTime();
}

export function daysBetween(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

export function humanDate(value) {
  if (!value) return "Complete";
  return toDate(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function monthMatrix(activeDate) {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
