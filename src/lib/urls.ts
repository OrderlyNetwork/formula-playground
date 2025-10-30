/**
 * Parse newline/whitespace-separated URLs into a unique, trimmed list.
 * Returns an empty array for falsy inputs.
 */
export function parseUrlList(input: string | null | undefined): string[] {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .split(/\r?\n|\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}
