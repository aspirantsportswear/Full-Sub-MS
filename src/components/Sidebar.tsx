import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  DollarSign, 
  Layers, 
  Settings, 
  Printer, 
  ChevronRight,
  ShieldCheck,
  Activity,
  Menu,
  X
} from 'lucide-react';

export type NavTab = 'dashboard' | 'attendance' | 'salary' | 'employees' | 'production' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleSidebar?: () => void;
  onOpenSecurityModal?: () => void;
  activeCount: {
    artists: number;
    operators: number;
    totalAttendance: number;
    pendingPayroll: number;
  };
  onOpenQuickPunch: () => void;
  shopName: string;
}

export const Sidebar = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  mobileOpen = false,
  onCloseMobile,
  onToggleSidebar,
  onOpenSecurityModal,
  activeCount,
  onOpenQuickPunch,
  shopName,
}: SidebarProps) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard & Analytics',
      icon: LayoutDashboard,
      badge: null,
      description: 'Charts & shop metrics',
    },
    {
      id: 'attendance' as NavTab,
      label: 'Attendance & Timecard',
      icon: Clock,
      badge: `${activeCount.totalAttendance} on clock`,
      badgeColor: 'bg-emerald-500/15 text-emerald-700',
      description: 'Punch clock & logs',
    },
    {
      id: 'salary' as NavTab,
      label: 'Salary & Payroll',
      icon: DollarSign,
      badge: activeCount.pendingPayroll > 0 ? `${activeCount.pendingPayroll} pending` : null,
      badgeColor: 'bg-amber-500/15 text-amber-700',
      description: 'Hours, OT & Payslips',
    },
    {
      id: 'employees' as NavTab,
      label: 'Artists & Operators',
      icon: Users,
      badge: `${activeCount.artists}A / ${activeCount.operators}M`,
      badgeColor: 'bg-indigo-500/15 text-indigo-700',
      description: 'Staff directory & rates',
    },
    {
      id: 'production' as NavTab,
      label: 'Sublimation Orders',
      icon: Printer,
      badge: null,
      description: 'Print & heat press queue',
    },
    {
      id: 'settings' as NavTab,
      label: 'Shop Settings',
      icon: Settings,
      badge: null,
      description: 'Shifts, OT rates & piece pay',
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    setCurrentTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      id="sublimation-sidebar"
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 shadow-xl ${
        mobileOpen
          ? 'translate-x-0 w-72'
          : '-translate-x-full md:translate-x-0'
      } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
    >
      {/* Brand Header with Hamburger / Logo Toggle */}
      <div className={`p-3.5 border-b border-slate-800 flex items-center ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between'} gap-2`}>
        <div className={`flex items-center ${collapsed && !mobileOpen ? 'justify-center' : 'gap-3'} overflow-hidden`}>
          <button
            id="btn-sidebar-logo-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-950 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            title={collapsed ? "Click to Expand Sidebar" : (shopName || "Aspirant Sportswear")}
            aria-label={collapsed ? "Expand sidebar navigation" : (shopName || "Aspirant Sportswear")}
          >
            <Layers className="w-5 h-5 text-white" />
          </button>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-white truncate">
                {shopName || 'Aspirant Sportswear'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sublimation & Sportswear
              </span>
            </div>
          )}
        </div>

        {/* Hamburger Menu / Close Icon Button in Sidebar */}
        <div className="flex items-center">
          {/* Mobile close button when mobile drawer is open */}
          {mobileOpen ? (
            <button
              id="btn-close-mobile-sidebar"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors md:hidden cursor-pointer"
              title="Close Menu"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          ) : !collapsed ? (
            <button
              id="btn-sidebar-hamburger"
              onClick={onToggleSidebar ? onToggleSidebar : () => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:flex items-center justify-center cursor-pointer"
              title="Minimize / Collapse Sidebar Tray"
              aria-label="Minimize sidebar tray"
            >
              <Menu className="w-5 h-5 text-slate-300 hover:text-cyan-400 transition-colors" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Quick Punch Button */}
      <div className={`p-3 ${collapsed && !mobileOpen ? 'flex justify-center' : ''}`}>
        <button
          id="btn-quick-punch-sidebar"
          onClick={() => {
            onOpenQuickPunch();
            if (onCloseMobile) onCloseMobile();
          }}
          className={`py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
            collapsed && !mobileOpen
              ? 'w-10 h-10 p-0'
              : 'w-full px-3'
          }`}
          title="Quick Clock In / Clock Out"
          aria-label="Live Punch Clock"
        >
          <Clock className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Live Punch Clock</span>}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-2.5 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {(!collapsed || mobileOpen) && (
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Management Portal
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isCollapsedMode = collapsed && !mobileOpen;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsedMode ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-left transition-all group relative cursor-pointer ${
                isCollapsedMode
                  ? 'h-11 justify-center px-0'
                  : 'px-3 py-2.5 gap-3'
              } ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {isCollapsedMode && item.badge && (
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
              )}

              {!isCollapsedMode && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="truncate">
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ml-1 ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sublimation Roles Quick Counter footer */}
      {(!collapsed || mobileOpen) && (
        <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Floor Summary
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Live Shift</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Artists Active</span>
              <span className="text-purple-400 font-bold">{activeCount.artists} Designer{activeCount.artists !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Operators Active</span>
              <span className="text-blue-400 font-bold">{activeCount.operators} Tech{activeCount.operators !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Collapse Toggle (Desktop) */}
      <div className={`p-3 border-t border-slate-800 flex items-center ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between'} text-xs text-slate-400`}>
        {(!collapsed || mobileOpen) && (
          <button
            id="btn-sidebar-security-badge"
            onClick={onOpenSecurityModal}
            className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer group"
            title="System Security & Automated Bug Fixer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="group-hover:underline">Hardened & Protected</span>
          </button>
        )}
        {collapsed && !mobileOpen && (
          <button
            id="btn-sidebar-security-badge-mini"
            onClick={onOpenSecurityModal}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer mb-1"
            title="System Security & Automated Bug Fixer"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
        <button
          id="btn-toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          className={`p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center justify-center ${
            collapsed && !mobileOpen ? 'w-full' : ''
          }`}
          title={collapsed ? 'Expand Sidebar Tray' : 'Minimize / Collapse Sidebar Tray'}
          aria-label={collapsed ? 'Expand Sidebar Tray' : 'Minimize Sidebar Tray'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
          {collapsed && !mobileOpen && <span className="sr-only">Expand</span>}
        </button>
      </div>
    </aside>
  );
};
