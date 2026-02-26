'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth');
        const data = await res.json();
        
        if (data.needsSetup) {
          router.push('/admin/login?setup=true');
        } else {
          const session = localStorage.getItem('adminSession');
          if (session) {
            router.push('/admin/dashboard');
          } else {
            router.push('/admin/login');
          }
        }
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">正在加载...</div>
      </div>
    );
  }

  return null;
}
