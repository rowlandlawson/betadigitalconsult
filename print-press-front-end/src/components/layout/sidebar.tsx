'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, getLogoUrl } from '@/lib/utils';
import Image from 'next/image';
import { useCompanySettings } from '@/lib/useCompanySettings';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Package, 
  CreditCard, 
  BarChart3,
  Bell,
  Settings,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  UserPlus, 
  BarChart,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  userRole: 'admin' | 'worker';
  isMobileOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Group admin navigation items by category
const adminNavGroups: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    title: 'Jobs',
    items: [
      { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/admin/jobs/create', label: 'Create Job', icon: PlusCircle }
    ]
  },
  {
    title: 'Customers',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/customers/create', label: 'Add Customer', icon: UserPlus },
      { href: '/admin/customers/stats', label: 'Customer Analytics', icon: BarChart }
    ]
  },
  {
  //   title: 'Inventory',
  //   items: [
  //     { href: '/admin/inventory', label: 'Inventory', icon: Package },
  //     { href: '/admin/inventory/create', label: 'Add Item', icon: PlusCircle },
  //     { href: '/admin/inventory/alerts', label: 'Stock Alerts', icon: AlertTriangle }
  //   ]
  // },
  title: 'Inventory',
  items: [
    { href: '/admin/inventory', label: 'All Items', icon: Package },
    { href: '/admin/inventory/create', label: 'Add Item', icon: PlusCircle },
    { href: '/admin/inventory/monitoring', label: 'Material Monitoring', icon: TrendingUp },
    { href: '/admin/inventory/tracking', label: 'Usage Tracking', icon: BarChart3 },
    { href: '/admin/inventory/alerts', label: 'Stock Alerts', icon: AlertTriangle }
  ]
},
  {
    title: 'Payments',
    items: [
      { href: '/admin/payments', label: 'Payments', icon: CreditCard },
      { href: '/admin/payments/record', label: 'Record Payment', icon: PlusCircle },
      { href: '/admin/payments/stats', label: 'Payment Stats', icon: TrendingUp }
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/settings', label: 'Settings', icon: Settings }
    ]
  }
];

const workerNavItems: NavItem[] = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/worker/jobs', label: 'My Jobs', icon: Briefcase },
  { href: '/worker/notifications', label: 'Notifications', icon: Bell },
  { href: '/worker/payments', label: 'Payments', icon: CreditCard },
  { href: '/worker/payments/record', label: 'Record Payment', icon: PlusCircle },
];

interface NavGroupProps {
  group: NavGroup;
  pathname: string;
  isMobile: boolean;
  onToggleSidebar?: () => void;
}

const NavGroup: React.FC<NavGroupProps> = ({ 
  group, 
  pathname, 
  isMobile, 
  onToggleSidebar 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-[#AABD77] hover:bg-opacity-20 mb-2"
      >
        <span className="text-xs uppercase tracking-wider font-semibold">
          {group.title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      
      <div className={cn(
        "space-y-2 overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-1",
                "hover:bg-[#AABD77] hover:bg-opacity-30 hover:text-gray-900", 
                isActive
                  ? "bg-[#AABD77] text-white shadow-lg" 
                  : "text-gray-700"
              )}
              onClick={() => {
                if (isMobile && onToggleSidebar) {
                  console.log('📱 Mobile link clicked, closing sidebar');
                  onToggleSidebar();
                }
              }}
            >
              <Icon className={cn(
                "h-4 w-4 transition-colors shrink-0",
                isActive ? "text-white" : "text-gray-600"
              )} />
              <span className="ml-3 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  userRole, 
  isMobileOpen = false, 
  onToggleSidebar 
}) => {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      console.log('📱 Sidebar open, body scroll locked');
    } else {
      document.body.style.overflow = 'unset';
      console.log('📱 Sidebar closed, body scroll unlocked');
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen, isMobile]);

  const { settings } = useCompanySettings();
  const companyLogo = settings.logo ? getLogoUrl(settings.logo) || settings.logo : '/logo.png';
  const companyName = settings.name || 'Company Logo';

  const sidebarContent = (
    <div className={cn(
      "bg-white text-gray-900 h-full flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200",
      // Desktop: always visible, fixed width
      "lg:w-64 lg:static lg:translate-x-0",
      // Mobile: overlay sidebar
      "fixed top-0 left-0 z-40 w-64 h-full transform",
      isMobileOpen ? "translate-x-0" : "-translate-x-full",
      "lg:translate-x-0"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[#AABD77] bg-white flex items-center justify-between lg:justify-start shrink-0">
        {/* Responsive logo only - no text */}
        <div className="flex items-center justify-center w-full">
          <div className="relative w-32 h-12 lg:w-40 lg:h-14">
            <Image
              src="/logo.png"
              alt={`${companyName} Logo`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 128px, 160px"
              priority
              unoptimized
            />
          </div>
        </div>
        
        {/* Close button for mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0 absolute right-3"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 bg-white scrollbar-hide">
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        <div className="px-3">
          {userRole === 'admin' ? (
            // Admin navigation with dropdown groups
            <div className="space-y-4">
              {adminNavGroups.map((group) => (
                <NavGroup
                  key={group.title}
                  group={group}
                  pathname={pathname}
                  isMobile={isMobile}
                  onToggleSidebar={onToggleSidebar}
                />
              ))}
            </div>
          ) : (
            // Worker navigation (simple list)
            <div className="space-y-2">
              {workerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-1",
                      "hover:bg-[#AABD77] hover:bg-opacity-20 hover:text-gray-900", // Removed border classes from hover
                      isActive
                        ? "bg-[#AABD77] text-white shadow-lg" // Removed border-[#AABD77]
                        : "text-gray-700"
                    )}
                    onClick={() => {
                      if (isMobile && onToggleSidebar) {
                        console.log('📱 Mobile link clicked, closing sidebar');
                        onToggleSidebar();
                      }
                    }}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-white" : "text-gray-600"
                    )} />
                    <span className="ml-3">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay with smooth transition */}
      <div 
        className={cn(
          "fixed inset-0 bg-black z-30 lg:hidden transition-opacity duration-300 ease-in-out",
          isMobileOpen && isMobile ? "bg-opacity-50" : "bg-opacity-0 pointer-events-none"
        )}
        onClick={onToggleSidebar}
      />

      {/* Sidebar */}
      {sidebarContent}
    </>
  );
};