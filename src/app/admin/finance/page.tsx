import { redirect } from 'next/navigation';

export default function FinanceRedirectPage() {
  redirect('/admin/sales-orders');
}
