import useSWR from 'swr';
import { IBrand } from '@/models/brand.model';

const fetcher = async (url: string) => {
  console.log('Fetching brands from:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch brands:', errorData.error || response.statusText);
      throw new Error(errorData.error || 'Failed to fetch brands');
    }
    const data = await response.json();
    console.log('Brands data received:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in brands fetcher:', error);
    throw error;
  }
};

export function useBrands() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const { data: brands, error, mutate, isLoading } = useSWR<IBrand[]>(
    `${baseUrl}/api/dashboard/brands`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 0,
      shouldRetryOnError: true,
      errorRetryCount: 3
    }
  );

  console.log('useBrands hook state:', { brands, error, isLoading });

  return {
    brands,
    isLoading,
    error,
    mutate
  };
}
