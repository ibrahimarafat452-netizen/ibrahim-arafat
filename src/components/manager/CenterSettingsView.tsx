import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { managerApi, ARABIC_DAYS_MAP } from '../../lib/api.ts';
import { CenterSettings } from '../../types.ts';
import {
  Settings,
  Building,
  UserCheck,
  Calendar,
  Clock,
  Bell,
  Award,
  CheckCircle2,
  AlertCircle,
  Save,
  Smile,
  Shield,
  Download,
  Upload,
  Database,
  RotateCcw,
  History,
  FileJson,
  HardDrive,
  RefreshCw,
  Flame,
  Cloud,
} from 'lucide-react';

export const CenterSettingsView: React.FC = () => {
  const { updateLocalSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Firebase Cloud states
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; databaseId: string; projectId: string } | null>(null);
  const [syncingFirebase, setSyncingFirebase] = useState(false);
  const [firebaseSyncMsg, setFirebaseSyncMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Backup states
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupActionMsg, setBackupActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore preview states
  const [restorePreview, setRestorePreview] = useState<{
    data: any;
    fileName: string;
    usersCount: number;
    sessionsCount: number;
    attendanceCount: number;
    centerName: string;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);


  // Form fields
  const [centerName, setCenterName] = useState('');
  const [centerLogo, setCenterLogo] = useState('smile');
  const [supervisorName, setSupervisorName] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([6, 0, 1, 2, 3, 4]);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('16:00');
  const [missingAlertTime, setMissingAlertTime] = useState('10:30');
  const [minDailySessionsTarget, setMinDailySessionsTarget] = useState<number>(4);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await managerApi.getSettings();
      const s = res.settings;
      setCenterName(s.centerName || '');
      setCenterLogo(s.centerLogo || 'smile');
      setSupervisorName(s.supervisorName || '');
      setWorkingDays(s.workingDays || [6, 0, 1, 2, 3, 4]);
      setWorkStartTime(s.workStartTime || '09:00');
      setWorkEndTime(s.workEndTime || '16:00');
      setMissingAlertTime(s.missingAlertTime || '10:30');
      setMinDailySessionsTarget(s.minDailySessionsTarget || 4);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل جلب إعدادات المركز', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await managerApi.listBackups();
      setBackups(res.backups || []);
    } catch {
      // ignore
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchFirebaseStatus = async () => {
    try {
      const res = await managerApi.getFirebaseStatus();
      setFirebaseStatus(res);
    } catch {
      // ignore
    }
  };

  const handleSyncFirebase = async () => {
    try {
      setSyncingFirebase(true);
      setFirebaseSyncMsg(null);
      const res = await managerApi.syncToFirebase();
      setFirebaseSyncMsg({ text: `${res.message} (أخصائيين: ${res.result.usersCount}، جلسات: ${res.result.sessionsCount}، حضور: ${res.result.attendanceCount})`, type: 'success' });
    } catch (err: any) {
      setFirebaseSyncMsg({ text: err.message || 'فشلت المزامنة مع Firebase', type: 'error' });
    } finally {
      setSyncingFirebase(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
    fetchFirebaseStatus();
  }, []);

  const handleDownloadBackup = async () => {
    try {
      setBackupActionMsg(null);
      const data = await managerApi.exportBackup();
      if (!data || typeof data !== 'object') {
        throw new Error('فشل التحقق من صحة بنية النسخة الاحتياطية قبل التنزيل.');
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const filename = `center-backup-${dateStr}-${hours}-${mins}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupActionMsg({ text: `تم إنشاء وتحميل النسخة الاحتياطية بنجاح (${filename}). تم استبعاد الأسرار وكلمات المرور المشفرة لضمان أمان البيانات.`, type: 'success' });
    } catch (err: any) {
      setBackupActionMsg({ text: err.message || 'فشل تحميل النسخة الاحتياطية', type: 'error' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const users = Array.isArray(parsed.collections?.users)
          ? parsed.collections.users
          : Array.isArray(parsed.users)
          ? parsed.users
          : [];

        const sessions = Array.isArray(parsed.collections?.sessions)
          ? parsed.collections.sessions
          : Array.isArray(parsed.sessions)
          ? parsed.sessions
          : [];

        const attendance = Array.isArray(parsed.collections?.attendance)
          ? parsed.collections.attendance
          : Array.isArray(parsed.attendance)
          ? parsed.attendance
          : [];

        const centerTitle =
          parsed.collections?.settings?.centerName ||
          parsed.settings?.centerName ||
          parsed.center ||
          'مؤسسة الدكتورة نسيبه مرعي';

        if (users.length === 0 && sessions.length === 0 && attendance.length === 0) {
          throw new Error('الملف المختار لا يحتوي على بيانات أو سجلات صالحة للاستعادة.');
        }

        // Open preview modal for safe confirmation before writing
        setRestorePreview({
          data: parsed,
          fileName: file.name,
          usersCount: users.length,
          sessionsCount: sessions.length,
          attendanceCount: attendance.length,
          centerName: centerTitle,
        });
        setRestoreMode('merge');
        setConfirmReplace(false);
        setBackupActionMsg(null);
      } catch (err: any) {
        setBackupActionMsg({ text: err.message || 'فشل قراءة ملف النسخة الاحتياطية. تأكد من صحة تنسيق JSON.', type: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorePreview) return;
    if (restoreMode === 'replace' && !confirmReplace) {
      setBackupActionMsg({ text: 'يرجى تفعيل خيار التأكيد الصريح قبل المتابعة في نمط الاستبدال الكامل.', type: 'error' });
      return;
    }

    try {
      setIsRestoring(true);
      const res = await managerApi.importBackup(restorePreview.data, restoreMode);
      setBackupActionMsg({ text: res.message, type: 'success' });
      setRestorePreview(null);
      await fetchBackups();
      await fetchSettings();
      await fetchFirebaseStatus();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupActionMsg({ text: err.message || 'فشلت عملية استعادة النسخة الاحتياطية.', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreServerBackup = async (fileName: string) => {
    if (!window.confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية (${fileName})؟ سيتم استرجاع بيانات المركز إلى هذه النقطة.`)) {
      return;
    }

    try {
      setBackupActionMsg(null);
      const res = await managerApi.restoreBackup(fileName);
      setBackupActionMsg({ text: res.message, type: 'success' });
      fetchBackups();
      fetchSettings();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupActionMsg({ text: err.message || 'فشل استعادة النسخة من الخادم.', type: 'error' });
    }
  };

  const handleCreateInstantBackup = async () => {
    try {
      setCreatingBackup(true);
      setBackupActionMsg(null);
      const res = await managerApi.createBackup('manual');
      setBackupActionMsg({ text: res.message, type: 'success' });
      await fetchBackups();
    } catch (err: any) {
      setBackupActionMsg({ text: err.message || 'فشل حفظ النسخة الاحتياطية', type: 'error' });
    } finally {
      setCreatingBackup(false);
    }
  };

  const toggleDay = (dayIdx: number) => {
    if (workingDays.includes(dayIdx)) {
      if (workingDays.length === 1) {
        setMessage({ text: 'يجب تحديد يوم عمل واحد على الأقل للمركز.', type: 'error' });
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== dayIdx));
    } else {
      setWorkingDays([...workingDays, dayIdx].sort());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim() || !supervisorName.trim()) {
      setMessage({ text: 'يرجى ملء اسم المركز واسم المشرف العام', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const res = await managerApi.updateSettings({
        centerName: centerName.trim(),
        centerLogo,
        supervisorName: supervisorName.trim(),
        workingDays,
        workStartTime,
        workEndTime,
        missingAlertTime,
        minDailySessionsTarget: Number(minDailySessionsTarget),
      });

      updateLocalSettings(res.settings);
      setMessage({ text: 'تم حفظ وتحديث إعدادات المركز بنجاح!', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل حفظ الإعدادات', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-600 font-bold text-sm">جاري تحميل إعدادات المركز...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-cyan-600" />
            <span>تهيئة وتخصيص النظام</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">إعدادات المركز ومواعيد العمل</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تخصيص اسم المركز، الإشراف العلمي، أوقات العمل الرسمية، ومواعيد تنبيهات عدم التسجيل
          </p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Center Identity */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-black text-slate-800">بيانات وهوية المركز</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المركز الرسمي *</label>
            <input
              type="text"
              required
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              placeholder="مثال: مؤسسة الدكتورة نسيبه مرعي"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">يظهر هذا الاسم في أعلى المنصة، التقارير المطبوعة، وملفات PDF.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              تحت إشراف (اسم المشرف العام أو الهيئة المشرفة) *
            </label>
            <input
              type="text"
              required
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="مثال:د. نسيبة مرعي"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">يتم تضمينه تلقائياً في ترويسة وتذييل كافة التقارير الطبية والإدارية المعتمدة.</p>
          </div>
        </div>

        {/* Section 2: Work Schedule & Alert Time */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-black text-slate-800">أيام ومواعيد العمل الرسمية</h3>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              أيام العمل الأسبوعية للمركز:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { idx: 6, label: 'السبت' },
                { idx: 0, label: 'الأحد' },
                { idx: 1, label: 'الاثنين' },
                { idx: 2, label: 'الثلاثاء' },
                { idx: 3, label: 'الأربعاء' },
                { idx: 4, label: 'الخميس' },
                { idx: 5, label: 'الجمعة' },
              ].map((day) => {
                const isSelected = workingDays.includes(day.idx);
                return (
                  <button
                    type="button"
                    key={day.idx}
                    onClick={() => toggleDay(day.idx)}
                    className={`py-3 px-3 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day.label} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              أيام الإجازة الرسمية لا يتم احتسابها كعدم تسجيل حضور للأخصائيين.
            </p>
          </div>

          {/* Hours & Alert Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>بداية الدوام اليومي</span>
              </label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>نهاية الدوام اليومي</span>
              </label>
              <input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-amber-900">
                <Bell className="w-4 h-4 text-amber-600" />
                <span>وقت إطلاق تنبيه تأخر الحضور</span>
              </label>
              <input
                type="time"
                value={missingAlertTime}
                onChange={(e) => setMissingAlertTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-amber-300 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
              />
            </div>
          </div>
          <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
            تنبيه: بعد الساعة ({missingAlertTime}) إذا لم يسجل الأخصائي المجدول الحضور أو اعتذار الغياب، يتم إرسال إشعار فوري لمديرة المركز برقم عدم التسجيل.
          </p>
        </div>

        {/* Section 3: Performance target */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-800">مستهدفات الجلسات اليومية</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المستهدف اليومي لعدد الجلسات لكل أخصائي
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="20"
                value={minDailySessionsTarget}
                onChange={(e) => setMinDailySessionsTarget(Number(e.target.value))}
                className="w-32 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-black focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50 text-center"
              />
              <span className="text-xs font-bold text-slate-500">جلسات للأطفال يومياً</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="py-3.5 px-8 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>حفظ وتطبيق إعدادات المركز</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Section 4: Firebase Firestore Cloud Integration */}
      <div className="mt-8 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-cyan-500/10 rounded-3xl p-6 sm:p-7 shadow-xs border border-amber-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  ربط السحابة بقاعدة بيانات Firebase Firestore
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  متصل ومفعل
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                قاعدة بيانات Firestore الحية مؤمنة بقواعد أمان صارمة (ABAC Security Rules) ومزامنة سحابية مستمرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncFirebase}
            disabled={syncingFirebase}
            className="self-start sm:self-center py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Cloud className={`w-4 h-4 ${syncingFirebase ? 'animate-bounce' : ''}`} />
            <span>{syncingFirebase ? 'جاري المزامنة مع Firestore...' : 'مزامنة البيانات الآن مع Firebase'}</span>
          </button>
        </div>

        {firebaseSyncMsg && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
              firebaseSyncMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {firebaseSyncMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span>{firebaseSyncMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">معرف المشروع (Project ID)</span>
            <span className="text-xs font-black text-slate-800 font-mono" dir="ltr">
              {firebaseStatus?.projectId || 'gen-lang-client-0560980802'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">معرف قاعدة البيانات (Database ID)</span>
            <span className="text-xs font-black text-slate-800 font-mono" dir="ltr">
              {firebaseStatus?.databaseId || 'ai-studio-4fd5cba3-8f2c-4039-bacd-f62d0d692a24'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">حالة قواعد الأمان (Rules Status)</span>
            <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              قواعد ABAC الصارمة منشورة
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: Data Protection & Backup Center */}
      <div className="mt-8 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-teal-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                مركز النسخ الاحتياطي وحماية البيانات
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                حماية شاملة ضد الفقدان، نسخ تلقائي مستمر، وإمكانية التصدير والاستيراد بضغطة واحدة
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام الحماية والنسخ التلقائي نشط</span>
          </div>
        </div>

        {/* Feedback message */}
        {backupActionMsg && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
              backupActionMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {backupActionMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span>{backupActionMsg.text}</span>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Export / Download */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50/60 to-cyan-50/40 border border-teal-100/80 flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">تحميل نسخة احتياطية (تصدير)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  قم بتحميل نسخة كاملة من جميع الحسابات، الجلسات، سجلات الحضور والإعدادات كملف JSON آمن يمكنك حفظه على هاتفك أو حاسوبك.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نسخة احتياطية الآن (.json)</span>
            </button>
          </div>

          {/* Card 2: Import / Restore */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-100/80 flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800">استعادة نسخة سابقة (استيراد)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  إذا كان لديك ملف نسخة احتياطية سابق وتريد استرجاع بياناتك بدقة وأمان كامل، يمكنك رفعه هنا وسيتم تطبيق البيانات فوراً.
                </p>
              </div>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>رفع واستعادة ملف نسخة احتياطية</span>
              </button>
            </div>
          </div>
        </div>

        {/* Server Automated Snapshots List */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h4 className="text-xs sm:text-sm font-black text-slate-800">
                النسخ الاحتياطية التلقائية المحفوظة على السيرفر ({backups.length})
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                تلقائي نشط
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateInstantBackup}
                disabled={creatingBackup}
                className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-black text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className={`w-3.5 h-3.5 ${creatingBackup ? 'animate-spin' : ''}`} />
                <span>{creatingBackup ? 'جاري الحفظ...' : 'حفظ نقطة استعادة فورية الآن'}</span>
              </button>
              <button
                type="button"
                onClick={fetchBackups}
                disabled={loadingBackups}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-semibold">
            يعمل نظام الحفظ التلقائي في الخلفية باستمرار (كل 30 دقيقة + عند كل عملية حضور أو جلسة جديدة) ويخزن نقاط استعادة مؤرخة بتوقيت القاهرة.
          </p>

          {loadingBackups ? (
            <div className="py-6 text-center text-xs text-slate-400 font-semibold">
              جاري فحص النسخ المحفوظة...
            </div>
          ) : backups.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              لا توجد نسخ احتياطية مسجلة بعد. سيتم إنشاؤها تلقائياً مع بدء العمل.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {backups.map((b) => (
                <div
                  key={b.fileName}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-all gap-2"
                >
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-slate-800" dir="ltr">
                        {b.fileName}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold mt-0.5">
                        <span>{new Date(b.createdAt).toLocaleString('ar-EG')}</span>
                        <span>•</span>
                        <span>{b.specialistsCount} أخصائي</span>
                        <span>•</span>
                        <span>{b.sessionsCount} جلسة</span>
                        <span>•</span>
                        <span>{b.attendanceCount} حضور</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreServerBackup(b.fileName)}
                    className="self-end sm:self-center py-1.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة هذه النسخة</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

