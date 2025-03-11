'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Trash, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  icon?: 'alert' | 'trash';
}

type ConfirmDialogInstance = (options: ConfirmDialogOptions) => Promise<boolean>;

let confirmDialog: ConfirmDialogInstance | null = null;

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

  confirmDialog = useCallback((options: ConfirmDialogOptions) => {
    setOptions(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolve(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resolve?.(false);
  }, [resolve]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolve?.(true);
  }, [resolve]);

  if (!options) return <>{children}</>;

  return (
    <>
      {children}
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {options.icon === 'trash' ? (
                <Trash className="h-5 w-5 text-destructive" />
              ) : options.icon === 'alert' ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertCircle className="h-5 w-5 text-primary" />
              )}
              {options.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>
              {options.cancelText || 'إلغاء'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                options.variant === 'destructive' &&
                  'bg-destructive hover:bg-destructive/90'
              )}
            >
              {options.confirmText || 'تأكيد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function useConfirmDialog() {
  const confirm: ConfirmDialogInstance = useCallback(
    (options) => {
      if (!confirmDialog) {
        throw new Error('ConfirmDialogProvider not found');
      }
      return confirmDialog(options);
    },
    []
  );

  return confirm;
}
