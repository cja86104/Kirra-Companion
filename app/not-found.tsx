import Link from 'next/link';
import { Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6">
          <span className="text-8xl font-bold text-primary/20">404</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mb-8 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/chat">
              <MessageCircle className="h-4 w-4" />
              Chat with Companions
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
