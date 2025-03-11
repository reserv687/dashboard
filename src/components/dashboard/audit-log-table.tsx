'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

// تحديث واجهة السجل
interface AuditLog {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
    jobTitle: string;
  };
  actionType: string;
  targetModel: string;
  targetId: string;
  changes: Map<string, {
    oldValue: any;
    newValue: any;
    field: string;
    displayValue?: string;
  }>;
  metadata: Map<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [targetModel, setTargetModel] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [status] = useState<string>('');
  const [actionType] = useState<string>('');

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: page.toString(), 
        search,
        ...(targetModel !== 'all' && targetModel && { targetModel }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
        ...(status && { status }),
        ...(actionType && { actionType })
      });
      const res = await fetch(`/api/dashboard/audit-logs?${params}`);
      if (!res.ok) {
        throw new Error('فشل تحميل سجلات العمليات');
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('خطأ في تحميل سجلات العمليات:', error);
      toast.error('حدث خطأ في تحميل سجل العمليات');
    } finally {
      setLoading(false);
    }
  }, [page, search, targetModel, startDate, endDate, status, actionType]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const getActionTypeDisplay = (actionType: string) => {
    const [model, action] = actionType.split('.');
    const modelMap: { [key: string]: string } = {
      product: 'منتج',
      category: 'تصنيف',
      order: 'طلب',
      employee: 'موظف',
      customer: 'عميل',
      brand: 'علامة تجارية',
      hero: 'قسم رئيسي',
      review: 'تقييم',
      shipping: 'شحن',
      settings: 'إعدادات'
    };

    const actionMap: { [key: string]: string } = {
      create: 'إضافة',
      update: 'تعديل',
      delete: 'حذف',
      'status.update': 'تحديث الحالة',
      'payment.update': 'تحديث الدفع',
      'shipping.update': 'تحديث الشحن'
    };

    return `${actionMap[action] || action} ${modelMap[model] || model}`;
  };

  const renderChanges = (changes: AuditLog['changes']) => {
    if (!changes) return null;
    
    return (
      <div className="space-y-2 border rounded-md p-4 bg-muted/30">
        <h4 className="font-medium mb-3">التغييرات:</h4>
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} className="mb-3 border-b pb-2 last:border-0">
            <div className="font-medium text-primary mb-2">{change.field}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">القيمة القديمة:</div>
                <div className="text-sm bg-red-50 text-red-600 p-2 rounded">
                  {change.oldValue}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">القيمة الجديدة:</div>
                <div className="text-sm bg-green-50 text-green-600 p-2 rounded">
                  {change.newValue}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'غير محدد';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'لا يوجد';
      return value.join('، ');
    }
    if (typeof value === 'object') {
      if ('name' in value) return value.name;
      if ('title' in value) return value.title;
      if ('email' in value) return value.email;
      return JSON.stringify(value);
    }
    return value.toString();
  };

  const formatDate = (date: string) => format(new Date(date), 'PPpp', { locale: ar });

  const renderLogCard = (log: AuditLog) => (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{log.employeeId.name}</h3>
          <p className="text-sm text-gray-500">
            {log.employeeId.jobTitle} - {log.employeeId.email}
          </p>
        </div>
        <div className="text-sm text-gray-500 flex flex-col items-end">
          <span>{formatDate(log.timestamp)}</span>
          {log.ipAddress && <span className="text-xs">IP: {log.ipAddress}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
          {log.status === 'success' ? 'ناجح' : 'فشل'}
        </Badge>
        <Badge variant="secondary">
          {getActionTypeDisplay(log.actionType)}
        </Badge>
        <Badge variant="outline">{log.targetModel}</Badge>
      </div>

      {renderChanges(log.changes)}

      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <h4 className="font-medium mb-2">معلومات إضافية:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(log.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}: </span>
                <span>{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.status === 'failure' && log.errorMessage && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
          <span className="font-medium">خطأ: </span>
          {log.errorMessage}
        </div>
      )}
    </div>
  );

  const handleDateChange = (date: Date | undefined, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    loadAuditLogs(); // Trigger reload when date changes
  };

  return (
    <div className="space-y-6 p-4" dir="rtl">
      {/* خانة البحث والفلاتر */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
          <Input 
            placeholder="ابحث عن سجل..."
            className="pl-10 pr-4 py-2 rounded-md border border-gray-200 text-right"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={targetModel} onValueChange={setTargetModel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="نوع السجل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="Product">المنتجات</SelectItem>
            <SelectItem value="Category">التصنيفات</SelectItem>
            <SelectItem value="Order">الطلبات</SelectItem>
            <SelectItem value="Employee">الموظفين</SelectItem>
            <SelectItem value="Customer">العملاء</SelectItem>
            <SelectItem value="Brand">العلامات التجارية</SelectItem>
            <SelectItem value="Hero">القسم الرئيسي</SelectItem>
            <SelectItem value="Review">التقييمات</SelectItem>
            <SelectItem value="Shipping">طرق الشحن</SelectItem>
            <SelectItem value="Settings">الإعدادات</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 flex justify-between items-center" onClick={() => handleDateChange(new Date(), 'start')}>
              <Calendar className="h-5 w-5" />
              <span>{startDate ? format(startDate, 'PP', { locale: ar }) : 'الفترة'}</span>
            </Button>
          </PopoverTrigger>
      
        </Popover>
      </div>

      {/* عرض السجلات */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          {logs.map((log) => renderLogCard(log))}
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              لا توجد سجلات
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
