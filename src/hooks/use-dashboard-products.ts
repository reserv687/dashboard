import useSWR from 'swr';

const fetcher = async (url: string) => {
  console.log('Fetching URL:', url);
  const response = await fetch(url);
  console.log('Response status:', response.status);
  if (!response.ok) {
    const error = await response.json();
    console.error('Error response:', error);
    throw new Error(error.message || 'فشل في جلب البيانات');
  }
  const data = await response.json();
  console.log('Fetched data:', data);
  return data;
};

export function useDashboardProducts(page = 1, limit = 10) {
  console.log('useDashboardProducts called with page:', page, 'and limit:', limit);
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/products?page=${page}&limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );
  console.log('Hook state:', { data, error, isLoading });
  return {
    products: data?.products || [],
    pagination: data?.pagination || {
      total: 0,
      page: 1,
      limit: 10,
      pages: 0
    },
    isLoading,
    isError: error,
    mutate,
  };
}

export function useDashboardProduct(productId?: string) {
  console.log('useDashboardProduct called with productId:', productId);
  const { data, error, isLoading, mutate } = useSWR(
    productId ? `/api/dashboard/products/${productId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 0,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      revalidateOnMount: true,
      suspense: false,
      onSuccess: (data) => {
        console.log('Product data fetched successfully:', data);
      },
      onError: (error) => {
        console.error('Error fetching product data:', error);
      }
    }
  );
  console.log('Hook state:', { data, error, isLoading });
  return {
    product: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export async function updateProduct(productId: string, data: any) {
  console.log('Sending product update:', data);
  try {
    const response = await fetch(`/api/dashboard/products`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _id: productId,
        ...data,
        technicalSpecs: data.technicalSpecs ? {
          ...data.technicalSpecs,
          dimensions: data.technicalSpecs.dimensions || undefined,
          weight: data.technicalSpecs.weight || undefined,
          specifications: data.technicalSpecs.specifications || {}
        } : undefined,
        discount: data.discount ? {
          ...data.discount,
          isActive: Boolean(data.discount.isActive),
          value: Number(data.discount.value || 0)
        } : undefined,
        // تأكد من معالجة المحتوى المخصص بشكل صحيح
        customContent: Array.isArray(data.customContent) ? data.customContent : undefined,
        customFields: Array.isArray(data.customFields) ? 
          data.customFields.filter((f: any) => f.label && f.value) : 
          undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  console.log('deleteProduct called with productId:', productId);
  try {
    const response = await fetch(`/api/dashboard/products`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _id: productId }),
    });
    console.log('Response status:', response.status);
    if (!response.ok) {
      const error = await response.json();
      console.error('Error response:', error);
      throw new Error(error.message || 'فشل حذف المنتج');
    }
    if (response.status === 204) {
      return true;
    }
    const result = await response.json();
    console.log('Deleted product:', result);
    return result;
  } catch (error: any) {
    console.error('خطأ في حذف المنتج:', error);
    throw new Error(error.message || 'فشل حذف المنتج');
  }
}
