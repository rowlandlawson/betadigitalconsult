import type { Metadata } from 'next';
import '@/globals.css';
import { ToasterProvider } from '@/components/ui/toaster-provider';

export const metadata: Metadata = {
  title: ' - Print Management System',
  description: 'Comprehensive print press management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Manifest - REQUIRED for app installation */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#AABD77" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Beta Digital" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-gray-50 font-sans">{children}</div>
        <ToasterProvider />
      </body>
    </html>
  );
}
