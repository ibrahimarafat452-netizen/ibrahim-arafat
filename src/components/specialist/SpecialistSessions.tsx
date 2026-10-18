import React, { useState, useEffect } from 'react';
import { TherapySession } from '../../types.ts';
import { specialistApi, formatMinutesArabic } from '../../lib/api.ts';
import { AddEditSessionModal } from './AddEditSessionModal.tsx';
import {
  Sparkles,
  Search,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Smile,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const SpecialistSessions: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  });
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TherapySession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSessions = async (date: string) => {
    try {
      setLoading(true);
      const res = await specialistApi.getSessions(date);
      setSessions(res.sessions);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل جلب الجلسات', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await specialistApi.deleteSession(deleteTarget.id);
      setMessage({ text: `تم حذف جلسة الطفل (${deleteTarget.name}) بنجاح`, type: 'success' });
      setDeleteTarget(null);
      fetchSessions(selectedDate);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'فشل حذف الجلسة', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Header card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>سجل الجلسات</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">جلسات الأطفال العلاجية</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            استعراض وتدوين جلسات التخاطب وتنمية المهارات وتعديل السلوك
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSession(null);
            setShowModal(true);
          }}
          className="py-3 px-6 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة جلسة جديدة</span>
        </button>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600 shrink-0" />
          <label className="text-xs font-bold text-slate-700 shrink-0">اختر التاريخ:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث باسم الطفل أو الهدف العلاجي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
          />
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

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-cyan-50/70 border border-cyan-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-cyan-800">جلسات التاريخ المحدد</span>
          <div className="text-xl font-black text-cyan-950 mt-1">
            {sessions.length} <span className="text-xs font-bold text-cyan-700">جلسة</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4">
          <span className="text-xs font-bold text-amber-800">إجمالي مدة التدريب</span>
          <div className="text-lg font-black text-amber-950 mt-1">
            {formatMinutesArabic(totalMinutes)}
          </div>
        </div>

        <div className="bg-teal-50/70 border border-teal-200/60 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-teal-800">متوسط مدة الجلسة</span>
          <div className="text-lg font-black text-teal-950 mt-1">
            {sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0}{' '}
            <span className="text-xs font-bold text-teal-700">دقيقة</span>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center justify-between">
          <span>قائمة جلسات اليوم المحدد ({selectedDate})</span>
          <span className="text-xs font-bold text-slate-500">{filteredSessions.length} جلسة مطابقة</span>
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-bold">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            جاري تحميل الجلسات...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Smile className="w-10 h-10 text-cyan-600 mx-auto mb-2" />
            <p className="font-bold text-slate-700">لا توجد جلسات مسجلة لهذا التاريخ</p>
            <p className="text-xs text-slate-400 mt-1">يمكنك إضافة جلسات جديدة عبر زر الإضافة أعلاه.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session, idx) => (
              <div
                key={session.id}
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 font-black text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-slate-900">{session.childName}</h4>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-800 bg-cyan-100 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-cyan-600" />
                        <span>{session.durationMinutes} دقيقة</span>
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-xs font-medium text-slate-600 mt-2 bg-white p-2.5 rounded-xl border border-slate-100">
                        {session.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      setEditingSession(session);
                      setShowModal(true);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 border border-slate-200 transition-colors"
                    title="تعديل الجلسة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: session.id, name: session.childName })}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">تأكيد حذف الجلسة</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جلسة الطفل{' '}
                <span className="font-extrabold text-slate-800">({deleteTarget.name})</span>؟
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، حذف الجلسة'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <AddEditSessionModal
          sessionToEdit={editingSession}
          defaultDate={selectedDate}
          onClose={() => {
            setShowModal(false);
            setEditingSession(null);
          }}
          onSuccess={() => {
            fetchSessions(selectedDate);
          }}
        />
      )}
    </div>
  );
};
