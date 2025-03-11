'use client';

import { useSession } from 'next-auth/react';
import { IconUser, IconMail, IconPhone, IconBriefcase, IconGenderDemiboy, IconMars, IconVenus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/dashboard/image-upload';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  gender?: string;
  permissions: string[];
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  isFirstAdmin?: boolean;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    gender: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        try {
          const searchParams = new URLSearchParams();
          searchParams.append('id', session.user.id);
          
          const response = await fetch(`/api/dashboard/employees?${searchParams.toString()}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Profile API Response:', data); // Add this debug line
            const userProfile = data.employees?.find((emp: EmployeeProfile) => emp.id === session.user.id);
            if (userProfile) {
              console.log('User Profile:', userProfile); // Add this debug line
              setProfile(userProfile);
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [session]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        jobTitle: profile.jobTitle || '',
        gender: profile.gender || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenderChange = (value: string) => {
    setFormData({ ...formData, gender: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) formDataObj.append(key, value);
      });

      const response = await fetch(`/api/dashboard/employees?id=${profile.id}`, {
        method: 'PUT',
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const { employee } = await response.json();
      setProfile({
        ...profile,
        ...employee,
      });
      
      // Dispatch a custom event to notify other components about profile updates
      const profileUpdateEvent = new CustomEvent('profile-updated', {
        detail: { 
          gender: employee.gender,
          // Include other updated fields as needed
        }
      });
      window.dispatchEvent(profileUpdateEvent);
      
      setIsEditing(false);
      toast.success('تم تحديث البيانات الشخصية بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('فشل في تحديث البيانات الشخصية');
    }
  };

  const handleAvatarChange = async (file: File) => {
    if (!profile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/dashboard/employees?id=${profile.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      const { employee } = await response.json();
      setProfile({
        ...profile,
        avatar: employee.avatar
      });
      
      // Dispatch a custom event to notify other components about the avatar update
      const avatarUpdateEvent = new CustomEvent('avatar-updated', {
        detail: { avatar: employee.avatar }
      });
      window.dispatchEvent(avatarUpdateEvent);
      
      toast.success('تم تحديث الصورة الشخصية بنجاح');
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('فشل في تحديث الصورة الشخصية');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!profile) return;

    try {
      const formData = new FormData();
      formData.append('avatar', '');

      const response = await fetch(`/api/dashboard/employees?id=${profile.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

await response.json();
      setProfile({
        ...profile,
        avatar: undefined
      });
      
      // Dispatch a custom event to notify other components about the avatar removal
      const avatarUpdateEvent = new CustomEvent('avatar-updated', {
        detail: { avatar: undefined }
      });
      window.dispatchEvent(avatarUpdateEvent);
      
      toast.success('تم حذف الصورة الشخصية بنجاح');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('فشل في حذف الصورة الشخصية');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-[250px]" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6">لم يتم العثور على الملف الشخصي</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6">
        الملف الشخصي 
        {profile?.isFirstAdmin ? ' (المدير الأول)' : ''} {/* Add this debug text */}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <ImageUpload
                image={profile.avatar || null}
                onImageChange={(file: File | null) => {
                  if (file) handleAvatarChange(file);
                }}
                onImageRemove={handleAvatarRemove}
                width="w-[150px]"
                height="h-[150px]"
                className="rounded-full"
                isDisabled={isUploading}
              />
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              <p className="text-gray-600">{profile.jobTitle || 'موظف'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            {profile?.isFirstAdmin && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'إلغاء' : 'تعديل البيانات'}
                </Button>
              </div>
            )}

            {isEditing && profile?.isFirstAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>

                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>

                <div className="relative">
                  <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <IconBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Select
                      value={formData.gender}
                      onValueChange={handleGenderChange}
                    >
                      <SelectTrigger className="pl-10">
                        {formData.gender === 'MALE' ? (
                          <IconMars className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                        ) : formData.gender === 'FEMALE' ? (
                          <IconVenus className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-pink-500" />
                        ) : (
                          <IconGenderDemiboy className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        )}
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">ذكر</SelectItem>
                        <SelectItem value="FEMALE">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  حفظ التغييرات
                </Button>
              </form>
            ) : (
              <div>
                <h3 className="font-semibold mb-2">معلومات الاتصال</h3>
                <div className="flex items-center gap-2 mb-1">
                  <IconMail className="h-5 w-5 text-muted-foreground" />
                  <p>{profile.email}</p>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 mb-1">
                    <IconPhone className="h-5 w-5 text-muted-foreground" />
                    <p>{profile.phone}</p>
                  </div>
                )}
                <h3 className="font-semibold mb-2 mt-4">معلومات إضافية</h3>
                {profile.gender && (
                  <div className="flex items-center gap-2 mb-1">
                    {profile.gender === 'MALE' ? (
                      <IconMars className="h-5 w-5 text-blue-500" />
                    ) : (
                      <IconVenus className="h-5 w-5 text-pink-500" />
                    )}
                    <p className={profile.gender === 'MALE' ? 'text-blue-500' : 'text-pink-500'}>
                      {profile.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <IconBriefcase className="h-5 w-5 text-muted-foreground" />
                  <p>{profile.permissions.map(permission => {
                    if (permission === 'ALL') return 'كل الصلاحيات';
                    if (permission.includes('_VIEW')) return 'عرض';
                    if (permission.includes('_CREATE')) return 'إضافة';
                    if (permission.includes('_EDIT')) return 'تعديل';
                    if (permission.includes('_DELETE')) return 'حذف';
                    if (permission.includes('_REPLY')) return 'رد';
                    return permission;
                  }).join('، ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <IconUser className="h-5 w-5 text-muted-foreground" />
                  <p>تاريخ الانضمام: {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}