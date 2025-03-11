import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { ThemeProviderWrapper } from '@/providers/theme-provider-wrapper';
import { ToastProvider } from '@/providers/toast-provider';

const cairo = Cairo({ 
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'المتجر',
  description: 'متجر إلكتروني',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={cairo.className}>
        <ThemeProviderWrapper>
          <ToastProvider />
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
          </div>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
