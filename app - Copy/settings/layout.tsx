import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette,
  Download,
  Settings as SettingsIcon,
} from 'lucide-react';

import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils/cn';

const settingsNav = [
  { href: '/settings', icon: User, label: 'Account' },
  { href: '/settings/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings/notifications', icon: Bell, label: 'Notifications' },
  { href: '/settings/privacy', icon: Shield, label: 'Privacy' },
  { href: '/settings/appearance', icon: Palette, label: 'Appearance' },
  { href: '/settings/data', icon: Download, label: 'Your Data' },
];

export default async function SettingsLayout({
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
          <div className="mx-auto max-w-5xl p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold flex items-center gap-3">
                <SettingsIcon className="h-8 w-8 text-primary" />
                Settings
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage your account and preferences
              </p>
            </div>

            <div className="flex flex-col gap-8 lg:flex-row">
              {/* Settings Navigation */}
              <nav className="w-full shrink-0 lg:w-48">
                <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
                  {settingsNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Settings Content */}
              <div className="flex-1 min-w-0">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
