import React, { useState, useEffect } from 'react';
import { managerApi, formatMinutesArabic, formatArabicTime } from '../../lib/api.ts';
import { DailyReportItem, MonthlyReportSpecialist, CenterSettings } from '../../types.ts';
import { PrintableReport } from '../PrintableReport.tsx';
import {
  FileText,
  Calendar,
  Filter,
  Printer,
  Download,
  Users,
  Award,
  Clock,
  Smile,
  AlertTriangle,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export const ReportsAndStatistics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'rankings'>('daily');

  // Daily report state
  const [dailyDate, setDailyDate] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
  });
  const [dailySpecialistId, setDailySpecialistId] = useState<string>('all');
  const [dailyData, setDailyData] = useState<any>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Monthly report state
  const [monthlyMonth, setMonthlyMonth] = useState<string>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    return today.substring(0, 7);
  });
  const [monthlySpecialistId, setMonthlySpecialistId] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Rankings state
  const [rankingPeriod, setRankingPeriod] = useState<string>('month');
  const [rankingsData, setRankingsData] = useState<any>(null);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Center settings & all specialists list for dropdown filters
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [specialistsList, setSpecialistsList] = useState<any[]>([]);

  // Print Preview Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Load specialists & settings
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [specsRes, settingsRes] = await Promise.all([
          managerApi.getSpecialists(),
          managerApi.getSettings(),
        ]);
        setSpecialistsList(specsRes.specialists);
        setSettings(settingsRes.settings);
      } catch (err) {
        console.error('Failed loading settings or specialists:', err);
      }
    };
    loadInitial();
  }, []);

  // Fetch Daily Report
  const fetchDailyReport = async () => {
    try {
      setLoadingDaily(true);
      const res = await managerApi.getDailyReport(dailyDate, dailySpecialistId);
      setDailyData(res);
    } catch (err) {
      console.error('Failed fetching daily report:', err);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyReport();
    }
  }, [dailyDate, dailySpecialistId, activeTab]);

  // Fetch Monthly Report
  const fetchMonthlyReport = async () => {
    try {
      setLoadingMonthly(true);
      const res = await managerApi.getMonthlyReport(monthlyMonth, monthlySpecialistId);
      setMonthlyData(res);
    } catch (err) {
      console.error('Failed fetching monthly report:', err);
    } finally {
      setLoadingMonthly(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport();
    }
  }, [monthlyMonth, monthlySpecialistId, activeTab]);

  // Fetch Rankings
  const fetchRankings = async () => {
    try {
      setLoadingRankings(true);
      const res = await managerApi.getRankings(rankingPeriod);
      setRankingsData(res);
    } catch (err) {
      console.error('Failed fetching rankings:', err);
    } finally {
      setLoadingRankings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rankings') {
      fetchRankings();
    }
  }, [rankingPeriod, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-cyan-600" />
            <span>التقارير والإحصائيات والطباعة</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mt-1">تقارير المركز وإحصائيات العمل</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تقارير يومية وشهرية شاملة، ترتيب نشاط الأخصائيين، وطباعة رسمية بصيغة A4 وتصدير PDF
          </p>
        </div>

        {/* Subtabs Nav */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer flex-1 sm:flex-none text-center ${
              activeTab === 'daily'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            التقرير اليومي
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer flex-1 sm:flex-none text-center ${
              activeTab === 'monthly'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            التقرير الشهري
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer flex-1 sm:flex-none text-center ${
              activeTab === 'rankings'
                ? 'bg-white text-cyan-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            إحصائيات العمل
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY REPORT */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">التاريخ:</span>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                />
              </div>

              {/* Specialist Selector */}
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">الأخصائي:</span>
                <select
                  value={dailySpecialistId}
                  onChange={(e) => setDailySpecialistId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                >
                  <option value="all">جميع أخصائيي المركز</option>
                  {specialistsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Print & PDF Export Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowPrintModal(true)}
                className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة تقرير اليوم (A4)</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Daily Summary Cards */}
          {dailyData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-slate-500">المجدولون للعمل</div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {dailyData.summary.expectedSpecialists}
                </div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-teal-800">الحاضرون</div>
                <div className="text-2xl font-black text-teal-900 mt-1">
                  {dailyData.summary.presentCount}
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-rose-800">الغائبون (اعتذار)</div>
                <div className="text-2xl font-black text-rose-900 mt-1">
                  {dailyData.summary.absentCount}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-amber-800">لم يسجلوا الحضور</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {dailyData.summary.notRegisteredCount}
                </div>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-cyan-800">إجمالي الجلسات</div>
                <div className="text-2xl font-black text-cyan-900 mt-1">
                  {dailyData.summary.totalSessions}
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-orange-800">إجمالي الدقائق</div>
                <div className="text-xl font-black text-orange-950 mt-1">
                  {dailyData.summary.totalMinutes} د
                </div>
              </div>
            </div>
          )}

          {/* Daily Items Table */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 overflow-x-auto">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center justify-between">
              <span>جدول التقرير اليومي التفصيلي ({dailyData?.dateFormatted})</span>
              <span className="text-xs font-bold text-slate-500">
                {dailyData?.items?.length || 0} أخصائي مسجل
              </span>
            </h3>

            {loadingDaily ? (
              <div className="py-12 text-center text-slate-500 font-bold">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                جاري إعداد التقرير اليومي...
              </div>
            ) : dailyData?.items?.length === 0 ? (
              <p className="text-center py-12 text-slate-400">لا توجد بيانات مطابقة.</p>
            ) : (
              <div className="space-y-4">
                {dailyData?.items?.map((item: DailyReportItem, idx: number) => (
                  <div
                    key={item.specialistId}
                    className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="text-base font-black text-slate-900">{item.specialistName}</h4>
                          <span className="text-xs text-slate-500">{item.specialization}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full ${
                            item.statusKey === 'present'
                              ? 'bg-teal-100 text-teal-800'
                              : item.statusKey === 'checked_out'
                              ? 'bg-sky-100 text-sky-800'
                              : item.statusKey === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : item.statusKey === 'not_registered'
                              ? 'bg-amber-100 text-amber-900 font-extrabold'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.statusText}
                        </span>

                        <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200 font-bold">
                          حضور: {formatArabicTime(item.checkInTime)} | انصراف: {formatArabicTime(item.checkOutTime)}
                        </span>
                      </div>
                    </div>

                    {/* Children details */}
                    <div className="mt-3">
                      <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>جلسات الأطفال ({item.sessionsCount} جلسة - {item.totalMinutes} دقيقة تدريب):</span>
                      </div>

                      {item.children.length === 0 ? (
                        <div className="text-xs text-slate-400 bg-white p-2.5 rounded-xl border border-slate-100">
                          {item.statusKey === 'absent'
                            ? `الأخصائي معتذر لظرف رسمي: ${item.absenceNotes || 'بدون ملاحظات'}`
                            : item.statusKey === 'not_registered'
                            ? 'لم يسجل الحضور أو جلسات الأطفال بعد'
                            : 'لم يتم تدوين جلسات علاجية حتى الآن'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {item.children.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                            >
                              <div className="flex items-center justify-between font-black text-slate-900">
                                <span>{c.childName}</span>
                                <span className="text-cyan-700 font-bold">{c.durationMinutes} دقيقة</span>
                              </div>
                              {c.notes && (
                                <p className="text-[11px] text-slate-500 mt-1 truncate">{c.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY REPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Filters */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Month */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">الشهر:</span>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                />
              </div>

              {/* Specialist Selector */}
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">الأخصائي:</span>
                <select
                  value={monthlySpecialistId}
                  onChange={(e) => setMonthlySpecialistId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                >
                  <option value="all">جميع أخصائيي المركز</option>
                  {specialistsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Print & PDF buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowPrintModal(true)}
                className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير الشهري (A4)</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Monthly Summary Cards */}
          {monthlyData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center">
                <div className="text-xs font-bold text-slate-500">أخصائيو المركز</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {monthlyData.summary.totalSpecialists} أخصائي
                </div>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-3xl p-5 text-center">
                <div className="text-xs font-bold text-cyan-800">إجمالي الجلسات في الشهر</div>
                <div className="text-3xl font-black text-cyan-950 mt-1">
                  {monthlyData.summary.totalSessions} جلسة
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center">
                <div className="text-xs font-bold text-amber-800">إجمالي ساعات التدريب</div>
                <div className="text-2xl font-black text-amber-950 mt-1">
                  {formatMinutesArabic(monthlyData.summary.totalMinutes)}
                </div>
              </div>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 overflow-x-auto">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              تقرير نشاط أخصائيي المركز لشهر {monthlyData?.monthFormatted}
            </h3>

            {loadingMonthly ? (
              <div className="py-12 text-center text-slate-500 font-bold">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                جاري إعداد التقرير الشهري...
              </div>
            ) : monthlyData?.specialists?.length === 0 ? (
              <p className="text-center py-12 text-slate-400">لا توجد بيانات لهذا الشهر.</p>
            ) : (
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-700 font-black">
                    <th className="py-3 px-3 text-center">#</th>
                    <th className="py-3 px-3">الأخصائي</th>
                    <th className="py-3 px-3">التخصص</th>
                    <th className="py-3 px-3 text-center">أيام الحضور</th>
                    <th className="py-3 px-3 text-center">أيام الغياب</th>
                    <th className="py-3 px-3 text-center">عدم التسجيل</th>
                    <th className="py-3 px-3 text-center">إجمالي الجلسات</th>
                    <th className="py-3 px-3 text-center">إجمالي الساعات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData?.specialists?.map((spec: MonthlyReportSpecialist, idx: number) => (
                    <tr key={spec.specialistId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-3 font-black text-slate-900">{spec.specialistName}</td>
                      <td className="py-3.5 px-3 font-medium text-slate-600">{spec.specialization}</td>
                      <td className="py-3.5 px-3 text-center font-bold text-teal-800">
                        {spec.presentDays} يوم
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-rose-800">
                        {spec.absentDays} يوم
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                        {spec.notRegisteredDays} يوم
                      </td>
                      <td className="py-3.5 px-3 text-center font-black text-cyan-800">
                        {spec.totalSessions}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {Math.round(spec.totalMinutes / 60)} ساعة ({spec.totalMinutes} د)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WORKLOAD RANKINGS & PERFORMANCE STATISTICS */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">فترة الإحصائيات:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'today', label: 'اليوم' },
                  { id: 'week', label: 'آخر 7 أيام' },
                  { id: 'month', label: 'هذا الشهر' },
                  { id: 'all', label: 'كل الأوقات' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setRankingPeriod(p.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rankingPeriod === p.id
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PROMINENT DISCLAIMER NOTE (CRITICAL REQUIREMENT) */}
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-amber-950">
                تنبيه وتوضيح إداري هام بخصوص ترتيب الأخصائيين:
              </h4>
              <p className="text-xs font-semibold text-amber-900 mt-1 leading-relaxed">
                هذه الإحصائيات والترتيبات تقيس <strong>حجم وساعات العمل المسجلة فقط</strong>، ولا تعكس جودة الجلسات أو مدى الفعالية الإكلينيكية والعلاجية للأخصائي. كل طفل وحالة لها متطلباتها الفردية الخاصة في خطة التخاطب.
              </p>
            </div>
          </div>

          {/* Dual Rankings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ranking 1: Sessions Count */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                  <Award className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    الأخصائيون الأكثر تسجيلاً للجلسات
                  </h3>
                  <p className="text-xs text-slate-500">حسب إجمالي عدد جلسات الأطفال المكتملة</p>
                </div>
              </div>

              {loadingRankings ? (
                <div className="py-8 text-center text-slate-400 font-bold">جاري تحميل الترتيب...</div>
              ) : (
                <div className="space-y-3">
                  {rankingsData?.rankedBySessions?.map((item: any, idx: number) => (
                    <div
                      key={item.specialistId}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.specialization}</div>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-base font-black text-cyan-800">
                          {item.totalSessions}
                        </span>
                        <span className="text-xs font-bold text-slate-500 mr-1">جلسة</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ranking 2: Total Duration */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    الأخصائيون الأكثر تسجيلاً لزمن التدريب
                  </h3>
                  <p className="text-xs text-slate-500">حسب إجمالي ساعات ودقائق الجلسات</p>
                </div>
              </div>

              {loadingRankings ? (
                <div className="py-8 text-center text-slate-400 font-bold">جاري تحميل الترتيب...</div>
              ) : (
                <div className="space-y-3">
                  {rankingsData?.rankedByDuration?.map((item: any, idx: number) => (
                    <div
                      key={item.specialistId}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.specialization}</div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-sm font-black text-amber-950">
                          {Math.round(item.totalMinutes / 60)} ساعة
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          ({item.totalMinutes} دقيقة)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Fullscreen Modal */}
      {showPrintModal && settings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-['Cairo',sans-serif]">
          <PrintableReport
            type={activeTab === 'monthly' ? 'monthly' : 'daily'}
            centerSettings={settings}
            dateOrMonth={activeTab === 'monthly' ? monthlyMonth : dailyDate}
            dateOrMonthFormatted={
              activeTab === 'monthly'
                ? monthlyData?.monthFormatted || monthlyMonth
                : dailyData?.dateFormatted || dailyDate
            }
            dayName={dailyData?.dayName}
            dailyItems={dailyData?.items}
            dailySummary={dailyData?.summary}
            monthlySpecialists={monthlyData?.specialists}
            monthlySummary={monthlyData?.summary}
            onClose={() => setShowPrintModal(false)}
          />
        </div>
      )}
    </div>
  );
};
