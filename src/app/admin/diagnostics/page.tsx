import { redirect } from 'next/navigation';

export default function DiagnosticsRedirectPage() {
  redirect('/admin/master');
}
