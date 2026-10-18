import React from 'react';
import { SystemNotification } from '../../types.ts';
import { managerApi } from '../../lib/api.ts';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  UserX,
  FileQuestion,
  Check,
  ExternalLink,
} from 'lucide-react';

interface NotificationsModalProps {
  notifications: SystemNotification[];
  onClose: () => void;
  onRefresh: () => void;
  onSelectSpecialist?: (specialistId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onRefresh,
  onSelectSpecialist,
}) => {
  const handleDismiss = async (id: string) => {
    try {
      await managerApi.dismissNotification(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const activeNotifs = notifications.filter((n) => !n.isDismissed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-['Cairo',sans-serif]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-amber-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-black">تنبيهات المتابعة وعدم التسجيل</h3>
              <p className="text-xs text-cyan-100">
                متابعة الحضور والانصراف والجلسات المفقودة للأخصائيين
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {activeNotifs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">لا توجد تنبيهات نشطة حالياً</h4>
              <p className="text-xs text-slate-400 mt-1">
                جميع الأخصائيين المجدولين اليوم قاموا بالتسجيل بشكل منتظم! 🎈
              </p>
            </div>
          ) : (
            activeNotifs.map((notif) => {
              const isHigh = notif.severity === 'high';
              const isMedium = notif.severity === 'medium';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isHigh
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : isMedium
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-sky-50/80 border-sky-200 text-sky-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isHigh
                            ? 'bg-rose-200 text-rose-700'
                            : isMedium
                            ? 'bg-amber-200 text-amber-700'
                            : 'bg-sky-200 text-sky-700'
                        }`}
                      >
                        {notif.type === 'missing_check_in' && <UserX className="w-5 h-5" />}
                        {notif.type === 'missing_check_out' && <Clock className="w-5 h-5" />}
                        {notif.type === 'missing_sessions' && <FileQuestion className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold">{notif.title}</h4>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isHigh
                                ? 'bg-rose-200 text-rose-800'
                                : isMedium
                                ? 'bg-amber-200 text-amber-800'
                                : 'bg-sky-200 text-sky-800'
                            }`}
                          >
                            {notif.specialistName}
                          </span>
                        </div>
                        <p className="text-xs font-semibold mt-1 leading-relaxed text-slate-700">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => handleDismiss(notif.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50"
                      title="تجاهل التنبيه"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action Link */}
                  {onSelectSpecialist && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex justify-end">
                      <button
                        onClick={() => {
                          onSelectSpecialist(notif.specialistId);
                          onClose();
                        }}
                        className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>عرض ملف وسجل الأخصائي</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>يتم احتساب التنبيهات تلقائياً وفق أوقات العمل بتوقيت القاهرة</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
