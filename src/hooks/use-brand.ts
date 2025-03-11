import useSWR from 'swr';

export function useBrand(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/api/dashboard/brands/${id}` : null,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('فشل جلب بيانات العلامة التجارية');
      }
      const data = await response.json();
      console.log('Raw data from API:', data); // للتحقق من البيانات الخام
      return {
        ...data,
        countries: Array.isArray(data.countries) ? data.countries : [],
      };
    }
  );

  console.log('Processed data:', data); // للتحقق من البيانات بعد المعالجة

  return {
    brand: data,
    isLoading,
    error,
  };
}
