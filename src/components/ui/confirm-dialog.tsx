'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-w-[90%] p-4 sm:p-6 rounded-xl" hideCloseButton>
        <DialogHeader className="gap-2 sm:gap-4">
          {variant === 'destructive' && (
            <div className="mx-auto p-2 sm:p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
            </div>
          )}
          <DialogTitle className={cn('text-center text-lg sm:text-xl', variant === 'destructive' && 'text-destructive')}>
            {title}
          </DialogTitle>
          <DialogDescription className="text-center whitespace-pre-line text-sm sm:text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-w-[80px] sm:min-w-[100px]"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            className="min-w-[80px] sm:min-w-[100px]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
