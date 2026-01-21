import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import AuthProvider from '@/components/providers/auth-provider'; // Import AuthProvider
import I18nProvider from '@/components/providers/i18n-provider';
import favicon from '@/app/favicon.ico';

const interSans = Inter({ variable: '--font-inter-sans', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'NOC AI',
  description: 'Network Monitoring and Automation Platform for ISPs',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interSans.variable} font-sans antialiased flex min-h-screen flex-col`}>
        <QueryProvider>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
