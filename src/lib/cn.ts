type ClassValue = string | false | null | undefined;

/** Joins conditional class names — no dependency needed for this app's needs. */
export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ');
}
