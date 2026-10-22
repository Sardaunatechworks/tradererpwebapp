import { redirect } from 'next/navigation';

// Register redirects to the unified auth page with the signup tab active
export default function RegisterPage() {
  redirect('/login?tab=signup');
}
