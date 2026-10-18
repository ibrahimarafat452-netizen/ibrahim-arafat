import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  Bell,
  LogOut,
  Clock,
  Calendar,
  UserCheck,
  Shield,
  Heart,
  Smile,
  LayoutDashboard,
  Users,
  FileText,
  Settings as SettingsIcon,
} from 'lucide-react';
import { formatArabicTime } from '../lib/api.ts';

interface HeaderProps {
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  managerTab?: 'dashboard' | 'specialists' | 'monitoring' | 'reports' | 'settings';
  setManagerTab?: (tab: 'dashboard' | 'specialists' | 'monitoring' | 'reports' | 'settings') => void;
  specialistTab?: 'dashboard' | 'sessions' | 'attendance';
  setSpecialistTab?: (tab: 'dashboard' | 'sessions' | 'attendance') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  unreadNotificationsCount = 0,
  managerTab = 'dashboard',
  setManagerTab,
  specialistTab = 'dashboard',
  setSpecialistTab,
}) => {
  const { user, logout, settings } = useAuth();
  const [cairoClock, setCairoClock] = useState<string>('');

  // Live ticking Cairo clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      setCairoClock(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const centerTitle = settings?.centerName || 'مؤسسة الدكتورة نسيبه مرعي';
  const supervisor = settings?.supervisorName || 'تحت إشراف د. نسيبة مرعي';

  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-18">
          {/* Logo & Center Title */}
          <div className="flex items-center space-x-reverse space-x-2.5 sm:space-x-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-amber-300 p-0.5 shadow-xs flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-cyan-600">
                <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 stroke-[2.2]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 tracking-tight leading-tight truncate">
                  {centerTitle}
                </h1>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  مصر
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-teal-700 hidden sm:flex items-center gap-1">
                <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                <span className="truncate">{supervisor}</span>
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Integrated inside Header - No separate bar needed!) */}
          <div className="hidden md:flex items-center space-x-reverse space-x-1 lg:space-x-1.5 mx-2">
            {user?.role === 'manager' && setManagerTab && (
              <>
                <button
                  type="button"
                  onClick={() => setManagerTab('dashboard')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    managerTab === 'dashboard'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>الرئيسية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerTab('monitoring')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    managerTab === 'monitoring'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>المتابعة اليومية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerTab('specialists')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    managerTab === 'specialists'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>الأخصائيون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerTab('reports')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    managerTab === 'reports'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>التقارير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerTab('settings')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    managerTab === 'settings'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>الإعدادات</span>
                </button>
              </>
            )}

            {user?.role === 'specialist' && setSpecialistTab && (
              <>
                <button
                  type="button"
                  onClick={() => setSpecialistTab('dashboard')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    specialistTab === 'dashboard'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>لوحتي اليوم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpecialistTab('sessions')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    specialistTab === 'sessions'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>جلساتي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSpecialistTab('attendance')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    specialistTab === 'attendance'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>سجل حضوري</span>
                </button>
              </>
            )}
          </div>

          {/* Center Info: Cairo Clock & Actions */}
          <div className="flex items-center space-x-reverse space-x-1.5 sm:space-x-3 shrink-0">
            {/* Cairo Clock Widget */}
            <div className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-cyan-50 to-amber-50/50 border border-cyan-200/60 rounded-xl px-2.5 py-1 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-700 font-mono" dir="ltr">
                  {formatArabicTime(cairoClock)}
                </div>
                <div className="text-[9px] text-slate-600 font-medium">القاهرة</div>
              </div>
            </div>

            {/* Notifications Bell (for manager) */}
            {user?.role === 'manager' && onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 transition-all border border-slate-200/80 active:scale-95 cursor-pointer"
                title="التنبيهات وسجلات المتابعة"
                aria-label="التنبيهات"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-bounce shadow-xs">
                    {unreadNotificationsCount > 9 ? '+9' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile Pill */}
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200/90 rounded-xl p-1 pr-2 sm:pr-2.5">
                <div className="hidden sm:block text-right max-w-[100px] md:max-w-[120px]">
                  <div className="text-xs font-bold text-slate-800 truncate">{user.name}</div>
                  <div className="text-[9px] font-semibold text-teal-700 flex items-center gap-0.5 justify-end">
                    {user.role === 'manager' ? (
                      <>
                        <Shield className="w-2.5 h-2.5 text-amber-500" />
                        <span>إدارة</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-2.5 h-2.5 text-cyan-600" />
                        <span>أخصائي</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  {user.name.charAt(0)}
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
