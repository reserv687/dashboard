'use client';

import { useState, useEffect } from 'react';
import { ShippingForm } from '@/components/dashboard/shipping/forms/shipping-form';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { StatusToggle } from '@/components/ui/status-toggle';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ShippingRule {
  type: "weight" | "price" | "distance";
  minValue?: number;
  maxValue?: number;
  additionalCost: number;
}

interface ShippingMethod {
  _id: string;
  name: string;
  description?: string;
  baseCost: number;
  minCost?: number;
  maxCost?: number;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  rules: ShippingRule[];
  isActive: boolean;
}

export default function ShippingPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchShippingMethods = async () => {
    try {
      const response = await fetch('/api/dashboard/shipping', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('فشل في جلب طرق الشحن');
      
      const data = await response.json();
      setShippingMethods(data);
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
      toast.error('حدث خطأ أثناء جلب طرق الشحن', {
        duration: 3000,
        position: 'top-center'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingMethods();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/dashboard/shipping`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: deleteId }),
      });

      if (!response.ok) throw new Error('فشل في حذف طريقة الشحن');

      toast.success('تم حذف طريقة الشحن بنجاح', {
        duration: 3000,
        position: 'top-center'
      });
      fetchShippingMethods();
    } catch (error) {
      console.error('Error deleting shipping method:', error);
      toast.error('حدث خطأ أثناء حذف طريقة الشحن', {
        duration: 3000,
        position: 'top-center'
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getRulesSummary = (rules: ShippingRule[]) => {
    if (!rules.length) return 'لا توجد قواعد';
    
    return rules.map(rule => {
      const type = {
        weight: 'الوزن',
        price: 'السعر',
        distance: 'المسافة'
      }[rule.type];

      let range = '';
      if (rule.minValue && rule.maxValue) {
        range = `${rule.minValue} - ${rule.maxValue}`;
      } else if (rule.minValue) {
        range = `أكثر من ${rule.minValue}`;
      } else if (rule.maxValue) {
        range = `أقل من ${rule.maxValue}`;
      }

      return `${type}${range ? `: ${range}` : ''} (${rule.additionalCost} ريال)`;
    }).join('، ');
  };

  const handleSubmit = async (data: any) => {
    try {
      const method = editingMethod ? 'PUT' : 'POST';
      const payload = editingMethod ? { ...data, id: editingMethod._id } : data;
      
      const response = await fetch('/api/dashboard/shipping', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('فشل في حفظ طريقة الشحن');
      }

      toast.success(editingMethod ? 'تم تحديث طريقة الشحن بنجاح' : 'تم إضافة طريقة الشحن بنجاح', {
        duration: 3000,
        position: 'top-center'
      });
      await fetchShippingMethods();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to save shipping method'
      };
    }
  };

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">طرق الشحن</h1>
          <p className="text-muted-foreground">إدارة طرق الشحن في المتجر</p>
        </div>
        <Button onClick={() => {
          setIsCreating(!isCreating);
          setEditingMethod(null);
        }}>
          {isCreating ? 'إلغاء' : (
            <>
              <Plus className="w-4 h-4 ml-2" />
              إضافة طريقة شحن
            </>
          )}
        </Button>
      </div>

      {(isCreating || editingMethod) && (
        <div className="mb-6">
          <ShippingForm
            initialData={editingMethod}
            onSubmit={async (data) => {
              const result = await handleSubmit(data);
              if (result.success) {
                setIsCreating(false);
                setEditingMethod(null);
              }
              return result;
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">جاري التحميل...</div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {shippingMethods.map((method) => (
              <div
                key={method._id}
                className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-start md:items-center rounded-md shadow-md"
              >
                <div className="flex flex-col flex-1 gap-2">
                  <h3 className="text-lg font-medium">{method.name}</h3>
                  {method.description && (
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  )}
                  <div className="text-sm">
                    <span className="font-medium">التكلفة الأساسية: </span>{method.baseCost} ريال
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">نطاق التكلفة: </span>
                    {method.minCost || method.maxCost ? (
                      <>
                        {method.minCost && `من ${method.minCost}`}
                        {method.minCost && method.maxCost && ' - '}
                        {method.maxCost && `إلى ${method.maxCost}`} ريال
                      </>
                    ) : (
                      'غير محدد'
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">مدة التوصيل: </span>
                    {method.estimatedDeliveryMin} - {method.estimatedDeliveryMax} يوم
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">قواعد الشحن: </span>
                    <span>{getRulesSummary(method.rules)}</span>
                  </div>
                  <div>
                    <StatusToggle
                      checked={method.isActive}
                      onCheckedChange={async (checked) => {
                        try {
                          const response = await fetch('/api/dashboard/shipping', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                              id: method._id, 
                              isActive: checked 
                            }),
                          });

                          if (!response.ok) throw new Error('فشل تحديث حالة طريقة الشحن');
                          await fetchShippingMethods();
                        } catch (error) {
                          console.error('Error updating shipping method status:', error);
                          toast.error('حدث خطأ أثناء تحديث حالة طريقة الشحن', {
                            duration: 3000,
                            position: 'top-center'
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingMethod(method);
                      setIsCreating(false);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(method._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {shippingMethods.length === 0 && (
              <div className="text-center">لا توجد طرق شحن مضافة</div>
            )}
          </div>

          <ConfirmDialog
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={handleDelete}
            title="هل أنت متأكد من حذف طريقة الشحن؟"
            description="لا يمكن التراجع عن هذا الإجراء بعد تنفيذه."
            confirmText="حذف"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
