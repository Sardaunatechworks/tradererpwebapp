/**
 * List of registered email addresses belonging to the TraderERP Platform Owner.
 * Sardauna Tech Lab Ltd.
 * Any account matching these emails is recognized as the platform owner (super_admin).
 */
export const PLATFORM_OWNER_EMAILS = [
  'sardaunatechworks@gmail.com',
  'sardaunatech@gmail.com',
  'sardaunatechlabs@gmail.com',
];

/**
 * Checks if an authenticated user is the Platform Owner (Super Admin).
 * Returns false for any regular business owner, manager, or staff.
 */
export function isPlatformOwner(user?: { app_metadata?: Record<string, unknown> | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const role = (user.app_metadata?.role as string | undefined)?.toLowerCase();
  if (role === 'super_admin') return true;
  if (user.email && PLATFORM_OWNER_EMAILS.includes(user.email.toLowerCase().trim())) return true;
  return false;
}

// Backward-compatible alias
export const checkIsSuperAdmin = isPlatformOwner;

/**
 * Throws an error if the user is not the Platform Owner.
 * Used to safeguard server actions from unauthorized tenant calls.
 */
export function assertPlatformOwner(user?: { app_metadata?: Record<string, unknown> | null; email?: string | null } | null): void {
  if (!isPlatformOwner(user)) {
    throw new Error('Forbidden: Platform Owner (Super Admin) access required.');
  }
}
