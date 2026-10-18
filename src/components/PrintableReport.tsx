import React from 'react';
import { DailyReportItem, MonthlyReportSpecialist, CenterSettings } from '../types.ts';
import { formatMinutesArabic, formatArabicTime } from '../lib/api.ts';
import { Printer, Download, Sparkles, Smile, Heart, CheckCircle2 } from 'lucide-react';

interface PrintableReportProps {
  type: 'daily' | 'monthly';
  centerSettings: CenterSettings;
  dateOrMonth: string;
  dateOrMonthFormatted: string;
  dayName?: string;
  dailyItems?: DailyReportItem[];
  dailySummary?: {
    expectedSpecialists: number;
    presentCount: number;
    absentCount: number;
    notRegisteredCount: number;
    totalSessions: number;
    totalMinutes: number;
  };
  monthlySpecialists?: MonthlyReportSpecialist[];
  monthlySummary?: {
    totalSpecialists: number;
    totalSessions: number;
    totalMinutes: number;
  };
  onClose?: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  type,
  centerSettings,
  dateOrMonth,
  dateOrMonthFormatted,
  dayName,
  dailyItems = [],
  dailySummary,
  monthlySpecialists = [],
  monthlySummary,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 font-['Cairo',sans-serif] p-4 sm:p-8 print:p-0">
      {/* Top action toolbar (Hidden when printing) */}
      <div className="no-print max-w-5xl mx-auto mb-6 bg-slate-100 p-4 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-600" />
          <span className="text-sm font-bold text-slate-800">
            معاينة تقرير الطباعة الرسمي (A4) - جاهز للطباعة وتصدير PDF
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (Print A4)</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-cyan-700 bg-white hover:bg-cyan-50 border border-cyan-200 shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير PDF (Save as PDF)</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* A4 Report Sheet Container */}
      <div className="max-w-[210mm] mx-auto bg-white border border-slate-200 print:border-none rounded-3xl print:rounded-none shadow-lg print:shadow-none p-8 sm:p-12 print:p-0">
        {/* Report Header */}
        <div className="border-b-2 border-slate-800 pb-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-2xl print:bg-slate-800 shrink-0">
                <Smile className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {centerSettings.centerName}
                </h1>
                <p className="text-sm font-extrabold text-teal-800 print:text-slate-700 mt-0.5">
                  تحت إشراف: {centerSettings.supervisorName}
                </p>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  نظام التخاطب وتنمية المهارات وتعديل السلوك للأطفال | توقيت جمهورية مصر العربية
                </div>
              </div>
            </div>

            <div className="text-left shrink-0">
              <div className="inline-block bg-slate-100 print:bg-slate-200 text-slate-900 font-black text-xs px-3 py-1 rounded-xl">
                {type === 'daily' ? 'تقرير يومي رسمي' : 'تقرير شهري مجمع'}
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1.5" dir="ltr">
                {dateOrMonth}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>
              الفترة / التاريخ المختار: <strong>{dateOrMonthFormatted}</strong> {dayName ? `(${dayName})` : ''}
            </span>
            <span>تاريخ إصدار التقرير: {new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</span>
          </div>
        </div>

        {/* Daily Summary Statistics */}
        {type === 'daily' && dailySummary && (
          <div className="mb-6 page-break-inside-avoid">
            <h3 className="text-sm font-black text-slate-800 mb-2.5">ملخص النشاط اليومي للمركز:</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">المجدولون</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{dailySummary.expectedSpecialists}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">الحاضرون</div>
                <div className="text-base font-black text-teal-800 mt-0.5">{dailySummary.presentCount}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">الغائبون</div>
                <div className="text-base font-black text-rose-800 mt-0.5">{dailySummary.absentCount}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">لم يسجلوا</div>
                <div className="text-base font-black text-amber-800 mt-0.5">{dailySummary.notRegisteredCount}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">إجمالي الجلسات</div>
                <div className="text-base font-black text-cyan-800 mt-0.5">{dailySummary.totalSessions}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50">
                <div className="text-slate-500 font-bold">إجمالي الدقائق</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">{dailySummary.totalMinutes} د</div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Summary Statistics */}
        {type === 'monthly' && monthlySummary && (
          <div className="mb-6 page-break-inside-avoid">
            <h3 className="text-sm font-black text-slate-800 mb-2.5">ملخص النشاط الشهري للمركز:</h3>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                <div className="text-slate-500 font-bold">إجمالي الأخصائيين</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{monthlySummary.totalSpecialists}</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                <div className="text-slate-500 font-bold">إجمالي الجلسات العلاجية</div>
                <div className="text-xl font-black text-cyan-800 mt-0.5">{monthlySummary.totalSessions} جلسة</div>
              </div>
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                <div className="text-slate-500 font-bold">إجمالي وقت التدريب</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{formatMinutesArabic(monthlySummary.totalMinutes)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Report Table */}
        {type === 'daily' && (
          <div className="space-y-5">
            <h3 className="text-sm font-black text-slate-800">بيان تفصيلي بالأخصائيين وجلسات الأطفال:</h3>
            <table className="w-full text-right border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black">
                  <th className="border border-slate-300 p-2 text-center w-10">#</th>
                  <th className="border border-slate-300 p-2">اسم الأخصائي</th>
                  <th className="border border-slate-300 p-2">التخصص</th>
                  <th className="border border-slate-300 p-2 text-center">حالة الحضور</th>
                  <th className="border border-slate-300 p-2 text-center">حضور</th>
                  <th className="border border-slate-300 p-2 text-center">انصراف</th>
                  <th className="border border-slate-300 p-2 text-center">الجلسات</th>
                  <th className="border border-slate-300 p-2 text-center">المدة</th>
                </tr>
              </thead>
              <tbody>
                {dailyItems.map((item, idx) => (
                  <React.Fragment key={item.specialistId}>
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-black text-slate-900">{item.specialistName}</td>
                      <td className="border border-slate-300 p-2 font-medium text-slate-600">{item.specialization}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            item.statusKey === 'present'
                              ? 'bg-teal-100 text-teal-900'
                              : item.statusKey === 'checked_out'
                              ? 'bg-sky-100 text-sky-900'
                              : item.statusKey === 'absent'
                              ? 'bg-rose-100 text-rose-900'
                              : item.statusKey === 'not_registered'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.statusText}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold">{formatArabicTime(item.checkInTime)}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold">{formatArabicTime(item.checkOutTime)}</td>
                      <td className="border border-slate-300 p-2 text-center font-black">{item.sessionsCount}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{item.totalMinutes} د</td>
                    </tr>

                    {/* Children session details row */}
                    {item.children.length > 0 && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={8} className="border border-slate-300 p-2 pr-6">
                          <div className="text-[11px] font-bold text-slate-700 mb-1">
                            جلسات الأطفال المنفذة:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.children.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="bg-white border border-slate-200 px-2 py-1 rounded-md text-[11px] text-slate-800"
                              >
                                <strong>{c.childName}</strong> ({c.durationMinutes} دقيقة)
                                {c.notes && <span className="text-slate-500 mr-1">- {c.notes}</span>}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly Report Table */}
        {type === 'monthly' && (
          <div className="space-y-5">
            <h3 className="text-sm font-black text-slate-800">بيان تفصيلي بإنتاجية الأخصائيين لشهر {dateOrMonthFormatted}:</h3>
            <table className="w-full text-right border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black">
                  <th className="border border-slate-300 p-2 text-center w-10">#</th>
                  <th className="border border-slate-300 p-2">اسم الأخصائي</th>
                  <th className="border border-slate-300 p-2">التخصص</th>
                  <th className="border border-slate-300 p-2 text-center">أيام الحضور</th>
                  <th className="border border-slate-300 p-2 text-center">أيام الغياب</th>
                  <th className="border border-slate-300 p-2 text-center">عدم التسجيل</th>
                  <th className="border border-slate-300 p-2 text-center">إجمالي الجلسات</th>
                  <th className="border border-slate-300 p-2 text-center">إجمالي الساعات</th>
                </tr>
              </thead>
              <tbody>
                {monthlySpecialists.map((spec, idx) => (
                  <tr key={spec.specialistId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-black text-slate-900">{spec.specialistName}</td>
                    <td className="border border-slate-300 p-2 font-medium text-slate-600">{spec.specialization}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-teal-800">{spec.presentDays} يوم</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-rose-800">{spec.absentDays} يوم</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-amber-800">{spec.notRegisteredDays} يوم</td>
                    <td className="border border-slate-300 p-2 text-center font-black text-cyan-800">{spec.totalSessions}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">
                      {Math.round(spec.totalMinutes / 60)} ساعة ({spec.totalMinutes} د)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Signature Section */}
        <div className="mt-12 pt-6 border-t border-slate-300 text-xs text-slate-700 flex items-center justify-between page-break-inside-avoid">
          <div>
            <div className="font-bold">مديرة المركز:</div>
            <div className="mt-4 font-black text-slate-900">د.نسيبة مرعي</div>
            <div className="text-[10px] text-slate-500">التوقيع والاعتماد: ....................</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-[10px] text-slate-400 font-bold mx-auto mb-1">
              ختم المركز الرسمي
            </div>
            <div className="text-[10px] text-slate-500">{centerSettings.centerName}</div>
          </div>

          <div className="text-left">
            <div className="font-bold">المشرف العام :</div>
            <div className="mt-4 font-black text-slate-900">{centerSettings.supervisorName}</div>
            <div className="text-[10px] text-slate-500">التوقيع والاعتماد: ....................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
