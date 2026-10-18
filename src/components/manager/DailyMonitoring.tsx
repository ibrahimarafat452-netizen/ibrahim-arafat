import React, { useState, useEffect } from 'react';
import { managerApi, formatMinutesArabic, formatArabicTime } from '../../lib/api.ts';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Smile,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Heart,
  AlertTriangle,
} from 'lucide-react';

export const DailyMonitoring: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedSpecialistId, setExpandedSpecialistId] = useState<string | null>(null);

  const fetchMonitoring = async (date: string, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await managerApi.getDailyMonitoring(date);
      setData(res);
    } catch (err) {
      if (!isBackground) {
        console.error('Failed fetching monitoring data:', err);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring(selectedDate);
    // Refresh every 8 seconds for live monitoring
    const timer = setInterval(() => fetchMonitoring(selectedDate, true), 8000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  const monitoringList: any[] = data?.monitoringList || [];

  const filteredList = monitoringList.filter((item) => {
    if (filterStatus === 'present' && item.statusDisplay !== 'present' && item.statusDisplay !== 'checked_out') return false;
    if (filterStatus === 'not_registered' && item.statusDisplay !== 'not_registered') return false;
    if (filterStatus === 'absent' && item.statusDisplay !== 'absent') return false;
    if (filterStatus === 'incomplete' && item.completeness !== 'missing_checkout' && item.completeness !== 'missing_sessions') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.specialist.name.toLowerCase().includes(q) ||
        item.specialist.specialization.toLowerCase().includes(q) ||
        item.sessions?.some((s: any) => s.childName.toLowerCase().includes(q))
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
            <UserCheck className="w-4 h-4 text-cyan-600" />
            <span>المتابعة الميدانية واللحظية</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">المتابعة اليومية للأخصائيين</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            متابعة دقيقة وفورية لحضور وانصراف وجلسات أخصائيي المركز بتوقيت القاهرة
          </p>
        </div>

        <button
          onClick={() => fetchMonitoring(selectedDate)}
          disabled={loading}
          className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث لحظي</span>
        </button>
      </div>

      {/* Date & Filter controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-5 h-5 text-cyan-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">تاريخ المتابعة:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
          />
          {data?.dayName && (
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-xl">
              يوم {data.dayName}
            </span>
          )}
        </div>

        {/* Filter status buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({monitoringList.length})
          </button>
          <button
            onClick={() => setFilterStatus('present')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'present'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            حاضر ({monitoringList.filter((m) => m.statusDisplay === 'present' || m.statusDisplay === 'checked_out').length})
          </button>
          <button
            onClick={() => setFilterStatus('not_registered')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'not_registered'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            لم يسجل ({monitoringList.filter((m) => m.statusDisplay === 'not_registered').length})
          </button>
          <button
            onClick={() => setFilterStatus('absent')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'absent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            غائب ({monitoringList.filter((m) => m.statusDisplay === 'absent').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث باسم الأخصائي أو الطفل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Monitoring Cards List */}
      <div className="space-y-4">
        {loading && !data ? (
          <div className="py-16 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-100">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            جاري فحص السجلات اليومية...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-base font-bold text-slate-800">لا توجد سجلات مطابقة لهذا الفلتر</h4>
          </div>
        ) : (
          filteredList.map((item) => {
            const isExpanded = expandedSpecialistId === item.specialist.id;

            return (
              <div
                key={item.specialist.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs transition-all ${
                  item.statusDisplay === 'not_registered'
                    ? 'border-amber-200 bg-amber-50/20'
                    : item.statusDisplay === 'absent'
                    ? 'border-rose-100 bg-rose-50/15'
                    : 'border-slate-100 hover:border-cyan-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Specialist info & status */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shrink-0 shadow-xs ${
                        item.statusDisplay === 'checked_out'
                          ? 'bg-sky-500'
                          : item.statusDisplay === 'present'
                          ? 'bg-teal-500'
                          : item.statusDisplay === 'absent'
                          ? 'bg-rose-500'
                          : item.statusDisplay === 'day_off'
                          ? 'bg-slate-400'
                          : 'bg-amber-400'
                      }`}
                    >
                      {item.specialist.name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {item.specialist.name}
                        </h3>
                        <span className="text-xs text-slate-500" dir="ltr">
                          ({item.specialist.phone})
                        </span>

                        {/* Status Badge */}
                        {item.statusDisplay === 'present' && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800 border border-teal-200">
                            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                            حاضر (قيد العمل)
                          </span>
                        )}
                        {item.statusDisplay === 'checked_out' && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                            أنهى العمل (انصراف)
                          </span>
                        )}
                        {item.statusDisplay === 'absent' && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            غائب (اعتذار رسمي)
                          </span>
                        )}
                        {item.statusDisplay === 'not_registered' && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            لم يسجل الحضور بعد
                          </span>
                        )}
                        {item.statusDisplay === 'day_off' && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            يوم إجازة / غير مجدول
                          </span>
                        )}

                        {/* Completeness flags */}
                        {item.completeness === 'missing_sessions' && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                            حاضر بدون جلسات مسجلة
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {item.specialist.specialization}
                      </div>

                      {item.absenceReason && (
                        <div className="text-xs font-semibold text-rose-700 mt-1">
                          سبب الغياب: {item.absenceReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendance & Session Metrics */}
                  <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                    {/* Times */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center min-w-[120px]">
                      <div className="text-[10px] font-bold text-slate-400">سجل الدوام</div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {item.checkInTime ? formatArabicTime(item.checkInTime) : '-'}
                        {' → '}
                        {item.checkOutTime ? formatArabicTime(item.checkOutTime) : '-'}
                      </div>
                    </div>

                    {/* Sessions Count & Duration */}
                    <div className="bg-cyan-50/70 p-2.5 rounded-2xl border border-cyan-100 text-center min-w-[110px]">
                      <div className="text-[10px] font-bold text-cyan-800">جلسات اليوم</div>
                      <div className="text-sm font-black text-cyan-950 mt-0.5">
                        {item.sessionsCount} جلسة
                      </div>
                      <div className="text-[10px] font-bold text-cyan-700">
                        ({item.totalMinutes} دقيقة)
                      </div>
                    </div>

                    {/* Expand sessions toggle */}
                    <button
                      onClick={() =>
                        setExpandedSpecialistId(isExpanded ? null : item.specialist.id)
                      }
                      className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="عرض أو إخفاء جلسات الأطفال"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Children's Sessions */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                      <span>تفاصيل جلسات الأطفال المنفذة اليوم ({item.sessionsCount}):</span>
                    </h4>

                    {item.sessions?.length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        لم يتم تدوين جلسات علاجية حتى هذه اللحظة.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {item.sessions.map((sess: any) => (
                          <div
                            key={sess.id}
                            className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs flex flex-col justify-between gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900">{sess.childName}</span>
                              <span className="font-bold text-cyan-700 bg-cyan-100/70 px-2 py-0.5 rounded-md">
                                {sess.durationMinutes} دقيقة
                              </span>
                            </div>
                            {sess.notes && (
                              <p className="text-[11px] text-slate-600 font-medium bg-white p-2 rounded-xl border border-slate-100 mt-1 line-clamp-2">
                                {sess.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
