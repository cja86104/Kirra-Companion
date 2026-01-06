import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

export default async function DashboardLayout({
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
    // Profile doesn't exist - this can happen if user was created directly in Supabase
    // Redirect to a setup page or create profile
    redirect('/login?error=no_profile');
  }

  const companions = await getUserCompanions();

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
