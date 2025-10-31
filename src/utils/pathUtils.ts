/**
 * Path manipulation utilities for nested object access
 * Extracted from repeated code in formula stores
 */

/**
 * Set a nested property value using dot path notation
 * Example: setByPath(obj, 'user.profile.name', 'John')
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  const last = parts.pop()!;
  let cur: Record<string, unknown> = obj;

  for (const k of parts) {
    if (typeof cur[k] !== "object" || cur[k] === null) {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }

  cur[last] = value;
}

/**
 * Get a nested property value using dot path notation
 * Example: getByPath(obj, 'user.profile.name') returns 'John'
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== "object") {
    return undefined;
  }

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Check if a nested property exists using dot path notation
 */
export function hasPath(obj: unknown, path: string): boolean {
  return getByPath(obj, path) !== undefined;
}

/**
 * Delete a nested property using dot path notation
 */
export function deleteByPath(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".");
  const last = parts.pop()!;
  let cur: Record<string, unknown> = obj;

  // Navigate to the parent object
  for (const k of parts) {
    if (typeof cur[k] !== "object" || cur[k] === null) {
      return false; // Parent path doesn't exist
    }
    cur = cur[k] as Record<string, unknown>;
  }

  // Delete the property
  return delete (cur as Record<string, unknown>)[last];
}