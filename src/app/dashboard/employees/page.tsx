'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Search, MoreHorizontal, Edit, Trash, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { useConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { GENDER, PERMISSIONS, PERMISSION_GROUPS } from '@/types/employee';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/dashboard/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogTable } from "@/components/dashboard/audit-log-table";
import Image from 'next/image';

//
// تعريف الواجهات
//
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  gender?: string;
  permissions: string[];
  isActive?: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmployeesResponse {
  employees: Employee[];
  totalPages: number;
  currentPage: number;
  total: number;
  firstAdmin: { name: string; jobTitle: string; };
}

interface FormEmployee {
  name: string;
  email: string;
  password?: string;
  phone: string;
  jobTitle: string;
  gender: string;
  permissions: string[];
  isActive: boolean;
  avatar: File | null;
  currentAvatar?: string;
}

interface EmployeeFormProps {
  employee: FormEmployee;
  setEmployee: (employee: FormEmployee) => void;
  isEdit: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  submitting: boolean;
}

//
// مكون نموذج الموظف (لإنشاء وتعديل الموظف)
//
const EmployeeForm = ({ employee, setEmployee, isEdit, onSubmit, onCancel, submitting }: EmployeeFormProps) => {
  const renderPermissions = () => (
    <>
      <h3 className="mb-2 font-medium">الصلاحيات</h3>
      <div className="flex items-center space-x-4 space-x-reverse mb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="radio"
            id={`${isEdit ? 'edit-' : ''}permission-type-all`}
            name={`${isEdit ? 'edit-' : ''}permission-type`}
            checked={employee.permissions.includes('ALL')}
            onChange={() => setEmployee({ ...employee, permissions: ['ALL'] })}
          />
          <label htmlFor={`${isEdit ? 'edit-' : ''}permission-type-all`} className="text-sm font-medium leading-none mr-2">
            كل الصلاحيات
          </label>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="radio"
            id={`${isEdit ? 'edit-' : ''}permission-type-custom`}
            name={`${isEdit ? 'edit-' : ''}permission-type`}
            checked={!employee.permissions.includes('ALL')}
            onChange={() => setEmployee({ ...employee, permissions: [] })}
          />
          <label htmlFor={`${isEdit ? 'edit-' : ''}permission-type-custom`} className="text-sm font-medium leading-none mr-2">
            صلاحيات مخصصة
          </label>
        </div>
      </div>
      {!employee.permissions.includes('ALL') && (
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(PERMISSION_GROUPS).map(([groupKey, permissionKeys]) => {
            const viewPermKey = permissionKeys.find(key => key.endsWith('_VIEW'));
            const viewPermValue = viewPermKey ? PERMISSIONS[viewPermKey as keyof typeof PERMISSIONS] : '';
            const hasViewPerm = !!(viewPermValue && employee.permissions.includes(viewPermValue));
            return (
              <div key={groupKey} className="border rounded-md p-3">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <Checkbox
                    id={`${isEdit ? 'edit-' : ''}permission-${viewPermValue}`}
                    checked={hasViewPerm}
                    onCheckedChange={(checked) => {
                      let newPermissions;
                      if (checked) newPermissions = [...employee.permissions, viewPermValue];
                      else newPermissions = employee.permissions.filter(p =>
                        !permissionKeys.some(key => p === PERMISSIONS[key as keyof typeof PERMISSIONS])
                      );
                      setEmployee({ ...employee, permissions: newPermissions });
                    }}
                  />
                  <label htmlFor={`${isEdit ? 'edit-' : ''}permission-${viewPermValue}`} className="text-sm font-medium leading-none mr-2">
                    {groupKey === 'PRODUCTS' ? 'المنتجات' :
                     groupKey === 'BRANDS' ? 'العلامات التجارية' :
                     groupKey === 'CATEGORIES' ? 'الفئات' :
                     groupKey === 'ORDERS' ? 'الطلبات' :
                     groupKey === 'CUSTOMERS' ? 'العملاء' :
                     groupKey === 'REVIEWS' ? 'التقييمات' :
                     groupKey === 'HERO' ? 'الشرائح الرئيسية' :
                     groupKey === 'SHIPPING' ? 'الشحن' :
                     groupKey === 'SETTINGS' ? 'الإعدادات' :
                     groupKey === 'EMPLOYEES' ? 'الموظفين' :
                     groupKey === 'STATISTICS' ? 'الإحصائيات' : groupKey}
                  </label>
                </div>
                {hasViewPerm && (
                  <div className="grid grid-cols-3 gap-2 mr-6 mt-2">
                    {permissionKeys.filter(key => !key.endsWith('_VIEW')).map(permKey => {
                      const permValue = PERMISSIONS[permKey as keyof typeof PERMISSIONS];
                      return (
                        <div key={permKey} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`${isEdit ? 'edit-' : ''}permission-${permValue}`}
                            checked={employee.permissions.includes(permValue)}
                            onCheckedChange={(checked) => {
                              const newPermissions = checked
                                ? [...employee.permissions, permValue]
                                : employee.permissions.filter(p => p !== permValue);
                              setEmployee({ ...employee, permissions: newPermissions });
                            }}
                          />
                          <label htmlFor={`${isEdit ? 'edit-' : ''}permission-${permValue}`} className="text-sm font-medium leading-none mr-2">
                            {permKey.includes('_CREATE') ? 'إضافة' :
                             permKey.includes('_EDIT') ? 'تعديل' :
                             permKey.includes('_DELETE') ? 'حذف' :
                             permKey.includes('_REPLY') ? 'رد' : permKey}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md">
      <div className="flex items-center gap-4 flex-1">
        <ImageUpload
          image={employee.avatar ? URL.createObjectURL(employee.avatar) : employee.currentAvatar || null}
          onImageChange={(file: File | null) => setEmployee({ ...employee, avatar: file })}
          onImageRemove={async () => Promise.resolve(setEmployee({ ...employee, avatar: null, ...(employee.currentAvatar !== undefined ? { currentAvatar: '' } : {}) }))}
          width="w-24"
          height="h-24"
        />
        <div className="flex flex-col gap-3 w-full">
          <Input value={employee.name} placeholder="اسم الموظف" onChange={(e) => setEmployee({ ...employee, name: e.target.value })} className="w-full" />
          <Input type="email" value={employee.email} placeholder="البريد الإلكتروني" onChange={(e) => setEmployee({ ...employee, email: e.target.value })} className="w-full" />
          <Input
            type="password"
            placeholder={isEdit ? "كلمة المرور (اتركها فارغة إذا لم ترغب في تغييرها)" : "كلمة المرور"}
            onChange={(e) => setEmployee({ ...employee, password: e.target.value })}
            className="w-full"
          />
          <Input type="tel" value={employee.phone} placeholder="رقم الهاتف" onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} className="w-full" />
          <Input value={employee.jobTitle} placeholder="المسمى الوظيفي" onChange={(e) => setEmployee({ ...employee, jobTitle: e.target.value })} className="w-full" />
          <Select value={employee.gender} onValueChange={(value) => setEmployee({ ...employee, gender: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GENDER.MALE}>ذكر</SelectItem>
              <SelectItem value={GENDER.FEMALE}>أنثى</SelectItem>
            </SelectContent>
          </Select>
          {renderPermissions()}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox id={`${isEdit ? 'edit-' : ''}isActive`} checked={employee.isActive} onCheckedChange={(checked) => setEmployee({ ...employee, isActive: !!checked })} />
            <label htmlFor={`${isEdit ? 'edit-' : ''}isActive`} className="text-sm font-medium leading-none mr-2">
              نشط
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'حفظ التغييرات' : 'إضافة موظف'}
            </Button>
            {isEdit && onCancel && <Button variant="outline" onClick={onCancel}>إلغاء</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

//
// مكون عرض بيانات الموظف مع خيارات التعديل والحذف
//
interface EmployeeItemProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  formatDate: (date: string) => string;
  hasAdminPermission: () => boolean;
}

const EmployeeItem = ({ employee, onEdit, onDelete, formatDate, hasAdminPermission }: EmployeeItemProps) => (
  <div className="bg-card/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-center rounded-md shadow-md">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
        {employee.avatar ? (
          <Image src={employee.avatar} alt={employee.name} width={100} height={100} />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold">{employee.name}</span>
        <span className="text-sm text-muted-foreground">{employee.email}</span>
        <span className="text-sm text-muted-foreground">{employee.phone}</span>
        <span className="text-xs text-muted-foreground">تاريخ الإنشاء: {formatDate(employee.createdAt)}</span>
        <span className="text-xs text-muted-foreground">آخر تحديث: {formatDate(employee.updatedAt)}</span>
      </div>
    </div>
    <div className="mt-4 md:mt-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">فتح القائمة</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(employee)}>
            <Edit className="ml-2 h-4 w-4" />
            تعديل
          </DropdownMenuItem>
          {hasAdminPermission() && (
            <DropdownMenuItem onClick={() => onDelete(employee)} className="text-red-600">
              <Trash className="ml-2 h-4 w-4" />
              حذف
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

//
// المكون الرئيسي لإدارة الموظفين
//
export default function EmployeesPage() {
  const [data] = useState<EmployeesResponse | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState<FormEmployee>({
    name: '',
    email: '',
    password: '',
    phone: '',
    jobTitle: '',
    gender: '',
    permissions: [],
    isActive: true,
    avatar: null
  });
  const [editingEmployee, setEditingEmployee] = useState<FormEmployee>({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    gender: '',
    permissions: [],
    isActive: true,
    avatar: null,
    currentAvatar: ''
  });

  const { data: session } = useSession();
  const confirm = useConfirmDialog();

  const hasAdminPermission = () => {
    const user = session?.user as { permissions?: string[] } | undefined;
    return !!user?.permissions?.includes('ALL');
  };

  const loadEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', search });
      const res = await fetch(`/api/dashboard/employees?${params}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'حدث خطأ في تحميل بيانات الموظفين');
      }
      const d = await res.json();
      setEmployees(d.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('حدث خطأ في تحميل بيانات الموظفين');
    }
  }, [search]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleDelete = async (employee: Employee) => {
    if (!(await confirm({
      title: 'تأكيد حذف الموظف',
      description: `هل أنت متأكد من حذف الموظف "${employee.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      variant: 'destructive',
      icon: 'trash'
    }))) return;

    try {
      const res = await fetch(`/api/dashboard/employees?id=${employee.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'فشل حذف الموظف');
      toast.success('تم حذف الموظف بنجاح');
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error instanceof Error ? error.message : 'فشل حذف الموظف');
    }
  };

  const handleEdit = (employee: Employee) => {
    setIsCreating(false);
    setEditingEmployee({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      jobTitle: employee.jobTitle || '',
      gender: employee.gender || '',
      permissions: Array.isArray(employee.permissions) ? employee.permissions : [],
      isActive: employee.isActive ?? true,
      avatar: null,
      currentAvatar: employee.avatar || ''
    });
    setIsEditing(true);
    setSelectedEmployee(employee);
  };

  const onEditSubmit = async () => {
    if (!editingEmployee.name || !editingEmployee.email || !editingEmployee.phone ||
        !editingEmployee.jobTitle || !editingEmployee.gender || editingEmployee.permissions.length === 0) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(editingEmployee).forEach(([key, value]) => {
        if (key === 'password') {
          if (value && (value as string).length > 0) formData.append(key, value as string);
        } else if (key === 'permissions') {
          (value as string[]).forEach(p => formData.append('permissions[]', p));
        } else if (key === 'avatar') {
          if (value) formData.append('avatar', value as File);
        } else if (key !== 'currentAvatar') {
          formData.append(key, String(value));
        }
      });
      const res = await fetch(`/api/dashboard/employees?id=${selectedEmployee?.id}`, {
        method: 'PUT',
        body: formData
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل تعديل الموظف');
      }
      toast.success('تم تعديل الموظف بنجاح');
      setIsEditing(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error instanceof Error ? error.message : 'فشل تعديل الموظف');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateSubmit = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password ||
        !newEmployee.phone || !newEmployee.jobTitle || !newEmployee.gender || newEmployee.permissions.length === 0) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(newEmployee).forEach(([key, value]) => {
        if (key === 'permissions') {
          (value as string[]).forEach(p => formData.append('permissions[]', p));
        } else if (key === 'avatar') {
          if (value) formData.append('avatar', value as File);
        } else {
          formData.append(key, String(value));
        }
      });
      const res = await fetch('/api/dashboard/employees', { method: 'POST', body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل إضافة الموظف');
      }
      toast.success('تم إضافة الموظف بنجاح');
      setIsCreating(false);
      setNewEmployee({ name: '', email: '', password: '', phone: '', jobTitle: '', gender: '', permissions: [], isActive: true, avatar: null });
      loadEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error instanceof Error ? error.message : 'فشل إضافة الموظف');
    } finally {
      setSubmitting(false);
    }
  };

  const onEditCancel = () => {
    setIsEditing(false);
    setSelectedEmployee(null);
  };

  const formatDate = (date: string) => format(new Date(date), 'PPpp', { locale: ar });

  return (
    <div className="p-6 space-y-6">
      {data?.firstAdmin && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{data.firstAdmin.jobTitle}</h2>
          <p className="text-gray-600">{data.firstAdmin.name}</p>
        </div>
      )}
      <Tabs defaultValue="employees" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="employees">الموظفين</TabsTrigger>
            <TabsTrigger value="audit-log">سجل العمليات</TabsTrigger>
          </TabsList>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة موظف
            </Button>
          )}
        </div>
        <Separator />
        <TabsContent value="employees" className="space-y-4">
          {isEditing && selectedEmployee && (
            <EmployeeForm
              employee={editingEmployee}
              setEmployee={setEditingEmployee}
              isEdit={true}
              onSubmit={onEditSubmit}
              onCancel={onEditCancel}
              submitting={submitting}
            />
          )}
          {isCreating && (
            <EmployeeForm
              employee={newEmployee}
              setEmployee={setNewEmployee}
              isEdit={false}
              onSubmit={onCreateSubmit}
              submitting={submitting}
            />
          )}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="البحث عن موظف..." className="pl-8 pr-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {employees.length > 0 ? employees.map(emp => (
              <EmployeeItem
                key={emp.id}
                employee={emp}
                onEdit={handleEdit}
                onDelete={handleDelete}
                formatDate={formatDate}
                hasAdminPermission={hasAdminPermission}
              />
            )) : <div className="text-center">لا يوجد موظفين</div>}
          </div>
        </TabsContent>
        <TabsContent value="audit-log">
          <AuditLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
