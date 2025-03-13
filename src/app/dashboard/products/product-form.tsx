'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BasicInfoForm } from '@/components/dashboard/products/forms/basic-info-form';
import { TechnicalSpecsForm } from '@/components/dashboard/products/forms/technical-specs-form';
import { ImagesForm } from '@/components/dashboard/products/forms/images-form';
import { CustomContentForm } from '@/components/dashboard/products/forms/custom-content-form';
import { DiscountForm } from '@/components/dashboard/products/forms/discount-form';
import { ProductOptionsForm } from '@/components/dashboard/products/forms/variants-form';
import { ReturnPolicyForm } from '@/components/dashboard/products/forms/return-policy-form';  // Add this import

const formSteps = [
  { id: 'basic-info', label: 'المعلومات الأساسية' },
  { id: 'options', label: 'خيارات المنتج' },
  { id: 'technical-specs', label: 'المواصفات الفنية' },
  { id: 'images', label: 'الصور' },
  { id: 'return-policy', label: 'سياسة الاسترجاع' }, // إضافة خطوة جديدة
  { id: 'discounts', label: 'الخصومات' },
  { id: 'custom-content', label: 'المحتوى الإضافي' }
] as const;

type FormStep = typeof formSteps[number]['id'];

interface ProductFormProps {
  initialData?: any;
  onSave: (data: any, status: 'draft' | 'published') => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSave, onCancel, isSubmitting }: ProductFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic-info');
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set());
  const [formData, setFormData] = useState({
    'basic-info': {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      stock: initialData?.stock || 0,
      category: initialData?.category?._id || initialData?.category || '',
      brand: initialData?.brand?._id || initialData?.brand || '',
      countryOfOrigin: initialData?.countryOfOrigin || '',
      sku: initialData?.sku || '',
      customFields: initialData?.customFields || []
    },
    'options': {
      attributes: initialData?.attributes || [],
      variants: initialData?.variants || []
    },
    'technical-specs': {
      dimensions: initialData?.technicalSpecs?.dimensions || {},
      weight: initialData?.technicalSpecs?.weight || {},
      specifications: initialData?.technicalSpecs?.specifications || {}
    },
    'images': {
      images: initialData?.images || []
    },
    'return-policy': {
      returnPolicy: initialData?.returnPolicy || {
        replacementPeriod: 7,
        refundPeriod: 14
      }
    },
    'discounts': {
      discount: initialData?.discount || {
        isActive: false,
        type: 'percentage',
        value: 0,
        startDate: null,
        endDate: null
      }
    },
    'custom-content': {
      customContent: initialData?.customContent || []
    }
  });

  const canCompleteStep = (step: FormStep, data: any) => {
    if (step === 'basic-info') {
      // تعديل الشروط لتكون الحقول الأساسية فقط إلزامية
      return data.name && data.description && typeof data.price === 'number';
    }
    if (step === 'images') return data.images?.length > 0;
    return true;
  };

  const handleStepComplete = (step: FormStep, data: any) => {
    if (!canCompleteStep(step, data)) {
      toast.error('يرجى إكمال جميع البيانات المطلوبة');
      return;
    }

    setFormData(prev => {
      const updatedData = { ...prev };
      if (step === 'technical-specs') {
        // تحديث طريقة حفظ المواصفات الفنية
        updatedData[step] = {
          dimensions: data.dimensions || {},
          weight: data.weight || {},
          specifications: data.specifications || {}
        };
        console.log('Updated technical specs:', updatedData[step]);
      } else if (step === 'custom-content') {
        console.log('Received custom content:', data);
        updatedData[step] = {
          customContent: data.customContent || []
        };
        console.log('Updated form data:', updatedData);
      } else if (step === 'discounts') {
        updatedData[step] = {
          discount: {
            isActive: Boolean(data.discount?.isActive),
            type: data.discount?.type || 'percentage',
            value: Number(data.discount?.value || 0),
            startDate: data.discount?.startDate ? new Date(data.discount.startDate) : undefined,
            endDate: data.discount?.endDate ? new Date(data.discount.endDate) : undefined
          }
        };
      } else {
        updatedData[step] = data;
      }
      return updatedData;
    });

    setCompletedSteps(prev => new Set(prev).add(step));
    const curIndex = formSteps.findIndex(s => s.id === step);
    if (curIndex < formSteps.length - 1) setCurrentStep(formSteps[curIndex + 1].id);
  };

  const handlePreviousStep = () => {
    const curIndex = formSteps.findIndex(s => s.id === currentStep);
    if (curIndex > 0) setCurrentStep(formSteps[curIndex - 1].id);
  };
  
  const handleNextStep = () => {
    // إذا كنا في قسم المواصفات الفنية، نقوم بالحصول على البيانات مباشرة من النموذج
    if (currentStep === 'technical-specs' && typeof window.technicalSpecsFormSubmit === 'function') {
      const technicalSpecsData = window.technicalSpecsFormSubmit();
      handleStepComplete('technical-specs', technicalSpecsData);
      return;
    }
    
    // إذا كنا في قسم الخصومات، نقوم بالحصول على البيانات مباشرة من النموذج
    if (currentStep === 'discounts' && typeof window.discountFormSubmit === 'function') {
      const discountData = window.discountFormSubmit();
      handleStepComplete('discounts', discountData);
      return;
    }
    
    // للأقسام الأخرى، نستخدم النموذج العادي
    const f = document.querySelector('form');
    if (f) f.requestSubmit();
  };

  const handleSave = async (status: 'draft' | 'published') => {
    const basicInfo = formData['basic-info'];
    
    const flattenedData = {
      ...initialData, // Keep existing data
      _id: initialData?._id, // Preserve ID for updates
      name: basicInfo.name,
      description: basicInfo.description,
      price: Number(basicInfo.price || 0),
      stock: Number(basicInfo.stock || 0),
      brand: basicInfo.brand || null,
      category: basicInfo.category || null,
      countryOfOrigin: basicInfo.countryOfOrigin || null,
      sku: basicInfo.sku || null,
      technicalSpecs: formData['technical-specs'],
      images: formData['images'].images,
      discount: formData['discounts'].discount,
      customContent: formData['custom-content'].customContent,
      attributes: formData['options'].attributes,
      variants: formData['options'].variants,
      customFields: basicInfo.customFields || [],
      returnPolicy: formData['return-policy'].returnPolicy,
      status,
      isFeatured: basicInfo.isFeatured, // تأكد من تضمين الحالة المميزة
    };

    console.log('Saving product with featured status:', basicInfo.isFeatured);
    await onSave(flattenedData, status);
  };

  const renderForm = () => {
    const props = {
      isSubmitting,
      onCancel
    };

    switch (currentStep) {
      case 'basic-info':
        return <BasicInfoForm data={formData['basic-info']} onComplete={(d) => handleStepComplete('basic-info', d)} {...props} />;
      case 'options':
        return <ProductOptionsForm data={formData['options']} onComplete={(d) => handleStepComplete('options', d)} {...props} />;
      case 'technical-specs':
        return <TechnicalSpecsForm data={formData['technical-specs']} onComplete={(d) => handleStepComplete('technical-specs', d)} {...props} />;
      case 'images':
        return <ImagesForm data={formData['images']} onComplete={(d) => handleStepComplete('images', d)} {...props} />;
      case 'return-policy':
        return (
          <ReturnPolicyForm
            data={formData['return-policy'].returnPolicy}
            onComplete={(d) => handleStepComplete('return-policy', { returnPolicy: d })}
            {...props}
          />
        );
      case 'discounts':
        return (
          <DiscountForm
            data={formData['discounts']}
            productPrice={formData['basic-info']?.price}
            onComplete={(d) => handleStepComplete('discounts', d)}
            {...props}
          />
        );
      case 'custom-content':
        return <CustomContentForm data={formData['custom-content']} onComplete={(d) => handleStepComplete('custom-content', d)} {...props} />;
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-md p-6 rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <div className="flex items-center justify-between mb-6 min-w-[600px] px-2">
          {formSteps.map((step, index) => (
            <div key={step.id} className={cn("flex items-center", index < formSteps.length - 1 && "flex-1")}>
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border shrink-0",
                currentStep === step.id && "bg-primary text-primary-foreground",
                completedSteps.has(step.id) && "bg-primary/20"
              )}>
                {completedSteps.has(step.id) ? "✓" : index + 1}
              </div>
              <div className={cn("mr-2 text-sm whitespace-nowrap", currentStep === step.id && "font-medium")}>
                {step.label}
              </div>
              {index < formSteps.length - 1 && <div className="flex-1 mx-4 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {renderForm()}

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePreviousStep}
          disabled={currentStep === 'basic-info' || isSubmitting}
        >
          <ArrowRight className="ml-2 h-4 w-4" /> السابق
        </Button>

        {currentStep === formSteps[formSteps.length - 1].id ? (
          <div className="flex gap-2">
            <Button onClick={() => handleSave('draft')} disabled={isSubmitting}>
              حفظ كمسودة
            </Button>
            <Button onClick={() => handleSave('published')} disabled={isSubmitting}>
              {initialData ? 'تحديث المنتج' : 'نشر المنتج'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleNextStep}
            disabled={isSubmitting}
          >
            <ArrowLeft className="ml-2 h-4 w-4" /> التالي
          </Button>
        )}
      </div>
    </div>
  );
}