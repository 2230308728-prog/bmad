'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

/**
 * Header component with user info and actions
 */
export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsUserMenuOpen(false);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left side - Mobile menu button */}
      <div className="flex items-center">
        <button
          onClick={onMobileMenuOpen}
          className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center space-x-4">
        {/* Notifications (placeholder) */}
        <button className="relative text-gray-400 hover:text-gray-500">
          <span className="sr-only">查看通知</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-3 text-sm focus:outline-none"
          >
            {/* User avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
              <span className="text-sm font-medium text-white">
                {user?.nickname?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            {/* User info (hidden on mobile) */}
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.nickname || '管理员'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role === 'ADMIN' ? '管理员' : '家长'}
              </p>
            </div>
            {/* Dropdown arrow */}
            <svg
              className={`hidden h-5 w-5 text-gray-400 transition-transform md:block ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isUserMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.nickname || '管理员'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/dashboard');
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  总览
                </button>

                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
