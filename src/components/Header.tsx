import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Menu,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { ShopSettings } from '../types';

interface HeaderProps {
  settings: ShopSettings;
  onOpenQuickPunch: () => void;
  onResetData: () => void;
  onAddNewEmployee: () => void;
  onAddNewOrder: () => void;
  onOpenSecurityModal?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export const Header = ({
  settings,
  onOpenQuickPunch,
  onResetData,
  onAddNewEmployee: _onAddNewEmployee,
  onAddNewOrder,
  onOpenSecurityModal,
  onToggleSidebar,
  sidebarCollapsed = false,
}: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
      {/* Title / Plant Info & Hamburger Button */}
      <div className="flex items-center justify-between md:justify-start gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Hamburger Menu Icon for Mobile and Desktop */}
          <button
            id="header-btn-toggle-sidebar"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-200/80 transition-colors flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 flex-shrink-0"
            title={sidebarCollapsed ? 'Expand Navigation Menu' : 'Minimize / Collapse Navigation Menu'}
            aria-label={sidebarCollapsed ? 'Expand navigation menu' : 'Minimize navigation menu'}
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate">
                {settings.shopName || 'Aspirant Sportswear'}
              </h1>
              <span className="text-[10px] sm:text-[11px] font-semibold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200 whitespace-nowrap flex-shrink-0">
                Shift ({settings.standardShiftStart || '08:00'} - {settings.standardShiftEnd || '17:00'})
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              {settings.tagline} • Sublimation Attendance, Overtime & Payroll Hub
            </p>
          </div>
        </div>
      </div>

      {/* Action Controls & Real-Time Clock Navbar List (Grid on mobile, inline on desktop for perfect fit) */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2.5 w-full md:w-auto">
        {/* 1. Security & Bug Fixer Diagnostic Shield Trigger */}
        <button
          id="header-btn-security-shield"
          onClick={onOpenSecurityModal}
          className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 text-center"
          title="Security Defense & Bug Fixer Center"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="truncate">System Hardened</span>
        </button>

        {/* 2. Real-time Clock & Date Card */}
        <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-slate-700 shadow-2xs">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 animate-pulse flex-shrink-0" />
          <div className="text-center sm:text-right flex flex-col justify-center min-w-0">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-800 tracking-tight leading-tight truncate">
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight truncate">
              {currentDate || 'Loading date...'}
            </div>
          </div>
        </div>

        {/* 3. Quick Punch Button */}
        <button
          id="header-btn-clock-punch"
          onClick={onOpenQuickPunch}
          className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center"
        >
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Clock In / Out</span>
        </button>

        {/* 4. Add Order Button */}
        <button
          id="header-btn-new-order"
          onClick={onAddNewOrder}
          className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer text-center"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="truncate">New Print Job</span>
        </button>
      </div>
    </header>
  );
};
