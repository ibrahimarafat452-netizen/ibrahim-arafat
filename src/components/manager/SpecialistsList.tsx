import React, { useState, useEffect } from 'react';
import { managerApi, formatMinutesArabic, formatArabicTime, ARABIC_DAYS_MAP } from '../../lib/api.ts';
import { User, AttendanceRecord, TherapySession } from '../../types.ts';
import {
  Users,
  UserPlus,
  Edit,
  Key,
  Power,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Eye,
  X,
  Phone,
  ShieldCheck,
  History,
  Trash2,
} from 'lucide-react';

export const SpecialistsList: React.FC = () => {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Delete modal state
  const [deleteModalSpecialist, setDeleteModalSpecialist] = useState<any | null>(null);
  const [deleteWithHistory, setDeleteWithHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('أخصائي تخاطب ونطق');
  const [formWorkingDays, setFormWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 6]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail / Full History Modal
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    specialist: User;
    attendances: AttendanceRecord[];
    sessions: TherapySession[];
    totalSessions: number;
    totalMinutes: number;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSpecialists = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await managerApi.getSpecialists();
      setSpecialists(res.specialists);
    } catch (err: any) {
      if (!isBackground) {
        setMessage({ text: err.message || 'فشل جلب الأخصائيين', type: 'error' });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialists();
    // Auto-update every 8 seconds
    const interval = setInterval(() => fetchSpecialists(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = () => {
    setEditingSpecialist(null);
    setFormName('');
    setFormPhone('');
    setFormPassword('');
    setFormSpecialization('أخصائي تخاطب ونطق');
    setFormWorkingDays([0, 1, 2, 3, 4, 6]);
    setShowFormModal(true);
  };

  const openEditModal = (spec: any) => {
    setEditingSpecialist(spec);
    setFormName(spec.name);
    setFormPhone(spec.phone);
    setFormPassword(''); // blank unless changing
    setFormSpecialization(spec.specialization);
    setFormWorkingDays(spec.workingDays || [0, 1, 2, 3, 4, 6]);
    setShowFormModal(true);
  };

  const handleSaveSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setMessage({ text: 'يرجى كتابة الاسم ورقم الهاتف', type: 'error' });
      return;
    }
    if (!editingSpecialist && (!formPassword || formPassword.length < 6)) {
      setMessage({ text: 'كلمة المرور يجب أن لا تقل عن 6 أحرف', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingSpecialist) {
        await managerApi.updateSpecialist(editingSpecialist.id, {
          name: formName.trim(),
          phone: formPhone.trim(),
          specialization: formSpecialization.trim(),
          workingDays: formWorkingDays,
          password: formPassword.trim() ? formPassword.trim() : undefined,
        });
        setMessage({ text: 'تم تعديل بيانات الأخصائي بنجاح!', type: 'success' });
      } else {
        await managerApi.createSpecialist({
          name: formName.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          specialization: formSpecialization.trim(),
          workingDays: formWorkingDays,
        });
        setMessage({ text: 'تم إنشاء حساب الأخصائي بنجاح وتعيين بيانات الدخول!', type: 'success' });
      }

      setShowFormModal(false);
      await fetchSpecialists();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'حدث خطأ أثناء الحفظ', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active / Deactivate (Preserves historical data)
  const handleToggleActive = async (spec: any) => {
    const action = spec.isActive ? 'تعطيل' : 'تفعيل';
    const confirmMessage = spec.isActive
      ? `هل أنت متأكد من تعطيل/إيقاف حساب الأخصائي (${spec.name})؟\n\nتنويه: سيتم الاحتفاظ بكافة سجلات الحضور والجلسات التاريخية ولن يتمكن من الدخول لحين إعادة التفعيل.`
      : `هل أنت متأكد من إعادة تفعيل حساب الأخصائي (${spec.name})؟`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await managerApi.updateSpecialist(spec.id, { isActive: !spec.isActive });
      setMessage({
        text: `تم ${action} حساب الأخصائي بنجاح.`,
        type: 'success',
      });
      await fetchSpecialists();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || `فشل ${action} الحساب`, type: 'error' });
    }
  };

  // Permanently Delete Specialist
  const confirmDeleteSpecialist = async () => {
    if (!deleteModalSpecialist) return;
    try {
      setIsDeleting(true);
      await managerApi.deleteSpecialist(deleteModalSpecialist.id, deleteWithHistory);
      setMessage({
        text: `تم حذف حساب الأخصائي (${deleteModalSpecialist.name}) بنجاح!`,
        type: 'success',
      });
      setDeleteModalSpecialist(null);
      await fetchSpecialists();
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل حذف الأخصائي', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Full History
  const openDetailModal = async (id: string) => {
    try {
      setViewingDetailId(id);
      setLoadingDetail(true);
      const res = await managerApi.getSpecialistDetail(id);
      setDetailData(res);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل جلب ملف الأخصائي', type: 'error' });
      setViewingDetailId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleWorkingDay = (dayIndex: number) => {
    if (formWorkingDays.includes(dayIndex)) {
      if (formWorkingDays.length === 1) {
        setMessage({ text: 'يجب تحديد يوم عمل واحد على الأقل للأخصائي.', type: 'error' });
        return;
      }
      setFormWorkingDays(formWorkingDays.filter((d) => d !== dayIndex));
    } else {
      setFormWorkingDays([...formWorkingDays, dayIndex].sort());
    }
  };

  const filteredSpecialists = specialists.filter((s) => {
    if (filterActive === 'active' && !s.isActive) return false;
    if (filterActive === 'inactive' && s.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.specialization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-600" />
            <span>فريق العمل العلاجي</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">إدارة أخصائيي المركز</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            إنشاء حسابات الأخصائيين، تعيين بيانات الدخول، إدارة أيام العمل، وتتبع السجلات التاريخية
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-3 px-6 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة أخصائي جديد</span>
        </button>
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterActive('all')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterActive === 'all'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            الكل ({specialists.length})
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterActive === 'active'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            النشطون ({specialists.filter((s) => s.isActive).length})
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterActive === 'inactive'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            غير النشطين ({specialists.filter((s) => !s.isActive).length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو التخصص..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Specialists Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 font-bold">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          جاري تحميل بيانات الأخصائيين...
        </div>
      ) : filteredSpecialists.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-800">لا يوجد أخصائيون يطابقون البحث</h4>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecialists.map((spec) => (
            <div
              key={spec.id}
              className={`bg-white rounded-3xl p-5 shadow-xs border transition-all flex flex-col justify-between ${
                spec.isActive
                  ? 'border-slate-100 hover:border-cyan-200 hover:shadow-md'
                  : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                {/* Top status & avatar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-xs ${
                        spec.isActive
                          ? 'bg-gradient-to-tr from-cyan-500 to-teal-400'
                          : 'bg-slate-400'
                      }`}
                    >
                      {spec.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {spec.name}
                      </h3>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-cyan-600" />
                        <span>{spec.phone}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
                      spec.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {spec.isActive ? 'نشط' : 'معطل'}
                  </span>
                </div>

                {/* Specialization */}
                <div className="text-xs font-bold text-teal-800 bg-teal-50/70 border border-teal-100 px-3 py-1.5 rounded-xl inline-block mb-3">
                  {spec.specialization}
                </div>

                {/* Working Days */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">أيام الدوام الأسبوعية:</div>
                  <div className="flex flex-wrap gap-1">
                    {[6, 0, 1, 2, 3, 4].map((dayIdx) => {
                      const isWorking = spec.workingDays?.includes(dayIdx);
                      return (
                        <span
                          key={dayIdx}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isWorking
                              ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          {ARABIC_DAYS_MAP[dayIdx]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Workload Stats */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">إجمالي الجلسات</span>
                    <div className="text-sm font-black text-slate-800">{spec.totalSessions || 0} جلسة</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">ساعات التدريب</span>
                    <div className="text-sm font-black text-slate-800">
                      {Math.round((spec.totalMinutes || 0) / 60)} ساعة
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                <button
                  onClick={() => openDetailModal(spec.id)}
                  className="p-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="عرض السجل التاريخي الكامل"
                >
                  <History className="w-4 h-4 text-cyan-600" />
                  <span>السجل</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(spec)}
                    className="p-2 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl transition-colors cursor-pointer"
                    title="تعديل البيانات أو تعيين كلمة مرور"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(spec)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      spec.isActive
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={spec.isActive ? 'إيقاف / تعطيل الحساب' : 'إعادة تفعيل الحساب'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setDeleteModalSpecialist(spec);
                      setDeleteWithHistory(false);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف حساب الأخصائي نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Specialist Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-['Cairo',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-100 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-white" />
                <h3 className="text-lg font-black">
                  {editingSpecialist ? 'تعديل بيانات الأخصائي' : 'إضافة أخصائي جديد بالمركز'}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecialist} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأخصائي بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. سارة إبراهيم محمد"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف (يُستخدم للدخول) *
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="01011112222"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingSpecialist
                    ? 'كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب بتغييرها)'
                    : 'كلمة المرور للدخول * (6 أحرف أو أرقام على الأقل)'}
                </label>
                <input
                  type="text"
                  required={!editingSpecialist}
                  placeholder={editingSpecialist ? 'اتركها فارغة للإبقاء على الحالية' : 'مثال: 123456'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  يتم تشفير كلمة المرور فورياً ومطابقتها بأمان تام عبر الخادم.
                </p>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المسمى والتخصص</label>
                <select
                  value={formSpecialization}
                  onChange={(e) => setFormSpecialization(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                >
                  <option value="أخصائي تخاطب ونطق وأمراض كلام">أخصائي تخاطب ونطق وأمراض كلام</option>
                  <option value="أخصائي تنمية مهارات وصعوبات تعلم">أخصائي تنمية مهارات وصعوبات تعلم</option>
                  <option value="أخصائي تعديل سلوك واضطراب طيف التوحد">أخصائي تعديل سلوك واضطراب طيف التوحد</option>
                  <option value="أخصائي علاج وظيفي وتكامل حسي">أخصائي علاج وظيفي وتكامل حسي</option>
                  <option value="أخصائي إرشاد نفسي وتأهيل تربوي">أخصائي إرشاد نفسي وتأهيل تربوي</option>
                </select>
              </div>

              {/* Working Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أيام العمل المجدولة للأخصائي أسبوعياً:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { idx: 6, label: 'السبت' },
                    { idx: 0, label: 'الأحد' },
                    { idx: 1, label: 'الاثنين' },
                    { idx: 2, label: 'الثلاثاء' },
                    { idx: 3, label: 'الأربعاء' },
                    { idx: 4, label: 'الخميس' },
                  ].map((day) => {
                    const isSelected = formWorkingDays.includes(day.idx);
                    return (
                      <button
                        type="button"
                        key={day.idx}
                        onClick={() => toggleWorkingDay(day.idx)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day.label} {isSelected ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl font-black text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingSpecialist ? 'حفظ التعديلات' : 'تأكيد إنشاء الحساب'}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="py-3 px-5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Specialist Full History Modal */}
      {viewingDetailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-['Cairo',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[88vh] flex flex-col">
            <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-lg font-black">{detailData?.specialist.name}</h3>
                  <p className="text-xs text-cyan-100">{detailData?.specialist.specialization}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDetailId(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-500 font-bold">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  جاري تحميل السجل الكامل...
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100">
                      <span className="text-xs font-bold text-cyan-800">إجمالي الجلسات العلاجية</span>
                      <div className="text-xl font-black text-cyan-950 mt-1">
                        {detailData?.totalSessions || 0} جلسة
                      </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                      <span className="text-xs font-bold text-amber-800">إجمالي مدة التدريب</span>
                      <div className="text-lg font-black text-amber-950 mt-1">
                        {formatMinutesArabic(detailData?.totalMinutes || 0)}
                      </div>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 col-span-2 sm:col-span-1">
                      <span className="text-xs font-bold text-teal-800">أيام الحضور المسجلة</span>
                      <div className="text-xl font-black text-teal-950 mt-1">
                        {detailData?.attendances.filter((a) => a.status !== 'absent').length || 0} يوم
                      </div>
                    </div>
                  </div>

                  {/* Attendance Log */}
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-2">سجل الحضور والانصراف</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {detailData?.attendances.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد سجلات حضور مسجلة بعد.</p>
                      ) : (
                        detailData?.attendances.map((att) => (
                          <div
                            key={att.id}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-slate-800">{att.date}</span>
                            <div className="flex items-center gap-3">
                              {att.status === 'absent' ? (
                                <span className="text-rose-700 font-extrabold bg-rose-100 px-2 py-0.5 rounded-md">
                                  غائب: {att.notes || 'اعتذار'}
                                </span>
                              ) : (
                                <>
                                  <span>حضور: {formatArabicTime(att.checkInTime)}</span>
                                  <span>انصراف: {formatArabicTime(att.checkOutTime)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sessions Log */}
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-2">سجل جلسات الأطفال</h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {detailData?.sessions.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد جلسات مسجلة بعد.</p>
                      ) : (
                        detailData?.sessions.map((sess) => (
                          <div
                            key={sess.id}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900">{sess.childName}</span>
                              <span className="font-bold text-cyan-700">{sess.durationMinutes} دقيقة</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>التاريخ: {sess.date}</span>
                              {sess.notes && <span className="text-slate-600 truncate max-w-xs">{sess.notes}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalSpecialist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Cairo',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-200 animate-scaleUp">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-black">حذف حساب الأخصائي نهائياً</h3>
              </div>
              <button
                onClick={() => setDeleteModalSpecialist(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف حساب الأخصائي{' '}
                <strong className="text-rose-950 font-black">{deleteModalSpecialist.name}</strong>؟
                لن يتمكن من تسجيل الدخول إلى المنظومة بعد الآن.
              </div>

              {/* Option to also delete historical records */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteWithHistory}
                  onChange={(e) => setDeleteWithHistory(e.target.checked)}
                  className="mt-0.5 rounded-md text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    حذف كافة سجلات الحضور وجلسات الأطفال التابعة له
                  </span>
                  <span className="text-[11px] text-slate-500">
                    إذا تركتها غير محددة، سيتم الاحتفاظ بالسجلات القديمة للأخصائي في التقارير والإحصائيات.
                  </span>
                </div>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteSpecialist}
                  className="flex-1 py-3 px-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>تأكيد الحذف الآن</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalSpecialist(null)}
                  className="py-3 px-5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
