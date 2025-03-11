'use client';

import { useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getCookie('store_token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
    
    // إعادة التحقق عند تغيير الكوكيز
    const interval = setInterval(checkAuth, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    isAuthenticated,
    isLoading,
  };
}
