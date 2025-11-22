'use client';

import React from 'react';
import { User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useCompanySettings } from '@/lib/useCompanySettings';

interface HeaderProps {
  user: {
    name: string;
    role: string;
    email: string;
  };
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar }) => {
  const { settings } = useCompanySettings();
  const companyName = settings.name || 'Company';
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Hamburger menu and welcome message */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            {/* Hamburger menu button - visible only on mobile */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-[#2c3e1f] border border-[#2c3e1f] hover:text-gray-900 hover:bg-gray-100 transition-colors rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 truncate">
                Welcome back, {user.name}
              </h1>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#AABD77] bg-opacity-20 text-[#2c3e1f] whitespace-nowrap shrink-0">
              {companyName}
            </span>
            {/* Mobile role badge */}
            <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#AABD77] bg-opacity-20 text-[#2c3e1f] whitespace-nowrap shrink-0">
              {companyName}
            </span>
          </div>
          
          {/* Right side - Notification and user info */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <NotificationBell />
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* User avatar and info - hidden on mobile, visible on sm and up */}
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#AABD77] rounded-full flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-sm">
                  <div className="font-medium text-gray-900 truncate max-w-[120px]">
                    {companyName}
                  </div>
                  <div className="text-gray-500 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Mobile user avatar only */}
              <div className="sm:hidden w-8 h-8 bg-[#AABD77] rounded-full flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              
              {/* Logout button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700 p-2 sm:px-3 sm:py-2"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};