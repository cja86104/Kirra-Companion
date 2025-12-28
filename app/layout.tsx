import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Kirra Companion - Your AI Companion That Actually Lives',
    template: '%s | Kirra Companion',
  },
  description:
    'Experience the next generation of AI companionship. Kirra companions have their own lives, memories, and personalities that evolve with you.',
  keywords: [
    'AI companion',
    'virtual friend',
    'AI chat',
    'artificial intelligence',
    'companion app',
    'emotional AI',
    'personal AI',
  ],
  authors: [{ name: 'Kirra Companion' }],
  creator: 'Kirra Companion',
  publisher: 'Kirra Companion',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Kirra Companion',
    title: 'Kirra Companion - Your AI Companion That Actually Lives',
    description:
      'Experience the next generation of AI companionship. Kirra companions have their own lives, memories, and personalities that evolve with you.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Kirra Companion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kirra Companion - Your AI Companion That Actually Lives',
    description:
      'Experience the next generation of AI companionship. Kirra companions have their own lives, memories, and personalities that evolve with you.',
    images: ['/og-image.svg'],
    creator: '@kirracompanion',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kirra Companion',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1222' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'group',
              title: 'font-medium',
              description: 'text-muted-foreground',
            },
          }}
        />
      </body>
    </html>
  );
}
