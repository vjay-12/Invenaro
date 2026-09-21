import React, { useState, useRef, useEffect } from 'react';
import {
  IconWarehouse,
  IconSun,
  IconMoon,
  IconBell,
  IconChevronDown,
  IconMenu,
  IconLogOut,
  IconShieldCheck,
  IconCheck,
  IconBuilding,
  IconUser,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import { NotificationDropdown } from './NotificationDropdown';
import { TabType } from './Sidebar';

interface NavbarProps {
  onOpenSearch?: () => void;
  onOpenChat?: () => void;
  onToggleMobileSidebar?: () => void;
  onNavigate?: (tab: TabType) => void;
  currentTab?: TabType;
}

const WAREHOUSE_FILTER_TABS: TabType[] = [
  'dashboard',
  'products',
  'ledger',
  'purchase_orders',
  'sales_orders',
];

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  onNavigate,
  currentTab = 'dashboard',
}) => {
  const showWarehouseSelector = WAREHOUSE_FILTER_TABS.includes(currentTab);
  const { locations, selectedLocationId, setSelectedLocationId } =
    useInventory();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isWarehouseMenuOpen, setIsWarehouseMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const warehouseMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (warehouseMenuRef.current && !warehouseMenuRef.current.contains(event.target as Node)) {
        setIsWarehouseMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsNotificationOpen(false);
        setIsWarehouseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Clean full name removing any accidentally baked-in role strings like "(Admin)"
  const cleanFullName = (user?.fullName || 'Vijay B').replace(/\s*\([^)]*\)/g, '').trim();

  const formattedRole =
    user?.role === 'super_admin'
      ? 'Super Admin'
      : user?.role === 'admin'
      ? 'Admin'
      : user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
      : 'Staff';

  const initials = cleanFullName
    ? cleanFullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const warehouseDisplayText =
    selectedLocationId === 'all' || !selectedLocation
      ? 'All Warehouses'
      : `${selectedLocation.code} : ${selectedLocation.name}`;

  return (
    <header className={`sticky top-0 ${isWarehouseMenuOpen || isUserMenuOpen || isNotificationOpen ? 'z-50' : 'z-40'} flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-[#16202E] bg-[#F1F3F7] dark:bg-[#0C1017] px-4 sm:px-6 transition-colors shrink-0`}>
      {/* Left Section: Mobile Menu Trigger & Warehouse Selector */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            aria-label="Toggle navigation drawer"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        )}

        {/* Multi-Warehouse Selector Custom Dropdown (Only on tabs where warehouse filtering is applicable) */}
        {showWarehouseSelector && (
          <div className="relative" ref={warehouseMenuRef}>
            <button
              type="button"
              onClick={() => setIsWarehouseMenuOpen((prev) => !prev)}
              aria-expanded={isWarehouseMenuOpen}
              aria-haspopup="listbox"
              className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 max-w-[210px] sm:max-w-[270px] cursor-pointer select-none text-left ${
                isWarehouseMenuOpen
                  ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-subtle'
                  : 'border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <IconWarehouse className={`h-3.5 w-3.5 shrink-0 ${isWarehouseMenuOpen ? 'text-teal-500' : 'text-slate-400'}`} />
              <span className="truncate flex-1 font-medium">{warehouseDisplayText}</span>
              <IconChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isWarehouseMenuOpen ? 'rotate-180 text-teal-500' : ''
                }`}
              />
            </button>

            {/* Custom Dropdown Menu matching UI colors */}
            {isWarehouseMenuOpen && (
              <div
                role="listbox"
                className="absolute left-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-1.5 shadow-modal z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Select Warehouse
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {locations.length + 1} options
                  </span>
                </div>

                {/* All Warehouses Option */}
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedLocationId === 'all'}
                  onClick={() => {
                    setSelectedLocationId('all');
                    setIsWarehouseMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    selectedLocationId === 'all'
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                        selectedLocationId === 'all'
                          ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconWarehouse className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          All Warehouses
                        </span>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 text-teal-700 dark:text-teal-400 shrink-0">
                          ALL
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                        Aggregated multi-location view
                      </div>
                    </div>
                  </div>
                  <div className="w-5 shrink-0 flex items-center justify-end ml-1.5">
                    {selectedLocationId === 'all' && (
                      <IconCheck className="h-4 w-4 text-teal-500" />
                    )}
                  </div>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

                {/* Location List */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                  {locations.map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedLocationId(loc.id);
                          setIsWarehouseMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                          isSelected
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <IconBuilding className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {loc.name}
                              </span>
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#0C1017] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                {loc.code}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                              {loc.address || 'Active warehouse facility'}
                            </div>
                          </div>
                        </div>
                        <div className="w-5 shrink-0 flex items-center justify-end ml-1.5">
                          {isSelected && (
                            <IconCheck className="h-4 w-4 text-teal-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section: Theme Toggle, Alerts, User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? (
            <IconSun className="h-4 w-4 text-amber-500" />
          ) : (
            <IconMoon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* Notifications & Alert Center */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            aria-label="Alerts"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              isNotificationOpen
                ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-subtle'
                : 'border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#131924] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <IconBell className="h-4 w-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-mono font-bold text-white ring-2 ring-white dark:ring-[#0C1017] shadow-sm animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            onNavigate={onNavigate}
            onUnreadCountChange={setUnreadNotificationCount}
          />
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors text-left"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-800 text-xs font-mono font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col text-left w-24 sm:w-28 min-w-0">
              <span
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate block"
                title={cleanFullName}
              >
                {cleanFullName}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate block">
                {formattedRole}
              </span>
            </div>
            <IconChevronDown
              className={`hidden lg:block h-3.5 w-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-1.5 shadow-modal z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 min-w-0">
                <span
                  className="text-xs font-bold text-slate-900 dark:text-white truncate min-w-0 flex-1 block"
                  title={cleanFullName}
                >
                  {cleanFullName}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
                  <IconShieldCheck className="h-3 w-3" />
                  <span>{formattedRole}</span>
                </span>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onNavigate) {
                      onNavigate('profile');
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <IconUser className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                >
                  <IconLogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out of Invenza</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
