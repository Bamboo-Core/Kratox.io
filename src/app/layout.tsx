
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google'; // Changed font imports
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import { AppLogo } from '@/components/layout/app-logo';
import { UserNav } from '@/components/layout/user-nav';
import { MswInitializer } from '@/components/dev/MswInitializer'; // MSW Initializer

const interSans = Inter({ variable: '--font-inter-sans', subsets: ['latin'], display: 'swap' }); // Changed to Inter
const robotoMono = Roboto_Mono({ variable: '--font-roboto-mono', subsets: ['latin'], display: 'swap' }); // Changed to Roboto_Mono

export const metadata: Metadata = {
  title: 'NetGuard AI',
  description: 'Plataforma de Monitoramento e Automação para ISPs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${interSans.variable} ${robotoMono.variable} antialiased flex min-h-screen flex-col`}> {/* Updated font variables */}
        {process.env.NODE_ENV === 'development' && <MswInitializer />}
        <SidebarProvider defaultOpen={true}>
          <div className="flex flex-1">
            <Sidebar collapsible="icon" className="border-r border-sidebar-border hidden md:flex">
              <SidebarHeader className="p-4 flex items-center gap-2 justify-center group-data-[collapsible=icon]:justify-start">
                <AppLogo />
                <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                  NetGuard AI
                </h1>
              </SidebarHeader>
              <SidebarContent className="flex-1">
                <SidebarNav />
              </SidebarContent>
              <SidebarFooter className="p-2">
                {/* Future: User profile / logout */}
              </SidebarFooter>
            </Sidebar>
            <SidebarInset className="flex-1 flex flex-col overflow-y-auto">
              {children}
            </SidebarInset>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
