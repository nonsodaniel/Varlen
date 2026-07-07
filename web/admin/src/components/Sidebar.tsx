'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/users', label: 'Users', icon: '◎' },
  { href: '/circles', label: 'Circles', icon: '◍' },
  { href: '/analytics', label: 'Analytics', icon: '◈' },
  { href: '/moderation', label: 'Moderation', icon: '◆' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-gray-950 text-white flex flex-col">
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
  );
}
