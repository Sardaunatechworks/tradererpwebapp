/**
 * List of registered email addresses belonging to the Platform Owner.
 * Any account matching these emails is automatically recognized as super_admin.
 */
export const PLATFORM_OWNER_EMAILS = [
  'sardaunatechworks@gmail.com',
  'sardaunatech@gmail.com',
  'sardaunatechlabs@gmail.com',
  'bgarbadutse07@gmail.com',
  'muhammadauwalabubakar571@gmail.com',
  'muhdauwalabubakar60@gmail.com',
  'sardaunama8@gmail.com',
  'sardaunamaa2008@gmail.com',
  'sardaunatest@gmail.com'
];

/**
 * Checks if a user is the Super Admin / Platform Owner.
 */
export function checkIsSuperAdmin(user?: { app_metadata?: Record<string, unknown> | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const role = (user.app_metadata?.role as string | undefined)?.toLowerCase();
  if (role === 'super_admin') return true;
  if (user.email && PLATFORM_OWNER_EMAILS.includes(user.email.toLowerCase().trim())) return true;
  return false;
}
