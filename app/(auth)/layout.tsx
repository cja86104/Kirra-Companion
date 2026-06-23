import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background blur orbs are hidden below md: blur-[100px]+ filters
          force mobile GPUs to re-rasterize huge surfaces every frame,
          which made initial paint and the Sign In tap feel unresponsive.
          Tablet/desktop GPUs handle it fine. */}
      <div className="pointer-events-none fixed inset-0 hidden md:block">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-kirra-500/20 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-glow-purple/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-glow-pink/10 blur-[150px]" />
      </div>

      {/* Header: solid bg on mobile, blurred translucent on md+. */}
      <header className="relative z-10 flex h-16 items-center justify-center border-b border-border/50 bg-background md:bg-background/80 md:backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kirra-gradient">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold">Kirra</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
