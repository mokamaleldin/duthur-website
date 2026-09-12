import { redirect } from 'next/navigation';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/admin`);
  }

  redirect('/en');
}
