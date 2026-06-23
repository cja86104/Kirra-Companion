import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
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
    default: 'Kirra — AI Companion That Actually Remembers You',
    template: '%s | Kirra',
  },
  description:
    'Meet Kirra — an AI companion with their own life, memories, and evolving personality. Not just responses. Genuine connection.',
  keywords: [
    'AI companion',
    'virtual friend',
    'AI chat',
    'artificial intelligence',
    'companion app',
    'emotional AI',
    'personal AI',
  ],
  authors: [{ name: 'Kirra' }],
  creator: 'Kirra',
  publisher: 'Kirra',
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
    siteName: 'Kirra',
    title: 'Kirra — AI Companion That Actually Remembers You',
    description:
      'Meet Kirra — an AI companion with their own life, memories, and evolving personality. Not just responses. Genuine connection.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kirra',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kirra — AI Companion That Actually Remembers You',
    description:
      'Meet Kirra — an AI companion with their own life, memories, and evolving personality. Not just responses. Genuine connection.',
    images: ['/og-image.png'],
    creator: '@kirra',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kirra',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1816' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Removed maximumScale + userScalable: those block pinch-zoom (a11y
  // regression). iOS input-focus zoom is handled by 16px font-size in
  // app/globals.css instead.
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
      className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('kirra-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (theme === 'system' && prefersDark) || (!theme && prefersDark);
                  document.documentElement.classList.add(isDark ? 'dark' : 'light');
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-center"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'group rounded-xl border-border shadow-lg',
              title: 'font-medium text-sm',
              description: 'text-muted-foreground text-sm',
            },
          }}
        />
      </body>
    </html>
  );
}
