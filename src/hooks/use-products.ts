import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('فشل في جلب البيانات');
  }
  return response.json();
};

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    products: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export async function updateProduct(productId: string, data: any) {
  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'فشل تحديث المنتج');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'فشل تحديث المنتج');
  }
}

export async function deleteProduct(productId: string) {
  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'فشل حذف المنتج');
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || 'فشل حذف المنتج');
  }
}
