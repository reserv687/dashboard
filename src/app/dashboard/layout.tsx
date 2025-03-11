'use client';

import { Sidebar } from '@/components/dashboard/layout/sidebar';
import { ConfirmDialogProvider } from '@/components/dashboard/confirm-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center min-h-screen  pb-32 md:pb-16 pt-16 bg-background md:pr-20 md:pl-4 ">
      <Sidebar />
      <main className="container mx-auto px-10">
        <ConfirmDialogProvider>
          {children}
        </ConfirmDialogProvider>
      </main>
    </div>
  );
}
