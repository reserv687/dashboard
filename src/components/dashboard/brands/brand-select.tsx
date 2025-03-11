'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrands } from '@/hooks/use-brands';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrandSelect({ value, onChange }: BrandSelectProps) {
  const { brands, isLoading } = useBrands();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="اختر العلامة التجارية" />
      </SelectTrigger>
      <SelectContent>
        {brands?.map((brand) => (
          <SelectItem key={String(brand._id)} value={String(brand._id)}>
            {brand.name} ({brand.countries.length} دولة)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
