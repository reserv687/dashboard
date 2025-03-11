'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  IconLayout2, IconLayout2Filled,
  IconTag, IconTagFilled,
  IconLayoutList, IconLayoutListFilled,
  IconShoppingCart, IconShoppingCartFilled,
  IconUser, IconUserFilled,
  IconStars, IconStarsFilled,
  IconCropLandscape, IconCropLandscapeFilled,
  IconTruck, IconTruckFilled,
  IconUsers, IconSettings, IconSettingsFilled,
  IconLogout, IconMoon, IconSun,
  IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconLoader3, IconChartDonut, IconChartDonutFilled,
} from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Portal } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePermissions } from '@/hooks/use-permissions';
import Image from 'next/image';

const menuItems = [
  { label: 'الإحصائيات', icon: IconChartDonut, activeIcon: IconChartDonutFilled, href: '/dashboard/statistics', permission: 'statistics.view' },
  { label: 'المنتجات', icon: IconLayout2, activeIcon: IconLayout2Filled, href: '/dashboard/products', permission: 'products.view' },
  { label: 'الفئات', icon: IconLayoutList, activeIcon: IconLayoutListFilled, href: '/dashboard/categories', permission: 'categories.view' },
  { label: 'العلامات التجارية', icon: IconTag, activeIcon: IconTagFilled, href: '/dashboard/brands', permission: 'brands.view' },
  { label: 'الطلبات', icon: IconShoppingCart, activeIcon: IconShoppingCartFilled, href: '/dashboard/orders', permission: 'orders.view' },
  { label: 'العملاء', icon: IconUser, activeIcon: IconUserFilled, href: '/dashboard/customers', permission: 'customers.view' },
  { label: 'المراجعات', icon: IconStars, activeIcon: IconStarsFilled, href: '/dashboard/reviews', permission: 'reviews.view' },
  { label: 'الشرائح الرئيسية', icon: IconCropLandscape, activeIcon: IconCropLandscapeFilled, href: '/dashboard/hero', permission: 'hero.view' },
  { label: 'طرق الشحن', icon: IconTruck, activeIcon: IconTruckFilled, href: '/dashboard/shipping', permission: 'shipping.view' }
];
const bottomMenuItems = [
  { label: 'الإعدادات', icon: IconSettings, activeIcon: IconSettingsFilled, href: '/dashboard/Settings', permission: 'settings.view' },
  { label: 'الموظفين', icon: IconUsers, activeIcon: IconUsers, href: '/dashboard/employees', permission: 'employees.view' },
];

const useMediaQuery = (q: string) => {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(q);
    setMatch(media.matches);
    const listener = () => setMatch(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [q]);
  return match;
};

export function Sidebar() {
  return (
    <TooltipProvider>
      <SidebarContent />
    </TooltipProvider>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession() as unknown as { data: (Session & { user: { id: string; name?: string | null; email?: string | null; image?: string | null; } }) | null };
  const { hasPermission, isAdmin } = usePermissions();
  const [mounted, setMounted] = useState(false);
  const [activeHref, setActiveHref] = useState('');
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => setMounted(true), []);
  const filteredMenu = [...menuItems, ...bottomMenuItems].filter(i => isAdmin || hasPermission(i.permission));

  const checkScroll = useCallback(() => {
    if (!sidebarRef.current) return;
    const { scrollWidth, clientWidth, scrollHeight, clientHeight, scrollLeft, scrollTop } = sidebarRef.current;
    if (isDesktop) {
      setShowScroll(scrollHeight > clientHeight);
      setCanUp(scrollTop > 0);
      setCanDown(scrollTop < scrollHeight - clientHeight);
    } else {
      const overflow = scrollWidth > clientWidth;
      setShowScroll(overflow);
      if (overflow) {
        const cur = Math.round(Math.abs(scrollLeft));
        const max = Math.round(scrollWidth - clientWidth);
        setCanLeft(cur < max);
        setCanRight(cur > 0);
      } else {
        setCanLeft(false); setCanRight(false);
      }
    }
  }, [isDesktop]);

  const scroll = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!sidebarRef.current) return;
    const amt = 200, el = sidebarRef.current;
    if (isDesktop) {
      const newTop = dir === 'up' ? Math.max(0, el.scrollTop - amt) : el.scrollTop + amt;
      el.scrollTo({ top: newTop, behavior: 'smooth' });
    } else {
      const max = el.scrollWidth - el.clientWidth;
      const cur = Math.abs(el.scrollLeft);
      const newLeft = dir === 'right' ? Math.max(0, cur - amt) : Math.min(max, cur + amt);
      el.scrollTo({ left: -newLeft, behavior: 'smooth' });
    }
  }, [isDesktop]);

  useEffect(() => {
    const handle = () => requestAnimationFrame(checkScroll);
    const el = sidebarRef.current;
    if (el) {
      el.addEventListener('scroll', handle);
      window.addEventListener('resize', handle);
      handle();
      return () => {
        el.removeEventListener('scroll', handle);
        window.removeEventListener('resize', handle);
      };
    }
  }, [checkScroll]);

  useEffect(() => { setActiveHref(pathname || ''); setLoading(false); }, [pathname]);

  const navTo = (href: string) => {
    if (href === pathname) return;
    setLoading(true);
    setActiveHref(href);
    router.push(href);
  };

  const signOutHandler = async () => {
    try {
      setLoading(true);
      await signOut({ redirect: false, callbackUrl: '/auth' });
      router.push('/auth');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        try {
          const params = new URLSearchParams({ id: session.user.id });
          const res = await fetch(`/api/dashboard/employees?${params}`);
          if (res.ok) {
            const data = await res.json();
            const profile = data.employees?.find((emp: any) => emp.id === session.user.id);
            if (profile) {
              setUserProfile(profile);
            }
          }
        } catch (e) { console.error(e); }
      }
    };
    fetchProfile();
    const onProfileUpdate = (e: CustomEvent) => {
      setUserProfile((prev: any) => {
        if (!prev) return prev;
        const updates: Record<string, any> = {};
        
        // Handle avatar updates
        if ('avatar' in e.detail) {
          updates.avatar = e.detail.avatar;
        }
        
        // Handle gender updates
        if ('gender' in e.detail) {
          updates.gender = e.detail.gender;
        }
        
        return prev ? { ...prev, ...updates } : prev;
      });
    };
    window.addEventListener('avatar-updated', onProfileUpdate as EventListener);
    window.addEventListener('profile-updated', onProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('avatar-updated', onProfileUpdate as EventListener);
      window.removeEventListener('profile-updated', onProfileUpdate as EventListener);
    };
  }, [session?.user?.id]);

  const NavLink = ({ item }: { item: typeof menuItems[number] }) => {
    const active = activeHref === item.href;
    const IconComp = active && item.activeIcon ? item.activeIcon : item.icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href} onClick={(e) => { e.preventDefault(); navTo(item.href); }}
            className={cn("relative flex items-center justify-center shrink-0 h-12 w-12 rounded-full transition-all duration-300",
              active ? "text-primary-foreground transform scale-110" : "hover:text-primary-foreground")}>
            {loading && active ? <IconLoader3 className="w-7 h-7 text-primary animate-spin" /> :
              <IconComp size={24} className={cn("transition-all w-7 h-7 text-gray-500 duration-300", active && "transform text-primary scale-125")} />}
            <span className="sr-only">{item.label}</span>
          </Link>
        </TooltipTrigger>
        <Portal>
          <TooltipContent side={isDesktop ? "left" : "top"} align="center" className="font-medium z-[9999]" sideOffset={16}>
            {item.label}
          </TooltipContent>
        </Portal>
      </Tooltip>
    );
  };

  const ProfilePopover = () => {
    const [imgErr, setImgErr] = useState(false);
    const [imgLoad, setImgLoad] = useState(true);
    const getInitials = (name?: string | null) => name ? name.split(' ').slice(0,2).map(n => n[0]).join('') : '';
    const avatar = userProfile?.avatar || session?.user?.image;
    const gender = userProfile?.gender?.toLowerCase();
    const genderBorderColor = pathname === '/dashboard' ? 
      (gender === 'male' ? 'border-blue-600' : 'border-pink-600') :
      (gender === 'male' ? 'border-blue-300/50 hover:border-blue-600' : 'border-pink-300/50 hover:border-pink-600');
    
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className={cn("relative flex items-center justify-center shrink-0 w-14 h-14 rounded-[--radius] transition-all duration-300 overflow-hidden",
                pathname === '/dashboard' ? `border-4 ${genderBorderColor}` : `bg-background border-4 ${genderBorderColor} hover:bg-primary hover:text-primary-foreground`,
                avatar && imgLoad && "animate-pulse bg-muted")}>
                {avatar && !imgErr ? (
                  <Image src={avatar} alt={session?.user?.name || ''} width={100} height={100}
                    onError={() => { setImgErr(true); setImgLoad(false); }} onLoad={() => setImgLoad(false)} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl bg-primary/20">
                    {getInitials(session?.user?.name)}
                  </div>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
        </Tooltip>
        <PopoverContent className="w-fit shadow-lg bg-card backdrop-blur-lg rounded-full p-2"
          side={isDesktop ? "left" : "top"} align="center" sideOffset={16}>
          <div className="md:flex md:gap-2 md:space-y-0 space-y-2">
            <button onClick={() => navTo('/dashboard')}
              className={cn("relative flex items-center justify-center shrink-0 w-12 h-12 rounded-[--radius] transition-all duration-300 overflow-hidden bg-background hover:bg-primary hover:text-primary-foreground")}>
              {avatar && !imgErr ? (
                <Image src={avatar} alt={session?.user?.name || ''} width={50} height={50}
                  onError={() => setImgErr(true)} />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg bg-gray-300">
                  {getInitials(session?.user?.name)}
                </div>
              )}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={cn("relative flex items-center justify-center shrink-0 w-12 h-12 rounded-full transition-all duration-300",
                    mounted && theme==='dark' ? "dark:bg-blue-700/20 dark:text-gray-200" : "bg-yellow-300/20 text-yellow-900",
                    "hover:bg-yellow-300/50 dark:hover:bg-blue-700/50")}>
                  {mounted && (theme==='dark' ? <IconSun size={24} strokeWidth={2} className="transition-all duration-300" /> :
                    <IconMoon size={24} strokeWidth={2} className="transition-all duration-300" />)}
                  <span className="sr-only">{theme==='dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                </button>
              </TooltipTrigger>
              <Portal>
                <TooltipContent side={isDesktop ? "left" : "top"} align="center" className="font-medium z-[9999]" sideOffset={16}>
                  {theme==='dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                </TooltipContent>
              </Portal>
            </Tooltip>
            <button onClick={signOutHandler}
              className={cn("relative flex items-center justify-center shrink-0 w-12 h-12 rounded-full transition-all duration-300 bg-background hover:bg-red-600 hover:text-white")}>
              <IconLogout size={24} className="transition-all duration-300" />
              <span className="sr-only">تسجيل الخروج</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <motion.div className="fixed bottom-5 left-16 right-16 md:top-10 md:bottom-10 md:right-5 md:left-auto md:flex md:items-center z-[9999]"
      initial={{ opacity: 0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
      transition={{ duration:0.5, type:'spring', stiffness:120 }} onAnimationComplete={checkScroll}>
      <div className="relative z-[9999]" dir="rtl">
        {showScroll && (isDesktop ? (
          <>
            <ScrollButton dir="up" onClick={() => scroll('up')} icon={<IconChevronUp className="w-6 h-6" />} label="تمرير للأعلى" disabled={!canUp} />
            <ScrollButton dir="down" onClick={() => scroll('down')} icon={<IconChevronDown className="w-6 h-6" />} label="تمرير للأسفل" disabled={!canDown} />
          </>
        ) : (
          <>
            <ScrollButton dir="right" onClick={() => scroll('right')} icon={<IconChevronRight className="w-6 h-6" />} label="تمرير لليمين" disabled={!canRight} />
            <ScrollButton dir="left" onClick={() => scroll('left')} icon={<IconChevronLeft className="w-6 h-6" />} label="تمرير لليسار" disabled={!canLeft} />
          </>))}
        <div ref={sidebarRef} onScroll={checkScroll}
          className={cn("flex gap-2  shadow-lg border bg-card backdrop-blur-lg p-2 pt- rounded-[--radius]",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            isDesktop ? "flex-col items-center overflow-y-auto overflow-x-hidden max-h-[calc(100vh-8rem)]" :
            "flex-row items-center overflow-x-auto overflow-y-hidden")}>
          {filteredMenu.map(item => <NavLink key={item.href} item={item} />)}
          <ProfilePopover />
        </div>
      </div>
    </motion.div>
  );
}

const ScrollButton = ({ dir, onClick, icon, label, disabled }: { dir: 'up' | 'down' | 'left' | 'right', onClick: () => void, icon: React.ReactNode, label: string, disabled: boolean }) => (
  <button onClick={onClick} className={cn(
    "absolute w-10 h-10 rounded-full bg-background/70 backdrop-blur-lg flex items-center justify-center shadow-md transition-opacity duration-200",
    disabled && "opacity-0 pointer-events-none",
    dir==='up' && "top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-10",
    dir==='down' && "bottom-0 left-1/2 -translate-x-1/2 translate-y-12 z-10",
    dir==='right' && "right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10",
    dir==='left' && "left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10"
  )} aria-label={label}>{icon}</button>
);
