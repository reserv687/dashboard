'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';
import { useCategories } from '@/hooks/use-categories';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  _id: string;
  name: string;
  parent?: string;
}

interface CategorySelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  placeholder = 'اختر الفئة',
  disabled
}: CategorySelectProps) {
  const { categories, isLoading } = useCategories();
  console.log('CategorySelect - Current value:', value);
  console.log('CategorySelect - Available categories:', categories);

  // تنظيم الفئات في شكل شجري
  const organizeCategories = (cats: Category[]) => {
    if (!Array.isArray(cats)) {
      console.warn('Categories is not an array:', cats);
      return [];
    }

    const mainCategories = cats.filter(cat => !cat.parent);
    const subCategories = cats.filter(cat => cat.parent);
    
    return mainCategories.map(main => ({
      ...main,
      children: subCategories.filter(sub => sub.parent === main._id)
    }));
  };

  const organizedCategories = React.useMemo(
    () => organizeCategories(categories),
    [categories]
  );

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!categories || categories.length === 0) {
    console.warn('No categories available');
    return (
      <Select
        value={value}
        onValueChange={onChange}
        disabled={true}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="لا توجد فئات متاحة" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="_empty">لا توجد فئات</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {organizedCategories.map(category => (
          <SelectGroup key={category._id}>
            {category.children && category.children.length > 0 ? (
              <>
                <SelectLabel>{category.name}</SelectLabel>
                <SelectItem value={category._id}>- {category.name}</SelectItem>
                {category.children?.map(subCategory => (
                  <SelectItem key={subCategory._id} value={subCategory._id}>
                    -- {subCategory.name}
                  </SelectItem>
                ))}
              </>
            ) : (
              <SelectItem value={category._id}>{category.name}</SelectItem>
            )}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
