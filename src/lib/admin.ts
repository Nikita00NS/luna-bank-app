/**
 * Luna Bank — Admin Access Control
 * 
 * ONLY the owner can access admin panel.
 * This is hardcoded and cannot be changed from the app.
 */

// ===== OWNER TELEGRAM ID =====
// Only this user can see and access the admin panel
export const OWNER_TELEGRAM_ID = 7320418026;

/**
 * Check if a user is the owner
 */
export function isOwner(telegramId: number): boolean {
  return telegramId === OWNER_TELEGRAM_ID;
}

/**
 * Check if user has admin access
 * Currently only the owner has access.
 * In the future, you can add more admin IDs here.
 */
export function hasAdminAccess(telegramId: number): boolean {
  return telegramId === OWNER_TELEGRAM_ID;
}
