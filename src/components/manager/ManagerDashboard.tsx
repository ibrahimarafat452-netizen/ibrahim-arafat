import React, { useState, useEffect } from 'react';
import { managerApi, formatMinutesArabic, formatArabicTime } from '../../lib/api.ts';
import { SystemNotification, CenterSettings } from '../../types.ts';
import {
  Sparkles,
  Users,
  UserCheck,
  UserX,
  LogOut,
  AlertCircle,
  Clock,
  Heart,
  Smile,
  Calendar,
  ArrowLeft,
  FileText,
  Settings as SettingsIcon,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ManagerDashboardProps {
  onNavigate: (tab: 'dashboard' | 'specialists' | 'monitoring' | 'reports' | 'settings') => void;
  onOpenNotifications: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  onNavigate,
  onOpenNotifications,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    today: string;
    cairoTime: string;
    todayFormatted: string;
    dayName: string;
    stats: {
      totalActiveSpecialists: number;
      expectedTodayCount: number;
      checkedInCount: number;
      checkedOutCount: number;
      explicitlyAbsentCount: number;
      notRegisteredCount: number;
      totalSessionsToday: number;
      totalDurationMinutesToday: number;
    };
    settings: CenterSettings;
    notifications: SystemNotification[];
    unreadNotificationsCount: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const res = await managerApi.getDashboard();
      setData(res);
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'فشل جلب بيانات لوحة التحكم');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 8 seconds for live monitoring
    const timer = setInterval(() => fetchDashboard(true), 8000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">جاري تجهيز لوحة إدارة المركز...</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        {/* Decorative background shapes */}
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-52 h-52 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-black mb-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>لوحة الإشراف والمتابعة المركزية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              أهلاً بكِ في {data?.settings?.centerName || 'مركز بصمة أمل للتخاطب'} 🎈
            </h2>
            <p className="text-sm sm:text-base text-cyan-50 font-medium mt-1">
              {data?.settings?.supervisorName} | يوم {data?.dayName}، {data?.todayFormatted}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => fetchDashboard()}
              className="py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-xs font-black text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>تحديث البيانات الحية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Missing Registration Warning Alert Banner (if any) */}
      {(data?.unreadNotificationsCount || 0) > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse-subtle">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-amber-950">
                تنبيه: يوجد {data?.unreadNotificationsCount} حالات عدم تسجيل أو تأخر اليوم!
              </h4>
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                تأكد من تسجيل الحضور والانصراف وجلسات أخصائيي المركز المجدولين اليوم بتوقيت القاهرة.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNotifications}
            className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            عرض تنبيهات المتابعة ({data?.unreadNotificationsCount})
          </button>
        </div>
      )}

      {/* 7 Key Center KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Active Specialists */}
        <div
          onClick={() => onNavigate('specialists')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-cyan-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي الأخصائيين النشطين</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-cyan-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.totalActiveSpecialists || 0}
          </div>
          <div className="text-[11px] font-bold text-cyan-600 mt-1 flex items-center gap-1">
            <span>مجدول للعمل اليوم: {stats?.expectedTodayCount || 0}</span>
          </div>
        </div>

        {/* 2. Checked In */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-teal-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">سجلوا الحضور اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5 text-teal-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-700">
            {stats?.checkedInCount || 0}
          </div>
          <div className="text-[11px] font-bold text-teal-600 mt-1">
            أخصائيون متواجدون في المركز
          </div>
        </div>

        {/* 3. Checked Out */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-sky-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">سجلوا الانصراف</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LogOut className="w-5 h-5 text-sky-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-700">
            {stats?.checkedOutCount || 0}
          </div>
          <div className="text-[11px] font-bold text-sky-600 mt-1">
            أتموا دوام اليوم بالكامل
          </div>
        </div>

        {/* 4. Explicitly Absent */}
        <div
          onClick={() => onNavigate('monitoring')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-rose-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">غائبون رسمياً (اعتذار)</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserX className="w-5 h-5 text-rose-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700">
            {stats?.explicitlyAbsentCount || 0}
          </div>
          <div className="text-[11px] font-bold text-rose-600 mt-1">
            غياب مسجل ومعتذر رسمياً
          </div>
        </div>

        {/* 5. Not Registered Yet (Important distinguishing metric!) */}
        <div
          onClick={() => onNavigate('monitoring')}
          className={`rounded-3xl p-5 shadow-xs border transition-all cursor-pointer group ${
            (stats?.notRegisteredCount || 0) > 0
              ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/70'
              : 'bg-white border-slate-100 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-amber-900">لم يسجلوا الحضور بعد</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900">
            {stats?.notRegisteredCount || 0}
          </div>
          <div className="text-[11px] font-bold text-amber-700 mt-1">
            مجدولون اليوم ولم يسجلوا بعد
          </div>
        </div>

        {/* 6. Total Therapy Sessions Today */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-cyan-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي جلسات اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smile className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-700">
            {stats?.totalSessionsToday || 0}
          </div>
          <div className="text-[11px] font-bold text-cyan-600 mt-1">
            جلسات منجزة مع الأطفال اليوم
          </div>
        </div>

        {/* 7. Total Duration Today */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 hover:border-amber-200 transition-all cursor-pointer group col-span-2 sm:col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي زمن التدريب اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950">
            {formatMinutesArabic(stats?.totalDurationMinutesToday || 0)}
          </div>
          <div className="text-[11px] font-bold text-amber-700 mt-1">
            ({stats?.totalDurationMinutesToday || 0} دقيقة جلسات علاجية مسجلة)
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('monitoring')}
          className="p-5 rounded-3xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-all text-right shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm">المتابعة اليومية الحية</div>
              <div className="text-xs text-slate-500">متابعة حضور كل أخصائي وجلساته</div>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:-translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigate('specialists')}
          className="p-5 rounded-3xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-all text-right shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm">إدارة الأخصائيين</div>
              <div className="text-xs text-slate-500">إضافة وتعديل وبيانات الدخول</div>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:-translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="p-5 rounded-3xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-all text-right shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm">التقارير والإحصائيات</div>
              <div className="text-xs text-slate-500">تقارير يومية وشهرية وطباعة A4</div>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:-translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="p-5 rounded-3xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-all text-right shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm">إعدادات المركز</div>
              <div className="text-xs text-slate-500">ساعات العمل وتنبيهات التأخر</div>
            </div>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:-translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );
};
