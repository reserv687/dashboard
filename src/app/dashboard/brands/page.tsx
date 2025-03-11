'use client';
 
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusToggle } from '@/components/ui/status-toggle';
import { CountrySelect } from '@/components/dashboard/brands/forms/country-select';
import { Loader2, MoreHorizontal, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBrands } from '@/hooks/use-brands';
import { countries } from '@/lib/constants/countries';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ImageUpload } from '@/components/dashboard/image-upload';
import { QuickEditInput } from '@/components/dashboard/quick-edit-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

import type { IBrand } from '@/models/brand.model';

export default function BrandsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<IBrand | null>(null);
  const [newBrand, setNewBrand] = useState({
    name: '',
    description: '',
    website: '',
    countries: [] as string[],
    logo: null as File | null,
    status: true
  });
  const { brands, isLoading, mutate } = useBrands();

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null); // Track which brand logo is being uploaded

  const handleStatusChange = async (id: string, newStatus: boolean) => {
    setUpdatingStatus(id);
    try {
      // تحديث الواجهة فورياً (optimistic update)
        const optimisticData = brands?.map((brand) =>
          brand._id === id ? { ...brand, status: newStatus } : brand
      );
await mutate(optimisticData as IBrand[], { revalidate: false });

      const response = await fetch('/api/dashboard/brands', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل تحديث حالة العلامة التجارية');
      }

      await mutate();
      toast.success('تم تحديث حالة العلامة التجارية بنجاح');
    } catch (error) {
      console.error('Error updating brand status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العلامة التجارية');
      await mutate();
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async () => {
    if (!brandToDelete?._id) return;

    try {
      const response = await fetch(`/api/dashboard/brands?id=${brandToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('فشل حذف العلامة التجارية');

      toast.success('تم حذف العلامة التجارية بنجاح');
      setIsDeleteDialogOpen(false);
      setBrandToDelete(null);
      await mutate();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('حدث خطأ أثناء حذف العلامة التجارية');
    }
  };

  const getCountryLabel = (code: string) => {
    return countries.find((country: any) => country.value === code)?.label || code;
  };

  // تصفية العلامات التجارية بناءً على البحث واختيار بلد المنشأ
  // سيتم البحث في اسم العلامة التجارية وأيضاً في البلدان بناءً على التسمية
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter((brand) => {
      const lowerQuery = searchQuery.toLowerCase();
      const nameMatch = brand.name.toLowerCase().includes(lowerQuery);
      const countryMatchInSearch = brand.countries.some(code =>
        getCountryLabel(code).toLowerCase().includes(lowerQuery)
      );
      const matchesSearch = nameMatch || countryMatchInSearch;
      const matchesCountryFilter = filterCountry ? brand.countries.includes(filterCountry) : true;
      return matchesSearch && matchesCountryFilter;
    });
  }, [brands, searchQuery, filterCountry]);

  const toggleStatus = (checked: boolean) => 
    setNewBrand({ ...newBrand, status: checked });

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">العلامات التجارية</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? 'إلغاء' : 'إضافة علامة تجارية'}
        </Button>
      </div>

      {/* شريط البحث والتصفية */}
      <div className="flex gap-4 items-center flex-wrap">
        <Select value={searchQuery || "all"} onValueChange={(value) => setSearchQuery(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="ابحث عن علامة تجارية..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العلامات التجارية</SelectItem>
            {brands?.map((brand) => (
              <SelectItem key={brand._id?.toString()} value={brand.name}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCountry || "all"} onValueChange={(value) => setFilterCountry(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="كل بلدان المنشأ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل بلدان المنشأ</SelectItem>
            {countries.map((country: any) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* قائمة العلامات التجارية */}
      <div className="flex flex-col gap-4">
        {isCreating && (
          <div className="bg-card/90 backdrop-blur-md p-4 flex items-center rounded-md shadow-md">
            <div className="flex flex-wrap items-center gap-4 w-full">
              <div className="flex items-center gap-3 flex-shrink-0">
                <ImageUpload
                  image={newBrand.logo ? URL.createObjectURL(newBrand.logo) : null}
                  onImageChange={(file) => setNewBrand({ ...newBrand, logo: file })}
                  onImageRemove={async () => Promise.resolve(setNewBrand({ ...newBrand, logo: null }))}
                  width="w-24"
                  height="h-24"
                  isDisabled={isUploading === 'new'}
                />
                <div className="flex flex-col items-start gap-3 w-full">
                  <Input
                    value={newBrand.name}
                    placeholder="اسم العلامة التجارية"
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    maxLength={100}
                    className="w-full"
                  />
                  <textarea
                    value={newBrand.description}
                    placeholder="وصف العلامة التجارية"
                    onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                    maxLength={500}
                    className="w-full min-h-[100px] p-2 rounded-md border resize-y"
                  />
                  <Input
                    type="url"
                    value={newBrand.website}
                    placeholder="الموقع الإلكتروني"
                    onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
                    className="w-full"
                  />
                  <div className="w-[300px]">
                    <CountrySelect
                      value={newBrand.countries}
                      onChange={(countries) => setNewBrand({ ...newBrand, countries })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>حالة العلامة التجارية:</span>
                    <StatusToggle
                      checked={newBrand.status}
                      onCheckedChange={toggleStatus}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        if (!newBrand.name) {
                          toast.error('يرجى إدخال اسم العلامة التجارية');
                          return;
                        }
                        
                        setIsUploading('new'); // Set uploading state for new brand

                        const formData = new FormData();
                        formData.append('name', newBrand.name);
                        if (newBrand.description) formData.append('description', newBrand.description);
                        if (newBrand.website) formData.append('website', newBrand.website);
                        if (newBrand.countries.length) formData.append('countries', JSON.stringify(newBrand.countries));
                        if (newBrand.logo) formData.append('logo', newBrand.logo);
formData.append('status', newBrand.status ? 'active' : 'inactive');

                        const response = await fetch('/api/dashboard/brands', {
                          method: 'POST',
                          body: formData,
                        });

                        if (!response.ok) throw new Error('فشل إضافة العلامة التجارية');

                        await mutate();
                        toast.success('تم إضافة العلامة التجارية بنجاح');
                        setIsCreating(false);
                        setNewBrand({
                          name: '',
                          description: '',
                          website: '',
                          countries: [],
                          logo: null,
                          status: true
                        });
                      } catch (error) {
                        console.error('Error adding brand:', error);
                        toast.error('حدث خطأ أثناء إضافة العلامة التجارية');
                      } finally {
                        setIsUploading(null); // Clear uploading state
                      }
                    }}
                    className="mt-4"
                  >
                    إضافة العلامة التجارية
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center text-muted-foreground">لا توجد علامات تجارية مطابقة</div>
        ) : (
            filteredBrands.map((brand) => (
            <div
              key={brand._id?.toString()}
              className="bg-card/90 backdrop-blur-md p-4 flex items-center rounded-md shadow-md"
            >
              <div className="flex flex-wrap items-center gap-4 w-full">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ImageUpload
                    image={brand.logo?.url || null}
                    onImageChange={async (file) => {
                      if (file) {
                        setIsUploading(brand._id as string); // Set uploading state for this brand
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          if (!response.ok) throw new Error('فشل تحديث شعار العلامة التجارية');
                          
                          const data = await response.json();
                          
                          const brandResponse = await fetch('/api/dashboard/brands', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              id: brand._id,
                              logo: { url: data.url }
                            }),
                          });

                          if (!brandResponse.ok) throw new Error('فشل تحديث شعار العلامة التجارية');
                          
                          await mutate();
                          toast.success('تم تحديث شعار العلامة التجارية بنجاح');
                        } catch (error) {
                          console.error('Error updating brand logo:', error);
                          toast.error('حدث خطأ أثناء تحديث شعار العلامة التجارية');
                          await mutate();
                        } finally {
                          setIsUploading(null); // Clear uploading state
                        }
                      }
                    }}
                    onImageRemove={async () => {
                      setIsUploading(brand._id as string); // Set uploading state for this brand
                      try {
                        const response = await fetch('/api/dashboard/brands', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            id: brand._id,
                            logo: null
                          }),
                        });

                        if (!response.ok) throw new Error('فشل إزالة شعار العلامة التجارية');
                        
                        await mutate();
                        toast.success('تم إزالة شعار العلامة التجارية بنجاح');
                      } catch (error) {
                        console.error('Error removing brand logo:', error);
                        toast.error('حدث خطأ أثناء إزالة شعار العلامة التجارية');
                        await mutate();
                      } finally {
                        setIsUploading(null); // Clear uploading state
                      }
                    }}
                    width="w-24"
                    height="h-24"
                    isDisabled={isUploading === (brand._id as string)}
                  />
                  <div className="flex flex-col items-start gap-1">
                    <QuickEditInput
                      value={brand.name}
                      onSubmit={async (newValue) => {
                        try {
                          const response = await fetch('/api/dashboard/brands', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              id: brand._id,
                              name: newValue,
                            }),
                          });

                          if (!response.ok) throw new Error('فشل تحديث اسم العلامة التجارية');
                          await mutate();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'فشل تحديث اسم العلامة التجارية');
                          throw err;
                        }
                      }}
                      placeholder="اسم العلامة التجارية"
                    />
                    <QuickEditInput
                      value={brand.description}
                      placeholder="أضف وصفاً للعلامة التجارية"
                      onSubmit={async (newValue) => {
                        try {
                          const response = await fetch('/api/dashboard/brands', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              id: brand._id,
                              description: newValue,
                            }),
                          });

                          if (!response.ok) throw new Error('فشل تحديث وصف العلامة التجارية');
                          await mutate();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'فشل تحديث وصف العلامة التجارية');
                          throw err;
                        }
                      }}
                    />
                    <QuickEditInput
                      value={brand.website}
                      placeholder="أضف رابط الموقع الإلكتروني"
                      onSubmit={async (newValue) => {
                        try {
                          const response = await fetch('/api/dashboard/brands', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              id: brand._id,
                              website: newValue,
                            }),
                          });

                          if (!response.ok) throw new Error('فشل تحديث رابط الموقع الإلكتروني');
                          await mutate();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'فشل تحديث رابط الموقع الإلكتروني');
                          throw err;
                        }
                      }}
                    />
                    <div className="w-[300px]">
                      <CountrySelect
                        value={brand.countries}
                        onChange={async (newCountries) => {
                          try {
                            const response = await fetch('/api/dashboard/brands', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                id: brand._id,
                                countries: newCountries,
                              }),
                            });

                            if (!response.ok) throw new Error('فشل تحديث البلدان');
                            
                            await mutate();
                            toast.success('تم تحديث البلدان بنجاح');
                          } catch (error) {
                            console.error('Error updating countries:', error);
                            toast.error('حدث خطأ أثناء تحديث البلدان');
                            await mutate();
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <StatusToggle
                      checked={brand.status}
                      onCheckedChange={(checked) =>
handleStatusChange(brand._id as string, checked)
                      }
                      disabled={updatingStatus === brand._id}
                    />
                    {updatingStatus === brand._id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setBrandToDelete(brand);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="ml-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="حذف العلامة التجارية"
        description={brandToDelete ? `هل أنت متأكد من حذف "${brandToDelete.name}"؟` : ''}
        onConfirm={handleDelete}
      />
    </div>
  );
}
