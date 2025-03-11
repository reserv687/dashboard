import { redirect } from 'next/navigation';

export default function Home() {
  // توجيه المستخدمين إلى المتجر الإلكتروني
  redirect('/dashboard');
}
