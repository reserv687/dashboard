import useSWR from 'swr';

export function useCategories(page: number = 1, view: 'table' | 'tree' = 'table') {
  const { data, error, mutate } = useSWR(
    `/api/dashboard/categories?page=${page}&view=${view}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('فشل في جلب الفئات');
      return res.json();
    },
    {
      revalidateOnFocus: false, // منع إعادة التحقق عند التركيز
      dedupingInterval: 5000, // تجنب التكرار لمدة 5 ثواني
    }
  );

  return {
    categories: data?.categories || [],
    pagination: view === 'table' ? data?.pagination : { total: data?.total },
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
