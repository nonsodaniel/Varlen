'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, loadToken } = useAuthStore();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isAuthPage) {
      router.replace('/login');
    } else if (isAuthenticated && isAuthPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isAuthPage, router]);

  if (isLoading) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-gray-50`}>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </body>
      </html>
    );
  }

  if (isAuthPage) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-gray-50`}>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <Sidebar />
        <main className="lg:ml-60 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0">
          <div className="p-3 sm:p-6 lg:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
