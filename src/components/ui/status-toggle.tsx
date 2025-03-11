'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function StatusToggle({
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: StatusToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (newChecked: boolean) => {
    try {
      setIsUpdating(true);
      await onCheckedChange(newChecked);
    } catch (error: any) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Switch
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={disabled || isUpdating}
        dir="ltr"
      />
      {isUpdating && (
        <Loader2 className="absolute left-full ml-2 h-4 w-4 animate-spin" />
      )}
    </div>
  );
}
