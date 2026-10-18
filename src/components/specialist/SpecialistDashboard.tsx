import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { AttendanceRecord, TherapySession } from '../../types.ts';
import { specialistApi, formatMinutesArabic, formatArabicTime } from '../../lib/api.ts';
import { AddEditSessionModal } from './AddEditSessionModal.tsx';
import {
  Sparkles,
  Clock,
  UserCheck,
  LogOut,
  AlertOctagon,
  Plus,
  Edit2,
  Trash2,
  Heart,
  Smile,
  Calendar,
  CheckCircle2,
  Award,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpecialistDashboardProps {
  onNavigateToSessions?: () => void;
  onNavigateToAttendance?: () => void;
}

export const SpecialistDashboard: React.FC<SpecialistDashboardProps> = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<{
    today: string;
    cairoTime: string;
    todayFormatted: string;
    attendance: AttendanceRecord | null;
    sessions: TherapySession[];
    totalSessions: number;
    totalDurationMinutes: number;
  } | null>(null);

  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Absence modal
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');

  // Add/Edit Session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TherapySession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const loadTodayData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const data = await specialistApi.getToday();
      setTodayData(data);
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'فشل تحميل بيانات اليوم');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
    // Auto refresh data every 8 seconds for live mobile tracking
    const timer = setInterval(() => loadTodayData(true), 8000);
    return () => clearInterval(timer);
  }, []);

  // Handle Check-in
  const handleCheckIn = async () => {
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      const res = await specialistApi.checkIn();
      setSuccessMessage('تم تسجيل حضورك بنجاح! نتمنى لك يوماً سعيداً مع الأطفال 🎈');

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#fbbf24'],
        });
      } catch (_) {}

      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الحضور');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Handle Check-out (Instant tap without blocking alerts)
  const handleCheckOut = async () => {
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      await specialistApi.checkOut();
      setSuccessMessage('تم تسجيل الانصراف بنجاح. شكراً لجهودك العظيمة مع أطفالنا اليوم! 🌟');

      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#3b82f6', '#ec4899'],
        });
      } catch (_) {}

      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الانصراف');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Handle Mark Absent
  const handleConfirmAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      await specialistApi.markAbsent(absenceReason.trim() || undefined);
      setShowAbsenceModal(false);
      setAbsenceReason('');
      setSuccessMessage('تم تسجيل الاعتذار / الغياب لهذا اليوم بنجاح.');
      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الغياب');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Delete session
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeletingSession(true);
      await specialistApi.deleteSession(sessionToDelete.id);
      setSuccessMessage(`تم حذف جلسة الطفل (${sessionToDelete.name}) بنجاح`);
      setSessionToDelete(null);
      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف الجلسة');
    } finally {
      setIsDeletingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">جاري تجهيز لوحة الأخصائي...</p>
      </div>
    );
  }

  const attendance = todayData?.attendance;
  const isCheckedIn = attendance?.status === 'present';
  const isCheckedOut = attendance?.status === 'checked_out';
  const isAbsent = attendance?.status === 'absent';
  const isNotRegistered = !attendance;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Cheerful Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        {/* Decorative background circles */}
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-52 h-52 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-black mb-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>أهلاً وسهلاً بك في يومك العلاجي</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              مرحباً {user?.name} 🎈
            </h2>
            <p className="text-sm sm:text-base text-cyan-50 font-medium mt-1">
              {user?.specialization} | مستعدون لصناعة فرق في حياة أبطالنا الصغار اليوم!
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-3 text-right shrink-0">
            <div className="text-xs font-semibold text-cyan-100 flex items-center gap-1.5 justify-end">
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>تاريخ اليوم (القاهرة)</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {todayData?.todayFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* Attendance Action & Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-100 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span>سجل حضور اليوم</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mt-1">حالة الحضور والانصراف</h3>
          </div>

          {/* Current Status Pill */}
          <div>
            {isNotRegistered && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                لم يتم تسجيل الحضور بعد
              </span>
            )}
            {isCheckedIn && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                حاضر وقيد العمل الآن
              </span>
            )}
            {isCheckedOut && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                تم إنهاء اليوم وتسجيل الانصراف
              </span>
            )}
            {isAbsent && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                مسجل كغائب لهذا اليوم
              </span>
            )}
          </div>
        </div>

        {/* Attendance Details & Action Buttons */}
        <div className="mt-6">
          {/* Case 1: Not Registered Yet */}
          {isNotRegistered && (
            <div className="bg-gradient-to-br from-amber-50/70 to-cyan-50/50 rounded-2xl p-5 border border-amber-200/60">
              <p className="text-sm text-slate-700 font-semibold mb-5 leading-relaxed">
                لم تسجل حضورك لهذا اليوم بعد. يرجى الضغط على زر الحضور لتسجيل موعد بدء العمل بتوقيت مصر، أو تسجيل اعتذار إذا كنت غائباً.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={handleCheckIn}
                  disabled={isSubmittingAttendance}
                  className="py-4 px-6 rounded-2xl font-black text-base text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70"
                >
                  <UserCheck className="w-5 h-5 text-white" />
                  <span>تسجيل الحضور الآن (Check In)</span>
                </button>

                <button
                  onClick={() => setShowAbsenceModal(true)}
                  disabled={isSubmittingAttendance}
                  className="py-4 px-6 rounded-2xl font-black text-base text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70"
                >
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>تسجيل غياب / اعتذار رسمي</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 2: Checked In (Awaiting Check Out) */}
          {isCheckedIn && (
            <div className="bg-teal-50/60 rounded-2xl p-5 border border-teal-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-teal-800">وقت الحضور المسجل</div>
                  <div className="text-2xl font-black text-teal-950 mt-1 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-teal-600" />
                    <span>{formatArabicTime(attendance.checkInTime)}</span>
                  </div>
                  <p className="text-xs text-teal-700 mt-1 font-medium">
                    يمكنك الآن تسجيل وإضافة جلسات الأطفال خلال اليوم بحرية.
                  </p>
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={isSubmittingAttendance}
                  className="py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shrink-0"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الانصراف وإنهاء اليوم (Check Out)</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Checked Out */}
          {isCheckedOut && (
            <div className="bg-sky-50/70 rounded-2xl p-5 border border-sky-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-3.5 border border-sky-100">
                  <span className="text-xs font-bold text-slate-500">وقت الحضور</span>
                  <div className="text-lg font-black text-slate-800 mt-1">
                    {formatArabicTime(attendance.checkInTime)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-sky-100">
                  <span className="text-xs font-bold text-slate-500">وقت الانصراف</span>
                  <div className="text-lg font-black text-slate-800 mt-1 text-sky-700">
                    {formatArabicTime(attendance.checkOutTime)}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-sky-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>اكتمل يومك العلاجي بنجاح وجميع السجلات محفوظة.</span>
              </div>
            </div>
          )}

          {/* Case 4: Absent */}
          {isAbsent && (
            <div className="bg-rose-50/70 rounded-2xl p-5 border border-rose-200">
              <div className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                <span>تم تسجيل هذا اليوم كغياب / اعتذار رسمي.</span>
              </div>
              {attendance.notes && (
                <div className="mt-2 text-xs font-semibold text-rose-700 bg-white/80 p-3 rounded-xl border border-rose-100">
                  سبب الاعتذار: {attendance.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Today's Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Sessions Count */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-100/80 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smile className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">جلسات الأطفال المكتملة اليوم</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {todayData?.totalSessions || 0}{' '}
              <span className="text-xs font-bold text-teal-700">جلسة</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Duration */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-100/80 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">إجمالي وقت الجلسات اليوم</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {formatMinutesArabic(todayData?.totalDurationMinutes || 0)}
            </div>
            <div className="text-[11px] font-bold text-slate-700">
              ({todayData?.totalDurationMinutes || 0} دقيقة تدريب)
            </div>
          </div>
        </div>

        {/* Metric 3: Target Indicator */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-amber-100/80 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-400 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-700 flex justify-between">
              <span>نشاط اليوم</span>
              <span className="text-cyan-700 font-extrabold">
                {todayData?.totalSessions || 0} / 4 جلسات
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-teal-400 to-cyan-500 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((todayData?.totalSessions || 0) / 4) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-700 mt-1 font-medium">
              {(todayData?.totalSessions || 0) >= 4 ? 'أحسنت! حققت المستهدف اليومي 🌟' : 'واصل العطاء للأبطال! 🎈'}
            </div>
          </div>
        </div>
      </div>

      {/* Therapy Sessions Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>جلسات الأطفال</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mt-1">سجل الجلسات العلاجية لليوم</h3>
          </div>

          <button
            onClick={() => {
              setEditingSession(null);
              setShowSessionModal(true);
            }}
            disabled={isAbsent}
            className="py-3 px-5 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة جلسة طفل جديدة</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="mt-5">
          {!todayData?.sessions || todayData.sessions.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-amber-200/80 bg-amber-50/20">
              <div className="w-16 h-16 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mx-auto mb-3">
                <Smile className="w-9 h-9 text-teal-600" />
              </div>
              <h4 className="text-base font-bold text-slate-800">لا توجد جلسات مسجلة اليوم حتى الآن</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                اضغط على زر "إضافة جلسة طفل جديدة" أعلاه لتدوين اسم الطفل والمدة والملاحظات بسرعة وسهولة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayData.sessions.map((sess, idx) => (
                <div
                  key={sess.id}
                  className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 font-black text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold text-slate-900">{sess.childName}</h4>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-800 bg-cyan-100/70 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-cyan-600" />
                          <span>{sess.durationMinutes} دقيقة</span>
                        </span>
                      </div>
                      {sess.notes && (
                        <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed bg-white/70 p-2 rounded-xl border border-slate-100">
                          {sess.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Edit / Delete actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => {
                        setEditingSession(sess);
                        setShowSessionModal(true);
                      }}
                      className="p-2 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors"
                      title="تعديل الجلسة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSessionToDelete({ id: sess.id, name: sess.childName })}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      title="حذف الجلسة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Absence Confirmation Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-['Cairo',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 text-white" />
                <h3 className="text-lg font-black">تسجيل غياب / اعتذار رسمي</h3>
              </div>
              <button
                onClick={() => setShowAbsenceModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAbsence} className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                سيتم تسجيلك رسمياً كغائب لهذا اليوم بتوقيت المركز. يرجى تدوين سبب الاعتذار للإدارة (اختياري):
              </p>

              <div>
                <textarea
                  rows={3}
                  placeholder="مثال: ظرف صحي طارئ / إجازة عارضة..."
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold bg-slate-50/50 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAttendance}
                  className="flex-1 py-3 px-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmittingAttendance ? 'جاري التسجيل...' : 'تأكيد تسجيل الغياب'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="py-3 px-5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Session Modal */}
      {showSessionModal && (
        <AddEditSessionModal
          sessionToEdit={editingSession}
          onClose={() => {
            setShowSessionModal(false);
            setEditingSession(null);
          }}
          onSuccess={() => {
            loadTodayData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">تأكيد حذف الجلسة</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جلسة الطفل{' '}
                <span className="font-extrabold text-slate-800">({sessionToDelete.name})</span>؟
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={confirmDeleteSession}
                disabled={isDeletingSession}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeletingSession ? 'جاري الحذف...' : 'نعم، حذف الجلسة'}
              </button>
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeletingSession}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
