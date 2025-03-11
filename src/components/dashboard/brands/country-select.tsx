'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';
import { useBrands } from '@/hooks/use-brands';
import { Skeleton } from '@/components/ui/skeleton';
import { countries } from '@/lib/constants/countries';

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  brandId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  brandId,
  placeholder = 'اختر الدولة',
  disabled
}: CountrySelectProps) {
  const { brands, isLoading } = useBrands();
  const [availableCountries, setAvailableCountries] = React.useState<string[]>([]);

  // تحويل قيم الدول إلى lowercase للمقارنة
  const normalizeCountryValue = (value: string) => value.toLowerCase();

  React.useEffect(() => {
    if (brandId && brands) {
      console.log('CountrySelect - Finding brand:', { brandId, brands });
      const brand = brands.find(b => b._id === brandId);
      
      if (brand) {
        console.log('CountrySelect - Brand found:', brand);
        // تنقية وتحويل قيم الدول
        const normalizedCountries = brand.countries
          .map(normalizeCountryValue)
          .filter(countryValue => 
            countries.some(c => normalizeCountryValue(c.value) === countryValue)
          );
        
        console.log('CountrySelect - Setting available countries:', normalizedCountries);
        setAvailableCountries(normalizedCountries);
        
        // التحقق من القيمة المحددة
        if (value) {
          const normalizedValue = normalizeCountryValue(value);
          if (!normalizedCountries.includes(normalizedValue)) {
            console.log('CountrySelect - Resetting invalid value:', value);
            onChange('');
          }
        }
      } else {
        console.log('CountrySelect - Brand not found:', brandId);
        setAvailableCountries([]);
        if (value) {
          onChange('');
        }
      }
    } else {
      console.log('CountrySelect - No brand selected');
      setAvailableCountries([]);
      if (value) {
        onChange('');
      }
    }
  }, [brandId, brands, value, onChange]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!brandId || availableCountries.length === 0) {
    return (
      <Select disabled value="_empty" onValueChange={() => {}}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="اختر العلامة التجارية أولاً" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="_empty">اختر العلامة التجارية أولاً</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const handleValueChange = (newValue: string) => {
    // إذا كانت القيمة "_empty" نقوم بتحويلها إلى قيمة فارغة
    onChange(newValue === '_empty' ? '' : newValue);
  };

  return (
    <Select
      value={value || "_empty"}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="_empty">{placeholder}</SelectItem>
          {availableCountries.map(countryValue => {
            const country = countries.find(
              c => normalizeCountryValue(c.value) === countryValue
            );
            if (!country) return null;
            return (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
