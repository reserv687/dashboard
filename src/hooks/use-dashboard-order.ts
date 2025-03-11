import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function useOrder(orderNumber: string) {
  const { data, error, isLoading, mutate } = useSWR(
    orderNumber ? `/api/dashboard/orders?orderNumber=${orderNumber}` : null,
    async (url) => {
      try {
        const response = await fetcher(url);
        return response;
      } catch (error: any) {
        if (error.status === 403) {
          toast.error('ليس لديك صلاحية لعرض هذا الطلب');
        }
        throw error;
      }
    }
  );

  return {
    order: data,
    isLoading,
    error,
    mutate
  };
}
