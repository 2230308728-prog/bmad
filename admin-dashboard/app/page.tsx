'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Home page - redirects to login
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-600">跳转中...</p>
      </div>
    </div>
  );
}
