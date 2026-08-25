import { redirect } from 'next/navigation';

export default function PayablesRedirectPage() {
  redirect('/admin/procurement');
}
