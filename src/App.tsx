import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { SpecialistDashboard } from './components/specialist/SpecialistDashboard.tsx';
import { SpecialistSessions } from './components/specialist/SpecialistSessions.tsx';
import { SpecialistAttendanceHistory } from './components/specialist/SpecialistAttendanceHistory.tsx';
import { ManagerDashboard } from './components/manager/ManagerDashboard.tsx';
import { SpecialistsList } from './components/manager/SpecialistsList.tsx';
import { DailyMonitoring } from './components/manager/DailyMonitoring.tsx';
import { ReportsAndStatistics } from './components/manager/ReportsAndStatistics.tsx';
import { CenterSettingsView } from './components/manager/CenterSettingsView.tsx';
import { NotificationsModal } from './components/manager/NotificationsModal.tsx';
import { managerApi } from './lib/api.ts';
import { SystemNotification } from './types.ts';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Settings,
  Smile,
  Calendar,
  Clock,
  Heart,
  Award,
} from 'lucide-react';

type ManagerTab = 'dashboard' | 'specialists' | 'monitoring' | 'reports' | 'settings';
type SpecialistTab = 'dashboard' | 'sessions' | 'attendance';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Navigation states
  const [managerTab, setManagerTab] = useState<ManagerTab>('dashboard');
  const [specialistTab, setSpecialistTab] = useState<SpecialistTab>('dashboard');

  // Notifications modal for manager
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (user?.role !== 'manager') return;
    try {
      const res = await managerApi.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      // Periodic background sync failed silently
    }
  };

  useEffect(() => {
    if (user?.role === 'manager') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex flex-col items-center justify-center font-['Cairo',sans-serif]">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-amber-400 p-1 flex items-center justify-center animate-bounce shadow-lg mb-4">
          <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center text-cyan-600">
            <Smile className="w-8 h-8 text-teal-600" />
          </div>
        </div>
        <h2 className="text-lg font-black text-slate-800">مركز بصمة أمل للتخاطب</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">جاري تجهيز النظام...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-['Cairo',sans-serif] selection:bg-cyan-200">
      {/* Header with integrated desktop navigation (No separate top bar) */}
      <Header
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={unreadCount}
        managerTab={managerTab}
        setManagerTab={setManagerTab}
        specialistTab={specialistTab}
        setSpecialistTab={setSpecialistTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8">
        {user.role === 'manager' ? (
          <>
            {managerTab === 'dashboard' && (
              <ManagerDashboard
                onNavigate={(tab) => setManagerTab(tab)}
                onOpenNotifications={() => setShowNotifications(true)}
              />
            )}
            {managerTab === 'specialists' && <SpecialistsList />}
            {managerTab === 'monitoring' && <DailyMonitoring />}
            {managerTab === 'reports' && <ReportsAndStatistics />}
            {managerTab === 'settings' && <CenterSettingsView />}
          </>
        ) : (
          <>
            {specialistTab === 'dashboard' && (
              <SpecialistDashboard
                onNavigateToSessions={() => setSpecialistTab('sessions')}
                onNavigateToAttendance={() => setSpecialistTab('attendance')}
              />
            )}
            {specialistTab === 'sessions' && <SpecialistSessions />}
            {specialistTab === 'attendance' && <SpecialistAttendanceHistory />}
          </>
        )}
      </main>

      {/* Manager Notifications Modal */}
      {showNotifications && user.role === 'manager' && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onRefresh={fetchNotifications}
          onSelectSpecialist={(specId) => {
            setManagerTab('specialists');
          }}
        />
      )}

      {/* Mobile Bottom Navigation for Manager */}
      {user.role === 'manager' && (
        <div className="no-print md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-2 flex items-center justify-around pb-safe">
          <button
            type="button"
            onClick={() => setManagerTab('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              managerTab === 'dashboard'
                ? 'text-cyan-700 font-black bg-cyan-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('monitoring')}
            className={`flex-1 relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              managerTab === 'monitoring'
                ? 'text-teal-700 font-black bg-teal-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="relative">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-1 ring-white">
                  !
                </span>
              )}
            </div>
            <span>المتابعة</span>
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('specialists')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              managerTab === 'specialists'
                ? 'text-cyan-700 font-black bg-cyan-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>الأخصائيين</span>
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('reports')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              managerTab === 'reports'
                ? 'text-amber-700 font-black bg-amber-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>التقارير</span>
          </button>

          <button
            type="button"
            onClick={() => setManagerTab('settings')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-bold py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
              managerTab === 'settings'
                ? 'text-rose-700 font-black bg-rose-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>الإعدادات</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation for Specialist */}
      {user.role === 'specialist' && (
        <div className="no-print md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-2 flex items-center justify-around pb-safe">
          <button
            type="button"
            onClick={() => setSpecialistTab('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
              specialistTab === 'dashboard'
                ? 'text-cyan-700 font-black bg-cyan-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>لوحتي</span>
          </button>

          <button
            type="button"
            onClick={() => setSpecialistTab('sessions')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
              specialistTab === 'sessions'
                ? 'text-teal-700 font-black bg-teal-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smile className="w-5 h-5" />
            <span>جلساتي</span>
          </button>

          <button
            type="button"
            onClick={() => setSpecialistTab('attendance')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-bold py-1.5 px-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
              specialistTab === 'attendance'
                ? 'text-amber-700 font-black bg-amber-50 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>حضوري</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
