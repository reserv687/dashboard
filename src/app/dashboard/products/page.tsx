'use client';
import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductForm } from './product-form';
import { DateRangePicker } from '@/components/ui/date-range-picker';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { QuickEditInput } from '@/components/dashboard/quick-edit-input';
import { QuickEditSelect } from '@/components/dashboard/quick-edit-select';
import { useDashboardProducts, updateProduct, deleteProduct } from '@/hooks/use-dashboard-products';
import { useCategories } from '@/hooks/use-categories';
import { useBrands } from '@/hooks/use-brands';
import { countries } from '@/lib/constants/countries';
import {
  Pencil,
  Plus,
  Trash,
  Loader2,
  MoreHorizontal,
  Package
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Loading } from '@/components/ui/loading';
import { formatCurrency } from '@/lib/utils/currency';
import { StatusToggle } from '@/components/ui/status-toggle';
import { Badge } from '@/components/ui/badge';


const normalizeValue = (v: string) => v.toLowerCase();

export default function ProductsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    'basic-info': { price: 0, customFields: [] } as { name?: string; description?: string; price?: number; stock?: number; category?: string; brand?: string; countryOfOrigin?: string; customFields?: any[] },
    'options': { attributes: [], variants: [] } as { attributes?: any[]; variants?: any[] },
    'technical-specs': { technicalSpecs: {}, dimensions: {}, weight: {} },
    'images': {},
    'discounts': {},
    'custom-content': { customContent: [] }
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { products, pagination, isLoading: isLoadingProducts, mutate } = useDashboardProducts(currentPage);
  const { categories } = useCategories();
  const { brands, isLoading: isLoadingBrands } = useBrands();

  const availableCountries = useMemo(() => {
    if (filterBrand && brands) {
      const selected = brands.find((b: any) => String(b._id) === filterBrand);
      if (selected?.countries?.length) {
        const norm = selected.countries.map(normalizeValue);
        return countries.filter((c: any) => norm.includes(normalizeValue(c.value)));
      }
      return [];
    }
    return countries;
  }, [filterBrand, brands]);

  useEffect(() => {
    if (filterCountry && !availableCountries.some((c: any) => normalizeValue(c.value) === normalizeValue(filterCountry))) {
      setFilterCountry('');
    }
  }, [filterCountry, availableCountries]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => {
      const s = searchTerm.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(s);
      const slugMatch = p.slug.toLowerCase().includes(s);
      const catMatch = p.category && p.category.name.toLowerCase().includes(s);
      let brandName = '';
      if (p.brand) {
        if (typeof p.brand === 'object' && p.brand.name) brandName = p.brand.name;
        else { 
          const fb = brands?.find((b: any) => String(b._id) === String(p.brand)); 
          brandName = fb?.name || ''; 
        }
      }
      const brandMatch = brandName.toLowerCase().includes(s);
      let countryLabel = '';
      if (p.countryOfOrigin) {
        const fc = countries.find((c: any) => c.value.toLowerCase() === p.countryOfOrigin.toLowerCase());
        countryLabel = fc ? fc.label : p.countryOfOrigin;
      }
      const countryMatch = countryLabel.toLowerCase().includes(s);
      const skuMatch = p.sku?.toLowerCase().includes(s);
      const serialMatch = p.serialNumber?.toLowerCase().includes(s);
      const matchesSearch = nameMatch || slugMatch || catMatch || brandMatch || countryMatch || skuMatch || serialMatch;
      const matchesCat = filterCategory ? p.category?._id === filterCategory : true;
      const prodBrandId = p.brand && typeof p.brand === 'object' ? p.brand._id : p.brand;
      const matchesBrand = filterBrand ? String(prodBrandId) === filterBrand : true;
      const matchesCountry = filterCountry ? p.countryOfOrigin?.toLowerCase() === filterCountry.toLowerCase() : true;
      return matchesSearch && matchesCat && matchesBrand && matchesCountry;
    });
  }, [products, searchTerm, filterCategory, filterBrand, filterCountry, brands]);

  const handleEditProduct = (product: any) => {
    setNewProduct({
      'basic-info': {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category?._id || product.category,
        brand: product.brand,
        countryOfOrigin: product.countryOfOrigin
      },
      'options': {},
      'technical-specs': { technicalSpecs: product.technicalSpecs || {}, dimensions: product.dimensions || {}, weight: product.weight || {} },
      'images': { images: product.images || [] },
      'discounts': { discount: product.discount || {} },
      'custom-content': { customContent: product.customContent || [] }
    });
    setEditingProduct(product);
    setIsCreating(true);
// Remove setCurrentStep since it's not defined and not needed here
 
  };

  const handleSaveProduct = async (status: 'draft' | 'published' = 'draft') => {
    setSubmitting(true);
    try {
      const productData = {
        name: newProduct['basic-info'].name,
        description: newProduct['basic-info'].description,
        price: Number(newProduct['basic-info'].price || 0),
        stock: Number(newProduct['basic-info'].stock || 0),
        status,
        brand: newProduct['basic-info'].brand || null,
        category: newProduct['basic-info'].category || null,
        countryOfOrigin: newProduct['basic-info'].countryOfOrigin || null,
        technicalSpecs: newProduct['technical-specs']?.technicalSpecs || {},
        images: (newProduct['images'] as any)?.images || [],
        discount: {
          isActive: Boolean((newProduct['discounts'] as any)?.discount?.isActive),
          type: (newProduct['discounts'] as any)?.discount?.type || 'percentage',
          value: Number((newProduct['discounts'] as any)?.discount?.value || 0)
        },
        customContent: Array.isArray(newProduct['custom-content']?.customContent) 
          ? newProduct['custom-content'].customContent
          : [],
        attributes: newProduct['options']?.attributes || [],
        variants: newProduct['options']?.variants || [],
        customFields: newProduct['basic-info'].customFields || []
      };

      console.log('Sending product data:', productData);

      if (editingProduct) {
        await updateProduct(editingProduct._id, productData);
      } else {
        const res = await fetch('/api/dashboard/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'فشل إنشاء المنتج');
        }
      }

      toast.success(editingProduct ? 'تم تحديث المنتج بنجاح' : 'تم إنشاء المنتج بنجاح');
      setIsCreating(false);
      setEditingProduct(null);
      setNewProduct({
        'basic-info': { customFields: [] },
        'options': {},
        'technical-specs': { technicalSpecs: {}, dimensions: {}, weight: {} },
        'images': {},
        'discounts': {},
        'custom-content': { customContent: [] }
      });

      mutate();
    } catch (e: any) {
      console.error('Error saving product:', e);
      toast.error(e.message || 'فشل حفظ المنتج');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (id: string, data: any) => {
    setIsUpdating(true);
    toast('جاري تحديث المنتج...');
    try { 
      await updateProduct(id, data);
      toast.success('تم تحديث المنتج بنجاح');
      mutate(); 
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : 'فشل تحديث المنتج');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return; 
    setIsLoading(true);
    toast('جاري حذف المنتج...');
    try { 
      await deleteProduct(productToDelete._id);
      toast.success('تم حذف المنتج بنجاح');
      setIsDeleteDialogOpen(false); 
      mutate(); 
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : 'فشل حذف المنتج');
    } finally { 
      setIsLoading(false); 
    }
  };

  if (isLoadingProducts || isLoadingBrands) return <Loading />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* وضع إشعارات react-hot-toast في أعلى الصفحة */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">المنتجات</h1>
        <Button
          onClick={() => { 
            setEditingProduct(null);
            setNewProduct({
              'basic-info': {},
              'options': {},
              'technical-specs': { technicalSpecs: {}, dimensions: {}, weight: {} },
              'images': {},
              'discounts': {},
              'custom-content': { customContent: [] }
            });
            setIsCreating(!isCreating);
          }}
          disabled={isUpdating || submitting}
        >
          <Plus className="ml-2 h-4 w-4" /> {isCreating && !editingProduct ? 'إلغاء' : editingProduct ? 'إلغاء التعديل' : 'إضافة منتج'}
        </Button>
      </div>
      {isCreating ? (
        <ProductForm
          initialData={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setIsCreating(false);
            setEditingProduct(null);
          }}
          isSubmitting={submitting}
        />
      ) : (
        <>
          <div className="flex gap-4 items-center flex-wrap">
            <input
              type="text"
              placeholder="ابحث بالاسم، السلاج، الفئة، العلامة التجارية أو بلد المنشأ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border p-2 rounded-md flex-1"
            />
            <Select value={filterCategory || "all"} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterBrand || "all"} onValueChange={(value) => { 
              setFilterBrand(value === "all" ? "" : value); 
              setFilterCountry(''); 
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="كل العلامات التجارية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العلامات التجارية</SelectItem>
                {brands?.map((b: any) => (
                  <SelectItem key={String(b._id)} value={String(b._id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filterCountry || "all"} 
              onValueChange={(value) => setFilterCountry(value === "all" ? "" : value)} 
              disabled={!availableCountries.length}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="كل بلدان المنشأ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل بلدان المنشأ</SelectItem>
                {availableCountries.map((c: any) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center text-muted-foreground">لا توجد منتجات مطابقة</div>
            ) : (
              filteredProducts.map((p: any) => (
                <div key={p._id} className="bg-card/90 backdrop-blur-md p-4 flex items-center rounded-md shadow-md">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted">
                        {p.images?.[0] ? (
                          <Image src={p.images[0].url} alt={p.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-muted rounded-3xl p-2 px-3">
                        <QuickEditInput disabled={isUpdating} value={p.name} onSubmit={v => handleUpdateProduct(p._id, { name: v })} />
                        <span className="text-sm text-muted-foreground">{p.slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-[--radius] pr-2">
                      <label className="block text-sm font-medium text-muted-foreground">الفئة</label>
                      <QuickEditSelect
                        disabled={isUpdating}
                        value={p.category?._id || 'none'}
                        onValueChange={v => handleUpdateProduct(p._id, { category: v })}
                        options={[
                          { label: 'بدون فئة', value: 'none' },
                          ...categories.map((c: any) => ({ label: c.name, value: c._id }))
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                      <label className="block text-sm font-medium text-muted-foreground">السعر</label>
                      <QuickEditInput
                        disabled={isUpdating}
                        value={formatCurrency(p.price)}
                        onSubmit={v => { 
                          const n = parseFloat(v.toString().replace(/[^\d.-]/g, '')); 
                          if (!isNaN(n)) handleUpdateProduct(p._id, { price: n }); 
                        }}
                      />
                      {p.discount?.isActive && (
                        <div className="text-sm">
                          <span className="text-primary">
                            {formatCurrency(p.discount?.isActive ? p.price - (p.discount.type === 'percentage' ? (p.price * p.discount.value) / 100 : p.discount.value) : p.price)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                      <label className="block text-sm font-medium text-muted-foreground">المخزون</label>
                      <QuickEditInput
                        disabled={isUpdating}
                        value={(p.stock ?? 0).toString()}
                        onSubmit={v => { 
                          const n = parseInt(v.toString().replace(/[^\d-]/g, '')); 
                          if (!isNaN(n)) handleUpdateProduct(p._id, { stock: n }); 
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                      <label className="block text-sm font-medium text-muted-foreground">الخصم</label>
                      <div className="flex items-center gap-2">
                        <QuickEditSelect
                          disabled={isUpdating}
                          value={p.discount?.type || 'percentage'}
                          onValueChange={v => handleUpdateProduct(p._id, { 
                            discount: { 
                              ...p.discount,
                              type: v,
                              isActive: true
                            }
                          })}
                          options={[
                            { label: 'نسبة مئوية', value: 'percentage' },
                            { label: 'قيمة ثابتة', value: 'fixed' }
                          ]}
                        />
                        <QuickEditInput
                          disabled={isUpdating}
                          value={p.discount?.value?.toString() || '0'}
                          onSubmit={v => {
                            const n = parseFloat(v.toString().replace(/[^d.-]/g, ''));
                            if (!isNaN(n)) {
                              handleUpdateProduct(p._id, {
                                discount: {
                                  ...p.discount,
                                  value: n,
                                  isActive: n > 0
                                }
                              });
                            }
                          }}
                        />
                        {p.discount?.type === 'percentage' ? '%' : ''}
                        <DateRangePicker
                          className="w-auto"
                          startValue={p.discount?.startDate}
                          endValue={p.discount?.endDate}
                          onStartChange={(date) => {
                            handleUpdateProduct(p._id, {
                              discount: {
                                ...p.discount,
                                startDate: date
                              }
                            });
                          }}
                          onEndChange={(date) => {
                            handleUpdateProduct(p._id, {
                              discount: {
                                ...p.discount,
                                endDate: date
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                      <StatusToggle
                        disabled={isUpdating}
                        checked={p.status === 'published'}
                        onCheckedChange={c => handleUpdateProduct(p._id, { status: c ? 'published' : 'draft' })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isUpdating}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isUpdating} onClick={() => handleEditProduct(p)}>
                            <Pencil className="ml-2 h-4 w-4" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isUpdating}
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setProductToDelete(p); setIsDeleteDialogOpen(true); }}
                          >
                            <Trash className="ml-2 h-4 w-4" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                        <label className="block text-sm font-medium text-muted-foreground">SKU</label>
                        <span className="text-sm">{p.sku}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                        <label className="block text-sm font-medium text-muted-foreground">S/N</label>
                        <span className="text-sm">{p.serialNumber}</span>
                      </div>
                      {p.qrCode && (
                        <div className="relative w-8 h-8">
                          <Image src={p.qrCode} alt="QR Code" width={32} height={32} />
                        </div>
                      )}
                    </div>
                    {p.customFields && p.customFields.length > 0 && (
                      <div className="flex items-center gap-1 bg-muted rounded-[--radius] p-1 px-2">
                        <div className="flex flex-col gap-1">
                          {p.customFields.map(({ label, value }: { label: string; value: string }, index: number) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{label}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">SKU:</span>
                      <Badge variant="outline">{p.sku || 'غير محدد'}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">S/N:</span>
                      <Badge variant="outline">{p.serialNumber || 'غير محدد'}</Badge>
                    </div>
                  </div>
                  {p.qrCode && (
                    <div className="relative w-24 h-24 ml-4">
                      <Image
                        src={p.qrCode}
                        alt="رمز QR"
                        fill
                        className="object-contain"
                        sizes="96px"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">إجمالي المنتجات: {pagination.total}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages || isLoadingProducts || isUpdating}>
                التالي
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">{currentPage} / {pagination.pages}</div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoadingProducts || isUpdating}>
                السابق
              </Button>
            </div>
          </div>
        </>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف المنتج؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-destructive/90" disabled={isLoading}>
              {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
