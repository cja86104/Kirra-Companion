import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

export default async function LifeFeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const [profile, companions] = await Promise.all([
    getUserProfile(),
    getUserCompanions(),
  ]);

  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={profile} companions={companions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={profile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
