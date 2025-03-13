'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const orderStatusMap = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500' },
  confirmed: { label: 'تم التأكيد', color: 'bg-blue-500' },
  processing: { label: 'قيد المعالجة', color: 'bg-purple-500' },
  shipping: { label: 'قيد الشحن', color: 'bg-orange-500' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-500' },
  cancelled: { label: 'ملغي', color: 'bg-red-500' },
};

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function useOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/orders');
      
      if (response.status === 403) {
        setPermissionDenied(true);
        throw new Error('ليس لديك صلاحية لعرض الطلبات');
      }

      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return { orders, isLoading, error, permissionDenied, mutate: fetchOrders };
}

function UpdateStatusDialog({ order, onUpdate, hasEditPermission }: { 
  order: any, 
  onUpdate: () => void,
  hasEditPermission: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const allowedStatuses = ALLOWED_STATUS_TRANSITIONS[order.status] || [];

  const handleUpdate = async () => {
    if (!newStatus || isUpdating || !hasEditPermission) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/dashboard/orders?orderNumber=${order.orderNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote
        }),
      });

      if (response.status === 403) {
        toast.error('ليس لديك صلاحية لتحديث حالة الطلب');
        return;
      }

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة');
      }

      toast.success('تم تحديث حالة الطلب بنجاح');
      onUpdate();
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الحالة');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          تحديث الحالة
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تحديث حالة الطلب #{order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label>الحالة الجديدة</label>
            <Select
              value={newStatus}
              onValueChange={setNewStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة الجديدة" />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {orderStatusMap[status as keyof typeof orderStatusMap]?.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label>ملاحظات (اختياري)</label>
            <Textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="أضف ملاحظات حول تغيير الحالة"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!newStatus || isUpdating}
          >
            {isUpdating ? 'جاري التحديث...' : 'تحديث الحالة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const { orders, isLoading, error, permissionDenied, mutate } = useOrders();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredOrders = useCallback(() => {
    if (!orders) return [];
    if (!selectedStatus) return orders;
    return orders.filter((order) => order.status === selectedStatus);
  }, [orders, selectedStatus]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-4">
          <p className="text-destructive mb-2">حدث خطأ أثناء تحميل الطلبات</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="mx-auto"
          >
            إعادة المحاولة
          </Button>
        </div>
      );
    }

    if (permissionDenied) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <p className="text-red-500">ليس لديك صلاحية لعرض الطلبات</p>
        </div>
      );
    }

    const displayOrders = filteredOrders();

    if (!displayOrders.length) {
      return (
        <div className="text-center p-4 text-muted-foreground">
          لا توجد طلبات {selectedStatus ? `${orderStatusMap[selectedStatus as keyof typeof orderStatusMap].label}` : ''} حالياً
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={selectedStatus === null ? "default" : "outline"}
            onClick={() => setSelectedStatus(null)}
          >
            الكل
          </Button>
          {Object.entries(orderStatusMap).map(([status, { label }]) => (
            <Button
              key={status}
              variant={selectedStatus === status ? "default" : "outline"}
              onClick={() => setSelectedStatus(status)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>المجموع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayOrders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/orders/${order.orderNumber}`}
                      className="font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.recipient.name}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>{order.total} ريال</TableCell>
                  <TableCell>
                    <Badge
                      className={`${orderStatusMap[order.status as keyof typeof orderStatusMap]?.color || 'bg-gray-500'} text-white`}
                    >
                      {orderStatusMap[order.status as keyof typeof orderStatusMap]?.label || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.payment.type === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة ائتمان'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ALLOWED_STATUS_TRANSITIONS[order.status]?.length > 0 && (
                          <UpdateStatusDialog 
                            order={order} 
                            onUpdate={mutate}
                            hasEditPermission={!permissionDenied}
                          />
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/orders/${order.orderNumber}`}>
                            عرض التفاصيل
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return renderContent();
}