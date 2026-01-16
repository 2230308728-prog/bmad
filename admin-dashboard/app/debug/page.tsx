'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { user, accessToken, isAuthenticated, isLoading } = useAuth();
  const [storageData, setStorageData] = useState<{ access_token: string; auth_user: string } | null>(null);

  useEffect(() => {
    // Access localStorage only in browser
    const accessToken = localStorage.getItem('access_token');
    const authUser = localStorage.getItem('auth_user');
    setStorageData({
      access_token: accessToken ? accessToken.substring(0, 50) + '...' : '',
      auth_user: authUser || '',
    });

    console.log('Debug - Auth State:', { user, accessToken, isAuthenticated, isLoading });
    console.log('Debug - LocalStorage:', {
      access_token: accessToken,
      auth_user: authUser,
    });
  }, [user, accessToken, isAuthenticated, isLoading]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Authentication Debug Page</h1>

      <section style={{ marginBottom: '20px' }}>
        <h2>Auth State</h2>
        <pre>{JSON.stringify({ isLoading, isAuthenticated, user }, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2>Access Token</h2>
        <pre style={{ wordBreak: 'break-all' }}>{accessToken || 'null'}</pre>
      </section>

      <section>
        <h2>Local Storage</h2>
        <pre>{JSON.stringify(storageData || {}, null, 2)}</pre>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h2>Actions</h2>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Clear Storage & Go to Login
        </button>
      </section>
    </div>
  );
}
