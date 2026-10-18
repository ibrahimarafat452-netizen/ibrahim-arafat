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
  X,
  RotateCcw,
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

  // Time writing inputs state
  const [checkInTimeInput, setCheckInTimeInput] = useState('');
  const [checkOutTimeInput, setCheckOutTimeInput] = useState('');
  const [attendanceNotesInput, setAttendanceNotesInput] = useState('');
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [hasInitializedTimes, setHasInitializedTimes] = useState(false);

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

      // Initialize inputs on first load or when user is not manually editing
      if (!isBackground || !hasInitializedTimes) {
        if (data.attendance?.checkInTime) {
          setCheckInTimeInput(data.attendance.checkInTime.slice(0, 5));
        } else if (data.cairoTime) {
          setCheckInTimeInput(data.cairoTime.slice(0, 5));
        }

        if (data.attendance?.checkOutTime) {
          setCheckOutTimeInput(data.attendance.checkOutTime.slice(0, 5));
        }

        if (data.attendance?.notes) {
          setAttendanceNotesInput(data.attendance.notes);
        }
        setHasInitializedTimes(true);
      }
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

  // Quick preset helpers
  const setCurrentTimeToCheckIn = () => {
    if (todayData?.cairoTime) {
      setCheckInTimeInput(todayData.cairoTime.slice(0, 5));
    } else {
      const now = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
      setCheckInTimeInput(now);
    }
  };

  const setCurrentTimeToCheckOut = () => {
    if (todayData?.cairoTime) {
      setCheckOutTimeInput(todayData.cairoTime.slice(0, 5));
    } else {
      const now = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
      setCheckOutTimeInput(now);
    }
  };

  const calculateWorkDuration = (inTime?: string | null, outTime?: string | null) => {
    if (!inTime || !outTime) return null;
    const [h1, m1] = inTime.split(':').map(Number);
    const [h2, m2] = outTime.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return formatMinutesArabic(diff);
  };

  // Handle saving Check-in time
  const handleSaveCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkInTimeInput.trim()) {
      setError('يرجى كتابة موعد الحضور أولاً.');
      return;
    }
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      await specialistApi.checkIn({
        checkInTime: checkInTimeInput.trim(),
        notes: attendanceNotesInput.trim() || undefined,
      });
      setSuccessMessage(`تم تسجيل موعد حضورك في الساعة (${formatArabicTime(checkInTimeInput)}) بنجاح! 🎈`);

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#fbbf24'],
        });
      } catch (_) {}

      setIsEditingAttendance(false);
      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل موعد الحضور');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Handle saving Check-out time
  const handleSaveCheckOut = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkOutTimeInput.trim()) {
      setError('يرجى كتابة موعد الانصراف أولاً.');
      return;
    }
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      await specialistApi.checkOut({
        checkOutTime: checkOutTimeInput.trim(),
      });
      setSuccessMessage(`تم تسجيل موعد انصرافك في الساعة (${formatArabicTime(checkOutTimeInput)}) بنجاح. شكراً لجهودك العظيمة اليوم! 🌟`);

      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#3b82f6', '#ec4899'],
        });
      } catch (_) {}

      setIsEditingAttendance(false);
      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل موعد الانصراف');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Handle saving both attendance & departure times together
  const handleSaveBothTimes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkInTimeInput.trim() && !checkOutTimeInput.trim()) {
      setError('يرجى كتابة موعد الحضور أو موعد الانصراف.');
      return;
    }
    try {
      setIsSubmittingAttendance(true);
      setError(null);
      await specialistApi.saveAttendanceTimes({
        checkInTime: checkInTimeInput.trim() || undefined,
        checkOutTime: checkOutTimeInput.trim() || undefined,
        notes: attendanceNotesInput.trim() || undefined,
      });
      setSuccessMessage('تم حفظ وتثبيت مواعيد الحضور والانصراف بنجاح! 🌟');

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#fbbf24'],
        });
      } catch (_) {}

      setIsEditingAttendance(false);
      await loadTodayData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ مواعيد الدوام');
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

        {/* Attendance Details & Time Entry Form */}
        <div className="mt-6">
          {/* Form Mode: Used when not registered yet OR when editing times */}
          {(isNotRegistered || isEditingAttendance) && (
            <div className="bg-gradient-to-br from-amber-50/70 via-cyan-50/40 to-teal-50/60 rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-amber-200/60">
                <div>
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-600" />
                    <span>كتابة وتحديد مواعيد الحضور والانصراف</span>
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    اكتب موعد حضورك وانصرافك بالوقت الدقيق بدلاً من الاعتماد على زر التسجيل الفوري
                  </p>
                </div>
                {isEditingAttendance && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAttendance(false)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>إلغاء التعديل</span>
                  </button>
                )}
              </div>

              {/* Time inputs grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Check-in time input */}
                <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      <span>موعد الحضور (وقت البدء) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={setCurrentTimeToCheckIn}
                      className="text-[11px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="تعبئة الوقت الحالي تلقائياً"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-600" />
                      <span>الوقت الحالي الآن</span>
                    </button>
                  </div>

                  <input
                    type="time"
                    value={checkInTimeInput}
                    onChange={(e) => setCheckInTimeInput(e.target.value)}
                    className="w-full text-center text-xl font-black tracking-wider bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">صيغة 12 ساعة:</span>
                    <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                      {checkInTimeInput ? formatArabicTime(checkInTimeInput) : 'لم يُكتب بعد'}
                    </span>
                  </div>
                </div>

                {/* Check-out time input */}
                <div className="bg-white rounded-2xl p-4 border border-sky-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-sky-900 flex items-center gap-1.5">
                      <LogOut className="w-4 h-4 text-sky-600" />
                      <span>موعد الانصراف (وقت المغادرة)</span>
                    </label>
                    <button
                      type="button"
                      onClick={setCurrentTimeToCheckOut}
                      className="text-[11px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="تعبئة الوقت الحالي تلقائياً"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-600" />
                      <span>الوقت الحالي الآن</span>
                    </button>
                  </div>

                  <input
                    type="time"
                    value={checkOutTimeInput}
                    onChange={(e) => setCheckOutTimeInput(e.target.value)}
                    className="w-full text-center text-xl font-black tracking-wider bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">صيغة 12 ساعة:</span>
                    <span className="font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md">
                      {checkOutTimeInput ? formatArabicTime(checkOutTimeInput) : 'اختياري لوقت المغادرة'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="mb-5">
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية حول دوام اليوم (مثل: إذن تأخير معتمد، ظرف طارئ...)"
                  value={attendanceNotesInput}
                  onChange={(e) => setAttendanceNotesInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Action Buttons in Form */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {isEditingAttendance ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveBothTimes}
                      disabled={isSubmittingAttendance}
                      className="flex-1 py-3 px-5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ وتثبيت المواعيد المعدلة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAttendance(false)}
                      className="py-3 px-5 rounded-2xl font-bold text-sm text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <>
                    {/* Primary Button: Save Check-in only */}
                    <button
                      type="button"
                      onClick={() => handleSaveCheckIn()}
                      disabled={isSubmittingAttendance || !checkInTimeInput}
                      className="flex-1 py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <UserCheck className="w-5 h-5 text-white" />
                      <span>تثبيت موعد الحضور المكتوب</span>
                    </button>

                    {/* Secondary Button: Save both times together */}
                    {checkOutTimeInput && (
                      <button
                        type="button"
                        onClick={() => handleSaveBothTimes()}
                        disabled={isSubmittingAttendance}
                        className="py-3.5 px-5 rounded-2xl font-black text-sm text-sky-800 bg-sky-100 hover:bg-sky-200 border border-sky-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sky-600" />
                        <span>حفظ الحضور والانصراف معاً</span>
                      </button>
                    )}

                    {/* Absent Button */}
                    <button
                      type="button"
                      onClick={() => setShowAbsenceModal(true)}
                      disabled={isSubmittingAttendance}
                      className="py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                    >
                      <AlertOctagon className="w-4 h-4 text-rose-600" />
                      <span>تسجيل اعتذار / غياب</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Case 2: Checked In (Awaiting Check Out) - Active state when not editing */}
          {isCheckedIn && !isEditingAttendance && (
            <div className="bg-teal-50/60 rounded-3xl p-5 sm:p-6 border border-teal-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* Registered Check-in time display */}
                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-600" />
                      <span>موعد الحضور المكتوب والمسجل</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingAttendance(true)}
                      className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-200 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-cyan-600" />
                      <span>تعديل الموعد</span>
                    </button>
                  </div>
                  <div className="text-2xl font-black text-teal-950 mt-1 flex items-center gap-2">
                    <span>{formatArabicTime(attendance.checkInTime)}</span>
                  </div>
                  <p className="text-xs text-teal-700 mt-1 font-medium">
                    يمكنك الآن تسجيل وإضافة جلسات الأطفال خلال اليوم بحرية.
                  </p>
                </div>

                {/* Write Check-out time section */}
                <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl p-4 border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <LogOut className="w-4 h-4 text-amber-600" />
                      <span>اكتب موعد الانصراف لإنهاء اليوم:</span>
                    </label>
                    <button
                      type="button"
                      onClick={setCurrentTimeToCheckOut}
                      className="text-[11px] font-bold text-amber-800 bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      الوقت الحالي
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={checkOutTimeInput}
                      onChange={(e) => setCheckOutTimeInput(e.target.value)}
                      className="w-36 text-center text-lg font-black tracking-wider bg-white border border-amber-300 rounded-xl py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCheckOut()}
                      disabled={isSubmittingAttendance || !checkOutTimeInput}
                      className="flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تثبيت الانصراف</span>
                    </button>
                  </div>
                  {checkOutTimeInput && (
                    <div className="text-[11px] text-amber-800 font-bold mt-1.5 text-left">
                      الموعد: {formatArabicTime(checkOutTimeInput)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Case 3: Checked Out - Completed state when not editing */}
          {isCheckedOut && !isEditingAttendance && (
            <div className="bg-sky-50/70 rounded-3xl p-5 sm:p-6 border border-sky-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-sky-200/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-sky-600" />
                  <span className="text-sm font-black text-sky-950">
                    اكتمل يومك العلاجي وتم تثبيت مواعيد الحضور والانصراف
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAttendance(true)}
                  className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>تعديل المواعيد المكتوبة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500">موعد الحضور المسجل</span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatArabicTime(attendance.checkInTime)}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500">موعد الانصراف المسجل</span>
                  <div className="text-xl font-black text-sky-700 mt-1">
                    {formatArabicTime(attendance.checkOutTime)}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500">إجمالي وقت الدوام اليومي</span>
                  <div className="text-xl font-black text-teal-700 mt-1">
                    {calculateWorkDuration(attendance.checkInTime, attendance.checkOutTime) || '-'}
                  </div>
                </div>
              </div>

              {attendance.notes && (
                <div className="mt-3 text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-sky-100 font-medium">
                  ملاحظات: {attendance.notes}
                </div>
              )}
            </div>
          )}

          {/* Case 4: Absent when not editing */}
          {isAbsent && !isEditingAttendance && (
            <div className="bg-rose-50/70 rounded-3xl p-5 border border-rose-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-black text-rose-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>تم تسجيل هذا اليوم كغياب / اعتذار رسمي.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAttendance(true)}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-800 hover:bg-rose-100 text-xs font-bold border border-rose-200 cursor-pointer"
                >
                  إلغاء الغياب وكتابة موعد الحضور
                </button>
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
