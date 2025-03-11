import useSWR from "swr";

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    basePrice: number;
    options: Array<{
      name: string;
      value: string;
      price: number;
    }>;
    productData: {
      name: string;
      images: string[];
      discount?: {
        isActive: boolean;
        type: 'fixed' | 'percentage';
        value: number;
        startDate?: Date;
        endDate?: Date;
      };
    };
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  recipient: {
    name: string;
    phone: string;
    email: string;
  };
  paymentMethod: {
    id: string;
    title: string;
    lastFourDigits?: string;
  };
  status: string;
  paymentStatus: string;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    note: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const customFetcher = async (url: string) => {
  console.log('Fetching orders from:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'حدث خطأ أثناء جلب الطلبات');
    }
    const data = await response.json();
    console.log('Fetched orders:', data?.orders?.length);
    return data.orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export function useOrders() {
  const { data, error, isLoading, mutate } = useSWR<Order[]>(
    "/api/dashboard/orders",
    customFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      onError: (err) => {
        console.error('Error in useOrders:', err);
      },
      onSuccess: (data) => {
        console.log('Successfully fetched orders in useOrders:', data?.length);
      }
    }
  );

  return {
    orders: data,
    isLoading,
    error,
    mutate,
  };
}
