import { redirect } from 'next/navigation';

export default function Home() {
  // Ana sayfa açılır açılmaz Dashboard'a yönlendir
  redirect('/dashboard');
}
