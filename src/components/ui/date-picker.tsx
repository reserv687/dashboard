'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from '@heroicons/react/24/solid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DatePickerProps {
  date?: Date;
  onSelect?: (date: Date) => void;
}

export function DatePicker({ date, onSelect }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const today = new Date();
  
  const [selectedDay, setSelectedDay] = React.useState(date ? date.getDate().toString() : '');
  const [selectedMonth, setSelectedMonth] = React.useState(date ? (date.getMonth() + 1).toString() : '');
  const [selectedYear, setSelectedYear] = React.useState(date ? date.getFullYear().toString() : '');

  const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - i);
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const days = React.useMemo(() => {
    const daysInMonth = new Date(
      Number(selectedYear),
      Number(selectedMonth),
      0
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  const handleDateChange = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const selectedDate = new Date(
        Number(selectedYear),
        Number(selectedMonth) - 1,
        Number(selectedDay)
      );
      onSelect?.(selectedDate);
      setIsOpen(false);
    }
  };

  const formattedValue = date
    ? `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
    : "اختر تاريخ الميلاد";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-right font-normal relative h-10',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <span className="pl-10">{formattedValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="grid gap-2 p-4">
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={setSelectedYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth.toString()}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger>
                <SelectValue placeholder="الشهر" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {months.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedDay.toString()}
              onValueChange={setSelectedDay}
            >
              <SelectTrigger>
                <SelectValue placeholder="اليوم" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {days.map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDateChange} className="mt-2">تأكيد</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
