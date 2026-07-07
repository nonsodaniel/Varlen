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
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

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

  if (isLoginPage) {
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
        <main className="ml-60 min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
