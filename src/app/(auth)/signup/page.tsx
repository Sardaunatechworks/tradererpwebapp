import { redirect } from 'next/navigation';

// Signup is now merged into the login page with a tab toggle.
// Redirect anyone who navigates to /signup directly.
export default function SignupPage() {
  redirect('/login?tab=signup');
}
