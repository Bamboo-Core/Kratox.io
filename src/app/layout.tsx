
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import AuthProvider from '@/components/providers/auth-provider'; // Import AuthProvider


const interSans = Inter({ variable: '--font-inter-sans', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'NOC AI',
  description: 'Network Monitoring and Automation Platform for ISPs',
  icons: {
    icon: '/logo.png',
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
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
