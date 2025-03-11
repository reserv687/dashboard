'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  addressesCount: number;
  createdAt: string;
  avatar?: {
    url: string;
    alt?: string;
  };
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCustomers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const CustomerAvatar = ({ customer }: { customer: any }) => {
  if (customer.avatar?.url && customer.avatar.url !== 'undefined') {
    return (
      <div className="relative w-8 h-8">
        <Image
          src={customer.avatar.url}
          alt={customer.avatar.alt || customer.name}
          fill
          className="rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/default-avatar.png';
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-medium text-muted-foreground">
        {customer.name?.charAt(0).toUpperCase() || '?'}
      </span>
    </div>
  );
};

export default function CustomersPage() {
  const router = useRouter(); // إضافة router
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifiedStatus, setVerifiedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const handleViewCustomer = (customerId: string) => {
    if (!customerId) {
      console.error('معرف العميل غير صحيح');
      return;
    }
    router.push(`/dashboard/customers/${customerId}`);
  };

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        verifiedStatus,
        sortBy,
        sortOrder,
      });

      const response = await fetch('/api/dashboard/customers?' + params.toString());
      const data = await response.json();

      if (response.ok) {
        setCustomers(data.customers);
        setPagination(data.pagination);
      } else {
        console.error('خطأ في جلب العملاء:', data.error);
      }
    } catch (error) {
      console.error('خطأ في جلب العملاء:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, verifiedStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleVerifiedStatusChange = (value: string) => {
    setVerifiedStatus(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة العملاء</h1>
        </div>
        <div className="space-y-4">
          {/* أدوات التصفية والبحث */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="sm:w-96"
            />
          </div>
          <div className="text-center py-8 text-muted-foreground">
            لا يوجد عملاء متاحين
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة العملاء</h1>
      </div>

      <div className="space-y-4">
        {/* أدوات التصفية والبحث */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="sm:w-96"
          />
          <Select value={verifiedStatus} onValueChange={handleVerifiedStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="حالة التحقق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="verified">تم التحقق</SelectItem>
              <SelectItem value="unverified">لم يتم التحقق</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="الترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">تاريخ التسجيل</SelectItem>
              <SelectItem value="name">الاسم</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={toggleSortOrder} className="w-[180px]">
            {sortOrder === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
          </Button>
        </div>

        {/* قائمة العملاء بتصميم بطاقة */}
        <div className="flex flex-col gap-4">
          {customers.map((customer) => (
            <div
              key={customer._id}
              className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* صورة العميل كرمز افتراضي */}
                <CustomerAvatar customer={customer} />
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold">{customer.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{customer.email}</span>
                    {customer.isEmailVerified && (
                      <Badge className="bg-green-500">✓</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{customer.phone}</span>
                    {customer.isPhoneVerified && (
                      <Badge className="bg-green-500">✓</Badge>
                    )}
                  </div>
                  <div>
                    {customer.isEmailVerified || customer.isPhoneVerified ? (
                      <Badge className="bg-green-500">تم التحقق</Badge>
                    ) : (
                      <Badge variant="secondary">لم يتم التحقق</Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    العناوين: {customer.addressesCount}
                  </div>
                  <div className="text-sm">
                    تاريخ التسجيل: {new Date(customer.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Button variant="ghost" onClick={() => handleViewCustomer(customer._id)} className="text-primary">
                  عرض التفاصيل
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* الترقيم */}
        {pagination && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              إجمالي العملاء: {pagination.totalCustomers}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev - 1)}
                disabled={!pagination.hasPrevPage}
              >
                السابق
              </Button>
              <div className="flex items-center gap-2">
                <span>صفحة</span>
                <span>{pagination.currentPage}</span>
                <span>من</span>
                <span>{pagination.totalPages}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pagination.hasNextPage}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
