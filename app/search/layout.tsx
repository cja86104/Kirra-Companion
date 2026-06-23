import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Navbar } from '@/components/layout/Navbar';

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile();
  
  if (!profile) {
    redirect('/login?error=no_profile');
  }

  const companions = await getUserCompanions();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar user={profile} companions={companions} />
      <MobileSidebar user={profile} companions={companions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={profile} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
