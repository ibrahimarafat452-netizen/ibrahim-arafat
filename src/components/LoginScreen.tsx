import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Smile,
  Shield,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('يرجى كتابة رقم الهاتف وكلمة المرور');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(phone, password);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. تأكد من صحة البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100/60 via-amber-50 to-sky-100/70 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-['Cairo',sans-serif]">
      {/* Playful background decorative shapes */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Cheerful Logo & Title */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-amber-300 p-1 shadow-xl flex items-center justify-center transform hover:rotate-3 transition-transform">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center text-cyan-600 shadow-inner">
              <Smile className="w-12 h-12 text-teal-600 stroke-[2.2]" />
            </div>
          </div>

          <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            مركز بصمة أمل للتخاطب
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-teal-700 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>نظام إدارة أخصائيي الجلسات ومتابعة الحضور</span>
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-full shadow-2xs">
            تحت إشراف: د. منى عبد الرحمن (استشاري التخاطب)
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-amber-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2 animate-shake">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Phone input */}
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-1.5">
                رقم الهاتف
              </label>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-5 w-5 text-cyan-600" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pr-11 pl-4 py-3 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-base font-semibold transition-all bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5 text-cyan-600" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-11 pl-11 py-3 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-base font-semibold transition-all bg-slate-50/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-base font-extrabold text-white bg-gradient-to-r from-teal-500 via-cyan-600 to-sky-600 hover:from-teal-600 hover:via-cyan-700 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول إلى المركز</span>
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Policy reminder: No self-registration */}
          <div className="mt-5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[12px] text-amber-900 leading-relaxed text-center font-medium">
            تنويه: حسابات الأخصائيين يتم إنشاؤها وتزويدها حصرياً بواسطة إدارة المركز. لا يمكن للأخصائي إنشاء حساب بمفرده.
          </div>

          {/* Specialist login notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-center font-medium leading-relaxed">
              <span className="font-extrabold text-slate-900 block mb-1">تسجيل الدخول للمنظومة</span>
              <span>يدخل الأخصائي برقم هاتفه وكلمة المرور المسلمة له من إدارة المركز، وتدخل الإدارة ببيانات حساب المدير.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
