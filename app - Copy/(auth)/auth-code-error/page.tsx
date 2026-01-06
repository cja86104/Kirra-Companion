import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md" variant="elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            Something went wrong during the authentication process.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>This could happen for several reasons:</p>
          <ul className="space-y-2 text-left">
            <li>• The authentication link has expired</li>
            <li>• The link was already used</li>
            <li>• There was a problem with the OAuth provider</li>
            <li>• You denied access to your account</li>
          </ul>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full" variant="gradient">
            <Link href="/login">Try Again</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
