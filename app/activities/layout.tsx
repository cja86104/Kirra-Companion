import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Navbar } from '@/components/layout/Navbar';

export default async function ActivitiesLayout({
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
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar user={profile} companions={companions} />
      <MobileSidebar user={profile} companions={companions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={profile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
