const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 3_600;
const DAY_SECONDS = 86_400;

// implements REQ-kibi-html-health-report
export function parseTimestamp(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : undefined;
}

// implements REQ-kibi-html-health-report
export function formatAbsoluteUtc(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

export function formatRelativeAge(fromMs: number, nowMs: number): string {
  if (!Number.isFinite(fromMs) || !Number.isFinite(nowMs)) {
    return "timestamp unavailable";
  }
  const deltaSeconds = Math.floor((nowMs - fromMs) / 1000);
  if (deltaSeconds < 0) return "in the future";
  if (deltaSeconds < MINUTE_SECONDS) return "just now";

  const minutes = Math.floor(deltaSeconds / MINUTE_SECONDS);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(deltaSeconds / HOUR_SECONDS);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes === 0
      ? `${hours}h ago`
      : `${hours}h ${remainingMinutes}m ago`;
  }

  const days = Math.floor(deltaSeconds / DAY_SECONDS);
  const remainingHours = hours % 24;
  if (days < 7 && remainingHours > 0) return `${days}d ${remainingHours}h ago`;
  return `${days}d ago`;
}
