const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'You do not have permission to do this. Ask your company owner to check your access.',
  unauthorized: 'You do not have permission to do this. Ask your company owner to check your access.',
  unauthenticated: 'Your session has expired. Please sign in again.',
  'user-token-expired': 'Your session has expired. Please sign in again.',
  'requires-recent-login': 'Please sign in again before making this change.',
  unavailable: 'Unable to connect. Check your connection and try again.',
  'network-request-failed': 'Unable to connect. Check your connection and try again.',
  'deadline-exceeded': 'The request took too long. Refresh to check whether it completed before trying again.',
  'retry-limit-exceeded': 'The request took too long. Refresh to check whether it completed before trying again.',
  aborted: 'This record changed while you were working. Refresh and try again.',
  'not-found': 'This record is no longer available. Refresh and try again.',
  'object-not-found': 'This file is no longer available. Refresh and try again.',
  'already-exists': 'This record already exists. Refresh to see the latest changes.',
  'resource-exhausted': 'The service limit has been reached. Please try again later.',
  'too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'invalid-credential': 'The email or password is incorrect. Please try again.',
  'wrong-password': 'The email or password is incorrect. Please try again.',
  'user-not-found': 'The email or password is incorrect. Please try again.',
  'email-already-in-use': 'An account with this email already exists. Please sign in instead.',
  'invalid-email': 'Enter a valid email address.',
  'weak-password': 'Choose a stronger password with at least six characters.',
  'user-disabled': 'This account is disabled. Please contact support.',
  'popup-closed-by-user': 'Sign-in was cancelled. Please try again when you are ready.',
  'cancelled-popup-request': 'Sign-in was cancelled. Please try again when you are ready.',
  'popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'account-exists-with-different-credential': 'Use the sign-in method you previously used for this email.',
};

/** Keep SDK details in logs, while preserving useful application validation messages. */
export function getUserErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  const details = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown; name?: unknown } : null;
  const message = typeof error === 'string' ? error : typeof details?.message === 'string' ? details.message : '';
  const code = typeof details?.code === 'string' ? details.code : message.match(/\b(?:auth|firestore|functions|storage)\/([\w-]+)/)?.[0];
  const shortCode = code?.split('/').at(-1);
  if (shortCode && ERROR_MESSAGES[shortCode]) return ERROR_MESSAGES[shortCode];
  if (/missing or insufficient permissions|insufficient permissions/i.test(message)) return ERROR_MESSAGES['permission-denied'];
  if (/failed to fetch|network request failed|client is offline/i.test(message)) return ERROR_MESSAGES.unavailable;
  const technical = /firebase|firestore|https?:\/\/|\b(?:auth|functions|storage)\/[\w-]+|\b(?:TypeError|ReferenceError|SyntaxError)\b|\n\s+at\s|requires an index/i;
  const safeFallback = typeof fallback === 'string' && fallback.trim() && !technical.test(fallback) ? fallback : DEFAULT_MESSAGE;
  if (details?.name === 'FirebaseError' || code || technical.test(message)) return safeFallback;
  return message.trim() || safeFallback;
}
