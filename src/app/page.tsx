import { redirect } from 'next/navigation';

export default function HomePage() {
  // Always redirect root visit to /login
  redirect('/login');
}
