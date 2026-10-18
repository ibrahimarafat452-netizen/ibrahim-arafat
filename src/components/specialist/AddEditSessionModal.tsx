import React, { useState, useEffect } from 'react';
import { TherapySession } from '../../types.ts';
import { specialistApi } from '../../lib/api.ts';
import { X, Sparkles, Clock, User, FileText, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddEditSessionModalProps {
  sessionToEdit?: TherapySession | null;
  onClose: () => void;
  onSuccess: (savedSession: TherapySession) => void;
  defaultDate?: string;
}

export const AddEditSessionModal: React.FC<AddEditSessionModalProps> = ({
  sessionToEdit,
  onClose,
  onSuccess,
  defaultDate,
}) => {
  const [childName, setChildName] = useState(sessionToEdit?.childName || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(sessionToEdit?.durationMinutes || 45);
  const [notes, setNotes] = useState(sessionToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(sessionToEdit);

  const quickDurations = [30, 40, 45, 50, 60];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) {
      setError('يرجى كتابة اسم الطفل');
      return;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setError('يرجى تحديد مدة الجلسة بالدقائق');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditMode && sessionToEdit) {
        const res = await specialistApi.updateSession(sessionToEdit.id, {
          childName: childName.trim(),
          durationMinutes: Number(durationMinutes),
          notes: notes.trim(),
        });
        onSuccess(res.session);
      } else {
        const res = await specialistApi.addSession({
          childName: childName.trim(),
          durationMinutes: Number(durationMinutes),
          notes: notes.trim(),
          date: defaultDate,
        });

        // Cheerful celebratory confetti for logging a child session!
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#06b6d4', '#fbbf24', '#f43f5e', '#10b981'],
          });
        } catch (_) {}

        onSuccess(res.session);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ الجلسة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn font-['Cairo',sans-serif]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-100 animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <h3 className="text-lg font-extrabold">
              {isEditMode ? 'تعديل بيانات الجلسة العلاجية' : 'إضافة جلسة تخاطب جديدة للطفل'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Child Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-600" />
              <span>اسم الطفل / الحالة *</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: ياسين علي (لدغات وحرف الراء)"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-semibold bg-slate-50/50 focus:bg-white text-base"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>مدة الجلسة بالدقائق *</span>
              </span>
              <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
                {durationMinutes} دقيقة
              </span>
            </label>

            {/* Quick Presets */}
            <div className="grid grid-cols-5 gap-2 mb-2">
              {quickDurations.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    durationMinutes === mins
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-cyan-50'
                  }`}
                >
                  {mins} د
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="relative rounded-2xl shadow-2xs">
              <input
                type="number"
                min="5"
                max="300"
                required
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                placeholder="أدخل المدة بالدقائق يدوياً"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold bg-slate-50/50 focus:bg-white text-sm"
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                دقيقة
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-600" />
              <span>ملاحظات الجلسة والهدف العلاجي (اختياري)</span>
            </label>
            <textarea
              rows={3}
              placeholder="مثال: تم إتقان صوت حرف الكاف بمفرده وفي أول الكلمة، تدريب على التواصل البصري..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium bg-slate-50/50 focus:bg-white text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-2xl font-extrabold text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:to-sky-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{isEditMode ? 'حفظ التعديلات' : 'تسجيل الجلسة'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
