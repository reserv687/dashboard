'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { countries } from '@/lib/constants/countries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CountrySelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

export function CountrySelect({ value = [], onChange }: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(value);

  React.useEffect(() => {
    setSelectedCountries(value);
  }, [value]);

  const toggleCountry = (countryValue: string) => {
    const newValue = selectedCountries.includes(countryValue)
      ? selectedCountries.filter(v => v !== countryValue)
      : [...selectedCountries, countryValue];
    
    setSelectedCountries(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label>البلدان المتاحة</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px]"
          >
            <div className="flex flex-wrap gap-1 py-1">
              {selectedCountries.length > 0 ? (
                selectedCountries.map((countryValue) => {
                  const country = countries.find(c => c.value === countryValue);
                  return country ? (
                    <Badge key={country.value} variant="secondary">
                      {country.label}
                    </Badge>
                  ) : null;
                })
              ) : (
                <span className="text-muted-foreground">اختر البلدان المتاحة</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2" align="start">
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {countries.map((country) => (
                <div
                  key={country.value}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    selectedCountries.includes(country.value) && "bg-accent"
                  )}
                  onClick={() => toggleCountry(country.value)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedCountries.includes(country.value)
                        ? "bg-primary border-primary"
                        : "border-input"
                    )}
                  >
                    {selectedCountries.includes(country.value) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span>{country.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <p className="text-sm text-muted-foreground">
        اختر البلدان التي تتوفر فيها منتجات هذه العلامة التجارية
      </p>
    </div>
  );
}
