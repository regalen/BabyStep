/**
 * Format a date as a human-readable distance from now.
 * e.g. "2 hours ago", "45 minutes ago", "just now"
 */
export function formatDistanceToNow(date: Date | null | undefined): string {
  if (!date) return "unknown";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 60_000) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  return `${days}d ago`;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Format a Date to a local time string (HH:MM).
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format a Date to a local datetime-local input value.
 */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Format a YYYY-MM-DD date string as DD/MM/YYYY, locale-independently.
 */
export function formatDob(dob: string): string {
  const [y, m, d] = dob.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Calculate age in months from a date-of-birth string (YYYY-MM-DD).
 */
export function ageInMonths(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 +
         (now.getMonth() - birth.getMonth());
}

/**
 * Format age in months as a human-readable string.
 * e.g. "4 months", "1 year 3 months"
 */
export function formatAge(dob: string): string {
  const months = ageInMonths(dob);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years}y ${rem}mo`;
}
