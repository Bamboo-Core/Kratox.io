'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Header from './_components/Header';
import Hero from './_components/Hero';
import CTA from './_components/CTA';
import InfoCards from './_components/InfoCards';
import WhyImportant from './_components/WhyImportant';
import Docs from './_components/Docs';
import Contact from './_components/Contact';
import Footer from './_components/Footer';
import FAQs from './_components/FAQs';

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(useAuthStore.persist.hasHydrated());
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dns-blocking');
    }
  }, [isHydrated, isAuthenticated, router]);

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <Header />
      <Hero />
      <InfoCards />
      <WhyImportant />
      <CTA />
      <Docs />
      <Contact />
      <FAQs />
      <Footer />
    </main>
  );
}
