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
