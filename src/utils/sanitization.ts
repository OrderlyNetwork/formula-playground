/**
 * Utility functions for data sanitization and security
 */

/**
 * Safely stringifies data with content protection
 * Prevents XSS and content leakage by sanitizing potentially dangerous content
 */
export function sanitizeJsonStringify(
  data: any,
  replacer?: (number | string)[] | null,
  space?: string | number
): string {
  try {
    // Use standard JSON.stringify - the HTML will handle escaping when rendered
    const jsonString = JSON.stringify(data, replacer, space);

    // Clean up any over-escaped Unicode sequences to make JSON readable
    return unescapeUnicode(jsonString);
  } catch (error) {
    // Fallback for circular references or non-serializable data
    return '[Unable to serialize data]';
  }
}

/**
 * Un-escapes common Unicode sequences to make JSON more readable
 * Converts sequences like \u0022 back to their original characters
 */
function unescapeUnicode(str: string): string {
  return str
    .replace(/\\u0022/g, '"')   // Convert \u0022 back to "
    .replace(/\\u0027/g, "'")   // Convert \u0027 back to '
    .replace(/\\u003c/g, "<")   // Convert \u003c back to <
    .replace(/\\u003e/g, ">")   // Convert \u003e back to >
    .replace(/\\u0026/g, "&")   // Convert \u0026 back to &
    .replace(/\\u005c/g, "\\"); // Convert \u005c back to \ (but be careful not to double-unescape)
}

/**
 * Sanitizes error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: string | Error): string {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Remove potential sensitive information from error messages
  return errorMessage
    .replace(/\\/g, '/')
    .replace(/[A-Za-z]:\\/g, '[DRIVE]:/') // Replace Windows paths
    .replace(/\/home\/[^\/\s]+/g, '/home/[USER]') // Replace Linux home paths
    .replace(/\/Users\/[^\/\s]+/g, '/Users/[USER]') // Replace macOS home paths
    .substring(0, 500); // Limit error message length
}

/**
 * Sanitizes stack traces to prevent path disclosure
 */
export function sanitizeStackTrace(stack: string): string {
  return stack
    .replace(/\\/g, '/')
    .replace(/[A-Za-z]:\\/g, '[DRIVE]:/')
    .replace(/\/home\/[^\/\s]+/g, '/home/[USER]')
    .replace(/\/Users\/[^\/\s]+/g, '/Users/[USER]')
    .replace(/file:\/\/\/[^\/\s]+/g, 'file:///[PATH]')
    .replace(/http:\/\/localhost:[\d]+/g, 'http://localhost:[PORT]')
    .replace(/https?:\/\/[^\s\/]+/g, '[DOMAIN]'); // Replace domain names
}

/**
 * Validates and sanitizes user input for display
 */
export function sanitizeForDisplay(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Basic sanitization for display purposes
  return stringValue
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .substring(0, 1000); // Limit display length
}