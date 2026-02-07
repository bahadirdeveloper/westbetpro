'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return <div className="western-loading-bar" />;
}
