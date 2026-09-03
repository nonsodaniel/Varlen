'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', mobileLabel: 'Home', icon: '◉' },
  { href: '/waitlist', label: 'Waitlist', mobileLabel: 'Waitlist', icon: '✉' },
  { href: '/users', label: 'Users', mobileLabel: 'Users', icon: '◎' },
  { href: '/circles', label: 'Circles', mobileLabel: 'Circles', icon: '◍' },
  { href: '/analytics', label: 'Analytics', mobileLabel: 'Stats', icon: '◈' },
  { href: '/finance', label: 'Finance', mobileLabel: 'Finance', icon: '◇' },
  { href: '/moderation', label: 'Moderation', mobileLabel: 'Logs', icon: '◆' },
  { href: '/features', label: 'Feature Flags', mobileLabel: 'Flags', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gray-950 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold tracking-tight">Sivena Admin</h1>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-white"
        >
          Sign Out
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-950 border-t border-gray-800 flex justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="truncate max-w-[56px]">{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 bg-gray-950 text-white flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight">Sivena Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Management Console</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span className="text-base">⏻</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
