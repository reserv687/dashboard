'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  startValue?: string | Date | null;
  endValue?: string | Date | null;
  onStartChange?: (date: string) => void;
  onEndChange?: (date: string) => void;
  className?: string;
}

export function DateRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start Date State
  const [tempStartDay, setTempStartDay] = React.useState(today.getDate().toString());
  const [tempStartMonth, setTempStartMonth] = React.useState((today.getMonth() + 1).toString());
  const [tempStartYear, setTempStartYear] = React.useState(today.getFullYear().toString());

  // End Date State
  const [tempEndDay, setTempEndDay] = React.useState(today.getDate().toString());
  const [tempEndMonth, setTempEndMonth] = React.useState((today.getMonth() + 1).toString());
  const [tempEndYear, setTempEndYear] = React.useState(today.getFullYear().toString());

  // تحديث القيم المؤقتة عند تغيير القيم الخارجية
  React.useEffect(() => {
    if (startValue) {
      const date = new Date(startValue);
      setTempStartDay(date.getDate().toString());
      setTempStartMonth((date.getMonth() + 1).toString());
      setTempStartYear(date.getFullYear().toString());

      // تحديث تاريخ النهاية ليكون بعد تاريخ البداية
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      setTempEndDay(endDate.getDate().toString());
      setTempEndMonth((endDate.getMonth() + 1).toString());
      setTempEndYear(endDate.getFullYear().toString());
    }
  }, [startValue]);

  React.useEffect(() => {
    if (endValue) {
      const date = new Date(endValue);
      setTempEndDay(date.getDate().toString());
      setTempEndMonth((date.getMonth() + 1).toString());
      setTempEndYear(date.getFullYear().toString());
    }
  }, [endValue]);

  const ARABIC_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() + i);
  
  const getMonths = (selectedYear: string, isEndDate = false) => {
    const year = Number(selectedYear);
    const startYear = Number(tempStartYear);
    const startMonth = Number(tempStartMonth);

    if (year === today.getFullYear()) {
      // للسنة الحالية، نبدأ من الشهر الحالي
      const currentMonth = today.getMonth();
      if (isEndDate && year === startYear) {
        // لتاريخ النهاية في نفس السنة، نبدأ من شهر البداية
        return Array.from(
          { length: 12 - (startMonth - 1) },
          (_, i) => startMonth - 1 + i
        );
      }
      return Array.from(
        { length: 12 - currentMonth },
        (_, i) => currentMonth + i
      );
    }

    if (isEndDate && year === startYear) {
      // لتاريخ النهاية في نفس السنة، نبدأ من شهر البداية
      return Array.from(
        { length: 12 - (startMonth - 1) },
        (_, i) => startMonth - 1 + i
      );
    }

    return Array.from({ length: 12 }, (_, i) => i);
  };

  const getDaysInMonth = (year: number, month: number, isEndDate = false) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    if (isEndDate && 
        year === Number(tempStartYear) && 
        month === Number(tempStartMonth) - 1) {
      // لتاريخ النهاية في نفس الشهر، نبدأ من يوم بعد تاريخ البداية
      const startDay = Number(tempStartDay);
      return Array.from(
        { length: daysInMonth - startDay },
        (_, i) => startDay + i + 1
      );
    }

    if (year === today.getFullYear() && month === today.getMonth()) {
      // للشهر الحالي، نبدأ من اليوم الحالي
      return Array.from(
        { length: daysInMonth - today.getDate() + 1 },
        (_, i) => today.getDate() + i
      );
    }

    return Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    );
  };

  const formatDateToISOString = (year: number, month: number, day: number) => {
    // إنشاء التاريخ في منطقة التوقيت المحلية وضبط الوقت على منتصف اليوم
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (type: 'start' | 'end', value: string, field: 'day' | 'month' | 'year') => {
    let newStartDate: string | undefined;
    let newEndDate: string | undefined;

    if (type === 'start') {
      const newStartYear = field === 'year' ? Number(value) : Number(tempStartYear);
      const newStartMonth = field === 'month' ? Number(value) : Number(tempStartMonth);
      const newStartDay = field === 'day' ? Number(value) : Number(tempStartDay);

      newStartDate = formatDateToISOString(newStartYear, newStartMonth, newStartDay);
      newEndDate = formatDateToISOString(Number(tempEndYear), Number(tempEndMonth), Number(tempEndDay));

      if (field === 'day') setTempStartDay(value);
      if (field === 'month') setTempStartMonth(value);
      if (field === 'year') setTempStartYear(value);

    } else {
      const newEndYear = field === 'year' ? Number(value) : Number(tempEndYear);
      const newEndMonth = field === 'month' ? Number(value) : Number(tempEndMonth);
      const newEndDay = field === 'day' ? Number(value) : Number(tempEndDay);

      newStartDate = formatDateToISOString(Number(tempStartYear), Number(tempStartMonth), Number(tempStartDay));
      newEndDate = formatDateToISOString(newEndYear, newEndMonth, newEndDay);

      if (field === 'day') setTempEndDay(value);
      if (field === 'month') setTempEndMonth(value);
      if (field === 'year') setTempEndYear(value);
    }

    // التحقق من صحة التواريخ قبل حفظها
    if (newStartDate && newEndDate) {
      const start = new Date(newStartDate);
      const end = new Date(newEndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // تحديث التواريخ فقط إذا كان تاريخ النهاية بعد تاريخ البداية
      if (start <= end) {
        onStartChange?.(newStartDate);
        onEndChange?.(newEndDate);
      }
    }
  };

  const formatDateRange = () => {
    if (tempStartDay && tempEndDay) {
      return (
        <div className="flex flex-col items-center gap-1 text-sm">
          <span>{`${tempStartYear}-${tempStartMonth}-${tempStartDay}`}</span>
          <span>{`${tempEndYear}-${tempEndMonth}-${tempEndDay}`}</span>
        </div>
      );
    }
    return 'اختر فترة التاريخ';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("", className)} onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "justify-start text-right font-normal h-auto min-h-[2.5rem] py-2",
              !tempStartDay && !tempEndDay && "text-muted-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 p-4">
          {/* تاريخ البداية */}
          <div className="space-y-2">
            <div className="font-medium">تاريخ البداية</div>
            <div className="flex gap-2">
              <Select
                value={tempStartYear}
                onValueChange={(value) => handleDateChange('start', value, 'year')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="السنة" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={tempStartMonth}
                onValueChange={(value) => handleDateChange('start', value, 'month')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="الشهر" />
                </SelectTrigger>
                <SelectContent>
                  {getMonths(tempStartYear).map((monthIndex) => (
                    <SelectItem
                      key={monthIndex}
                      value={(monthIndex + 1).toString()}
                    >
                      {ARABIC_MONTHS[monthIndex]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={tempStartDay}
                onValueChange={(value) => handleDateChange('start', value, 'day')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {getDaysInMonth(
                    Number(tempStartYear),
                    Number(tempStartMonth) - 1
                  ).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* تاريخ النهاية */}
          <div className="space-y-2">
            <div className="font-medium">تاريخ النهاية</div>
            <div className="flex gap-2">
              <Select
                value={tempEndYear}
                onValueChange={(value) => handleDateChange('end', value, 'year')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="السنة" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={tempEndMonth}
                onValueChange={(value) => handleDateChange('end', value, 'month')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="الشهر" />
                </SelectTrigger>
                <SelectContent>
                  {getMonths(tempEndYear, true).map((monthIndex) => (
                    <SelectItem
                      key={monthIndex}
                      value={(monthIndex + 1).toString()}
                    >
                      {ARABIC_MONTHS[monthIndex]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={tempEndDay}
                onValueChange={(value) => handleDateChange('end', value, 'day')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {getDaysInMonth(
                    Number(tempEndYear),
                    Number(tempEndMonth) - 1,
                    true
                  ).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
