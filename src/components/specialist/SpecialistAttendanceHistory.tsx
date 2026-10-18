import React, { useState, useEffect } from 'react';
import { AttendanceRecord, TherapySession } from '../../types.ts';
import { specialistApi, formatArabicTime, formatMinutesArabic } from '../../lib/api.ts';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Smile,
  Sparkles,
  Award,
} from 'lucide-react';

export const SpecialistAttendanceHistory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, TherapySession[]>>({});
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const res = await specialistApi.getHistory();
        setAttendances(res.attendances.sort((a, b) => b.date.localeCompare(a.date)));
        setSessionsByDate(res.sessionsByDate);
        setTotalSessions(res.totalSessions);
        setTotalMinutes(res.totalDurationMinutes);
      } catch (err) {
        console.error('Failed loading history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const presentDaysCount = attendances.filter(
    (a) => a.status === 'present' || a.status === 'checked_out'
  ).length;
  const absentDaysCount = attendances.filter((a) => a.status === 'absent').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-cyan-600" />
          <span>سجلي الشخصي</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mt-1">سجل الحضور والانصراف والجلسات</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          سجل حضورك وغيابك وأوقات الدوام الرسمية والجلسات المنجزة
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-emerald-800">أيام الحضور المسجلة</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
            {presentDaysCount} <span className="text-xs font-bold text-emerald-700">يوم</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-rose-800">أيام الاعتذار والغياب</span>
          <div className="text-xl sm:text-2xl font-black text-rose-950 mt-1">
            {absentDaysCount} <span className="text-xs font-bold text-rose-700">يوم</span>
          </div>
        </div>

        <div className="bg-cyan-50/70 border border-cyan-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-cyan-800">إجمالي الجلسات</span>
          <div className="text-xl sm:text-2xl font-black text-cyan-950 mt-1">
            {totalSessions} <span className="text-xs font-bold text-cyan-700">جلسة</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-amber-800">إجمالي وقت التدريب</span>
          <div className="text-lg sm:text-xl font-black text-amber-950 mt-1">
            {formatMinutesArabic(totalMinutes)}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 mb-4">تفاصيل الأيام السابقة</h3>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-bold">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            جاري تحميل السجلات...
          </div>
        ) : attendances.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Smile className="w-10 h-10 text-cyan-600 mx-auto mb-2" />
            <p className="font-bold text-slate-700">لا توجد سجلات حضور سابقة بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendances.map((rec) => {
              const daySessions = sessionsByDate[rec.date] || [];
              const dayMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

              return (
                <div
                  key={rec.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-800 font-black text-xs flex flex-col items-center justify-center shrink-0">
                      <span>{rec.date.substring(8, 10)}</span>
                      <span className="text-[9px] text-cyan-600">{rec.date.substring(5, 7)}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-base">{rec.date}</span>

                        {rec.status === 'present' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                            حاضر (قيد العمل)
                          </span>
                        )}
                        {rec.status === 'checked_out' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                            حاضر (انصراف مسجل)
                          </span>
                        )}
                        {rec.status === 'absent' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            غياب معتذر
                          </span>
                        )}
                      </div>

                      {/* Times */}
                      {rec.status !== 'absent' ? (
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-1.5 flex-wrap">
                          <span>
                            حضور:{' '}
                            <strong className="text-slate-800">{formatArabicTime(rec.checkInTime)}</strong>
                          </span>
                          <span>
                            انصراف:{' '}
                            <strong className="text-slate-800">
                              {rec.checkOutTime ? formatArabicTime(rec.checkOutTime) : 'لم يسجل بعد'}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-rose-600 mt-1">
                          سبب الغياب: {rec.notes || 'غير محدد'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sessions on that day */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200/80 shrink-0 text-left sm:text-right">
                    <div className="text-xs font-bold text-slate-700">
                      {daySessions.length} جلسات مسجلة
                    </div>
                    <div className="text-[11px] font-semibold text-cyan-700">
                      {formatMinutesArabic(dayMinutes)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
