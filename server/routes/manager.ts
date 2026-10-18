import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, type User, type AttendanceRecord, type TherapySession } from '../db.ts';
import { authenticate, requireManager, type AuthenticatedRequest } from '../auth.ts';
import { getFirestoreServer, syncDatabaseToFirestore } from '../firebase.ts';
import {
  getCairoTodayDate,
  getCairoCurrentTime,
  getCairoDayOfWeek,
  formatCairoArabicDate,
  ARABIC_DAYS_NAMES,
} from '../time.ts';

export const managerRouter = Router();

managerRouter.use(authenticate, requireManager);

// Compute real-time notifications for missing records & alerts
function generateNotifications() {
  const today = getCairoTodayDate();
  const cairoTime = getCairoCurrentTime();
  const cairoDay = getCairoDayOfWeek();
  const settings = db.getSettings();
  const dismissed = db.getDismissedNotifications();

  const specialists = db.getSpecialists(false); // active only
  const attendances = db.getAttendanceByDate(today);
  const sessions = db.getSessions(undefined, today);

  const notifications: Array<{
    id: string;
    specialistId: string;
    specialistName: string;
    type: 'missing_check_in' | 'missing_check_out' | 'missing_sessions';
    severity: 'high' | 'medium' | 'info';
    title: string;
    message: string;
    time: string;
    date: string;
    isDismissed: boolean;
  }> = [];

  const [currH, currM] = cairoTime.split(':').map(Number);
  const currentMinutes = currH * 60 + currM;

  const [alertH, alertM] = (settings.missingAlertTime || '10:30').split(':').map(Number);
  const alertMinutes = alertH * 60 + alertM;

  const [endH, endM] = (settings.workEndTime || '16:00').split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  for (const spec of specialists) {
    // Check if expected to work today
    const specWorkingDays = spec.workingDays || settings.workingDays;
    const isExpected = specWorkingDays.includes(cairoDay);

    if (!isExpected) continue;

    const att = attendances.find((a) => a.specialistId === spec.id);
    const specSessions = sessions.filter((s) => s.specialistId === spec.id);

    // 1. Missing Check-in (after alert time and no record at all)
    if (!att && currentMinutes >= alertMinutes) {
      const id = `notif_checkin_${spec.id}_${today}`;
      notifications.push({
        id,
        specialistId: spec.id,
        specialistName: spec.name,
        type: 'missing_check_in',
        severity: 'high',
        title: 'تأخر / عدم تسجيل حضور',
        message: `${spec.name} لم يسجل الحضور أو الغياب حتى الآن بعد وقت التنبيه (${settings.missingAlertTime}).`,
        time: cairoTime,
        date: today,
        isDismissed: dismissed.includes(id),
      });
    }

    // 2. Checked in but missing check-out (after end of workday)
    if (att && att.status === 'present' && !att.checkOutTime && currentMinutes >= endMinutes) {
      const id = `notif_checkout_${spec.id}_${today}`;
      notifications.push({
        id,
        specialistId: spec.id,
        specialistName: spec.name,
        type: 'missing_check_out',
        severity: 'medium',
        title: 'عدم تسجيل انصراف',
        message: `${spec.name} سجل حضور في (${att.checkInTime}) لكنه لم يسجل الانصراف بعد انتهاء ساعات العمل (${settings.workEndTime}).`,
        time: cairoTime,
        date: today,
        isDismissed: dismissed.includes(id),
      });
    }

    // 3. Checked in but no sessions recorded (after alert time + 1 hour or midway through day)
    if (att && att.status !== 'absent' && specSessions.length === 0 && currentMinutes >= alertMinutes + 30) {
      const id = `notif_sessions_${spec.id}_${today}`;
      notifications.push({
        id,
        specialistId: spec.id,
        specialistName: spec.name,
        type: 'missing_sessions',
        severity: 'info',
        title: 'لا توجد جلسات مسجلة',
        message: `${spec.name} مسجل حضور لكنه لم يقم بإضافة أي جلسات علاجية للأطفال اليوم حتى الآن.`,
        time: cairoTime,
        date: today,
        isDismissed: dismissed.includes(id),
      });
    }
  }

  return notifications;
}

// Manager Dashboard stats
managerRouter.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getCairoTodayDate();
    const cairoTime = getCairoCurrentTime();
    const cairoDay = getCairoDayOfWeek();
    const settings = db.getSettings();

    const activeSpecialists = db.getSpecialists(false);
    const attendances = db.getAttendanceByDate(today);
    const sessions = db.getSessions(undefined, today);

    // Expected specialists today
    const expectedToday = activeSpecialists.filter((s) => {
      const days = s.workingDays || settings.workingDays;
      return days.includes(cairoDay);
    });

    let checkedInCount = 0;
    let checkedOutCount = 0;
    let explicitlyAbsentCount = 0;

    attendances.forEach((a) => {
      if (a.status === 'present') checkedInCount++;
      if (a.status === 'checked_out') {
        checkedInCount++;
        checkedOutCount++;
      }
      if (a.status === 'absent') explicitlyAbsentCount++;
    });

    // Not registered yet: expected today but has no attendance record
    const notRegisteredSpecialists = expectedToday.filter(
      (s) => !attendances.some((a) => a.specialistId === s.id)
    );
    const notRegisteredCount = notRegisteredSpecialists.length;

    const totalSessionsToday = sessions.length;
    const totalDurationMinutesToday = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const notifications = generateNotifications();
    const activeNotifications = notifications.filter((n) => !n.isDismissed);

    return res.json({
      today,
      cairoTime,
      todayFormatted: formatCairoArabicDate(today),
      dayName: ARABIC_DAYS_NAMES[cairoDay],
      stats: {
        totalActiveSpecialists: activeSpecialists.length,
        expectedTodayCount: expectedToday.length,
        checkedInCount,
        checkedOutCount,
        explicitlyAbsentCount,
        notRegisteredCount,
        totalSessionsToday,
        totalDurationMinutesToday,
      },
      settings,
      notifications: activeNotifications,
      unreadNotificationsCount: activeNotifications.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل جلب بيانات لوحة التحكم' });
  }
});

// Daily monitoring list
managerRouter.get('/daily-monitoring', (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || getCairoTodayDate();
    const cairoTime = getCairoCurrentTime();
    const settings = db.getSettings();

    // Calculate day of week for the queried date
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = getCairoDayOfWeek(dateObj);

    const specialists = db.getSpecialists(true); // show all who were active or historical
    const attendances = db.getAttendanceByDate(date);
    const sessions = db.getSessions(undefined, date);

    const list = specialists.map((spec) => {
      const specWorkingDays = spec.workingDays || settings.workingDays;
      const isExpected = spec.isActive && specWorkingDays.includes(dayOfWeek);
      const att = attendances.find((a) => a.specialistId === spec.id);
      const specSessions = sessions.filter((s) => s.specialistId === spec.id);
      const sessionMinutes = specSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      let statusDisplay: 'present' | 'checked_out' | 'absent' | 'not_registered' | 'day_off' = 'not_registered';
      let completeness: 'complete' | 'in_progress' | 'missing_checkout' | 'missing_sessions' | 'not_registered' | 'absent' | 'day_off' = 'not_registered';

      if (!isExpected) {
        statusDisplay = 'day_off';
        completeness = 'day_off';
      } else if (!att) {
        statusDisplay = 'not_registered';
        completeness = 'not_registered';
      } else if (att.status === 'absent') {
        statusDisplay = 'absent';
        completeness = 'absent';
      } else if (att.status === 'checked_out') {
        statusDisplay = 'checked_out';
        completeness = specSessions.length > 0 ? 'complete' : 'missing_sessions';
      } else if (att.status === 'present') {
        statusDisplay = 'present';
        completeness = 'in_progress';
      }

      return {
        specialist: {
          id: spec.id,
          name: spec.name,
          phone: spec.phone,
          specialization: spec.specialization,
          isActive: spec.isActive,
        },
        isExpected,
        attendance: att || null,
        statusDisplay,
        completeness,
        checkInTime: att?.checkInTime || null,
        checkOutTime: att?.checkOutTime || null,
        absenceReason: att?.status === 'absent' ? att.notes : null,
        sessionsCount: specSessions.length,
        totalMinutes: sessionMinutes,
        sessions: specSessions,
      };
    });

    return res.json({
      date,
      dateFormatted: formatCairoArabicDate(date),
      dayName: ARABIC_DAYS_NAMES[dayOfWeek],
      cairoTime,
      monitoringList: list,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل جلب بيانات المتابعة اليومية' });
  }
});

// Notifications
managerRouter.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  try {
    const all = generateNotifications();
    return res.json({
      notifications: all,
      unreadCount: all.filter((n) => !n.isDismissed).length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

managerRouter.post('/notifications/dismiss', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'معرف التنبيه مطلوب' });
    db.dismissNotification(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Specialists management
managerRouter.get('/specialists', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialists = db.getSpecialists(true); // include inactive
    const today = getCairoTodayDate();

    const result = specialists.map((spec) => {
      const allSessions = db.getSessions(spec.id);
      const totalSessions = allSessions.length;
      const totalMinutes = allSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const todayAttendance = db.getAttendanceRecord(spec.id, today);

      return {
        id: spec.id,
        name: spec.name,
        phone: spec.phone,
        specialization: spec.specialization,
        workingDays: spec.workingDays,
        isActive: spec.isActive,
        createdAt: spec.createdAt,
        deactivatedAt: spec.deactivatedAt,
        totalSessions,
        totalMinutes,
        todayStatus: todayAttendance?.status || 'none',
      };
    });

    return res.json({ specialists: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create Specialist
managerRouter.post('/specialists', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, password, specialization, workingDays } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال اسم الأخصائي' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال رقم الهاتف' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 خانات' });
    }

    const cleanPhone = phone.trim();
    const existing = db.getUserByPhone(cleanPhone);
    if (existing) {
      return res.status(400).json({ error: 'رقم الهاتف مسجل بالفعل لأخصائي آخر' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const defaultWorkingDays = db.getSettings().workingDays;
    const finalWorkingDays = Array.isArray(workingDays) && workingDays.length > 0
      ? workingDays
      : defaultWorkingDays;

    const user = db.createUser({
      name: name.trim(),
      phone: cleanPhone,
      passwordHash,
      role: 'specialist',
      specialization: specialization?.trim() || 'أخصائي تخاطب وتنمية مهارات',
      workingDays: finalWorkingDays,
      isActive: true,
    });

    const { passwordHash: _, ...safeUser } = user;
    return res.status(201).json({
      success: true,
      message: 'تم إضافة الأخصائي بنجاح!',
      specialist: safeUser,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل إضافة الأخصائي' });
  }
});

// Edit Specialist
managerRouter.put('/specialists/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, password, specialization, workingDays, isActive } = req.body;

    const user = db.getUserById(id);
    if (!user || user.role !== 'specialist') {
      return res.status(404).json({ error: 'الأخصائي غير موجود' });
    }

    const updates: Partial<User> = {};

    if (name && name.trim()) updates.name = name.trim();
    if (specialization) updates.specialization = specialization.trim();
    if (Array.isArray(workingDays)) updates.workingDays = workingDays;

    if (phone && phone.trim() !== user.phone) {
      const cleanPhone = phone.trim();
      const existing = db.getUserByPhone(cleanPhone);
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'رقم الهاتف الجديد مستخدم بالفعل' });
      }
      updates.phone = cleanPhone;
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 خانات' });
      }
      const salt = bcrypt.genSaltSync(10);
      updates.passwordHash = bcrypt.hashSync(password, salt);
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
      if (!updates.isActive) {
        updates.deactivatedAt = new Date().toISOString();
      } else {
        updates.deactivatedAt = null;
      }
    }

    const updated = db.updateUser(id, updates);
    const { passwordHash: _, ...safeUser } = updated!;

    return res.json({
      success: true,
      message: 'تم تعديل بيانات الأخصائي بنجاح!',
      specialist: safeUser,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تعديل الأخصائي' });
  }
});

// Delete Specialist Account (permanent deletion or with history removal option)
managerRouter.delete('/specialists/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleteHistory = req.query.deleteHistory === 'true' || req.body?.deleteHistory === true;

    const user = db.getUserById(id);
    if (!user || user.role !== 'specialist') {
      return res.status(404).json({ error: 'الأخصائي غير موجود' });
    }

    db.deleteSpecialist(id, deleteHistory);

    return res.json({
      success: true,
      message: 'تم حذف حساب الأخصائي بنجاح.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل حذف الأخصائي' });
  }
});

// Specialist detail with all past history
managerRouter.get('/specialists/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'الأخصائي غير موجود' });
    }

    const attendances = db.getAttendanceRange('2020-01-01', '2099-12-31', id);
    const sessions = db.getSessions(id);

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      specialist: safeUser,
      attendances,
      sessions,
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Daily Report
managerRouter.get('/reports/daily', (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || getCairoTodayDate();
    const specialistId = req.query.specialistId as string;
    const settings = db.getSettings();

    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = getCairoDayOfWeek(dateObj);

    let specialists = db.getSpecialists(true);
    if (specialistId && specialistId !== 'all') {
      specialists = specialists.filter((s) => s.id === specialistId);
    }

    const attendances = db.getAttendanceByDate(date);
    const sessions = db.getSessions(undefined, date);

    const reportItems = specialists.map((spec) => {
      const specWorkingDays = spec.workingDays || settings.workingDays;
      const isExpected = spec.isActive && specWorkingDays.includes(dayOfWeek);
      const att = attendances.find((a) => a.specialistId === spec.id);
      const specSessions = sessions.filter((s) => s.specialistId === spec.id);
      const totalMinutes = specSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      let statusText = 'لم يسجل';
      let statusKey: 'present' | 'checked_out' | 'absent' | 'not_registered' | 'day_off' = 'not_registered';

      if (!isExpected) {
        statusText = 'يوم إجازة / غير مجدول';
        statusKey = 'day_off';
      } else if (!att) {
        statusText = 'لم يسجل الحضور';
        statusKey = 'not_registered';
      } else if (att.status === 'absent') {
        statusText = 'غائب (مسجل)';
        statusKey = 'absent';
      } else if (att.status === 'checked_out') {
        statusText = 'حاضر (انصراف مسجل)';
        statusKey = 'checked_out';
      } else if (att.status === 'present') {
        statusText = 'حاضر (قيد العمل)';
        statusKey = 'present';
      }

      return {
        specialistId: spec.id,
        specialistName: spec.name,
        specialization: spec.specialization,
        phone: spec.phone,
        isExpected,
        statusKey,
        statusText,
        checkInTime: att?.checkInTime || '-',
        checkOutTime: att?.checkOutTime || '-',
        absenceNotes: att?.status === 'absent' ? att.notes : null,
        sessionsCount: specSessions.length,
        totalMinutes,
        children: specSessions.map((s) => ({
          childName: s.childName,
          durationMinutes: s.durationMinutes,
          notes: s.notes,
        })),
      };
    });

    const totalSessions = reportItems.reduce((acc, item) => acc + item.sessionsCount, 0);
    const totalMinutes = reportItems.reduce((acc, item) => acc + item.totalMinutes, 0);
    const expectedCount = reportItems.filter((i) => i.isExpected).length;
    const presentCount = reportItems.filter((i) => i.statusKey === 'present' || i.statusKey === 'checked_out').length;
    const absentCount = reportItems.filter((i) => i.statusKey === 'absent').length;
    const notRegisteredCount = reportItems.filter((i) => i.statusKey === 'not_registered' && i.isExpected).length;

    return res.json({
      date,
      dateFormatted: formatCairoArabicDate(date),
      dayName: ARABIC_DAYS_NAMES[dayOfWeek],
      centerName: settings.centerName,
      supervisorName: settings.supervisorName,
      summary: {
        expectedSpecialists: expectedCount,
        presentCount,
        absentCount,
        notRegisteredCount,
        totalSessions,
        totalMinutes,
      },
      items: reportItems,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Monthly Report
managerRouter.get('/reports/monthly', (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getCairoTodayDate();
    const month = (req.query.month as string) || today.substring(0, 7); // YYYY-MM
    const specialistId = req.query.specialistId as string;
    const settings = db.getSettings();

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mNum = parseInt(monthStr, 10);

    const startDate = `${month}-01`;
    const daysInMonth = new Date(year, mNum, 0).getDate();
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    let specialists = db.getSpecialists(true);
    if (specialistId && specialistId !== 'all') {
      specialists = specialists.filter((s) => s.id === specialistId);
    }

    const attendances = db.getAttendanceRange(startDate, endDate);
    const sessions = db.getSessionsRange(startDate, endDate);

    // Calculate dates up to today (or end of month if past month)
    const lastDayToCheck = month === today.substring(0, 7) ? parseInt(today.substring(8, 10), 10) : daysInMonth;

    const breakdown = specialists.map((spec) => {
      const specWorkingDays = spec.workingDays || settings.workingDays;
      const specAtts = attendances.filter((a) => a.specialistId === spec.id);
      const specSessions = sessions.filter((s) => s.specialistId === spec.id);

      let presentDays = 0;
      let absentDays = 0;
      let notRegisteredDays = 0;
      let scheduledWorkDays = 0;

      for (let day = 1; day <= lastDayToCheck; day++) {
        const dStr = `${month}-${String(day).padStart(2, '0')}`;
        const dObj = new Date(Date.UTC(year, mNum - 1, day, 12, 0, 0));
        const dayOfWeek = getCairoDayOfWeek(dObj);

        const isScheduled = specWorkingDays.includes(dayOfWeek);
        if (isScheduled) {
          scheduledWorkDays++;
          const att = specAtts.find((a) => a.date === dStr);
          if (!att) {
            notRegisteredDays++;
          } else if (att.status === 'absent') {
            absentDays++;
          } else {
            presentDays++;
          }
        }
      }

      const totalMinutes = specSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      return {
        specialistId: spec.id,
        specialistName: spec.name,
        specialization: spec.specialization,
        phone: spec.phone,
        isActive: spec.isActive,
        scheduledWorkDays,
        presentDays,
        absentDays,
        notRegisteredDays,
        totalSessions: specSessions.length,
        totalMinutes,
      };
    });

    const totalSessionsAll = breakdown.reduce((acc, b) => acc + b.totalSessions, 0);
    const totalMinutesAll = breakdown.reduce((acc, b) => acc + b.totalMinutes, 0);

    return res.json({
      month,
      monthFormatted: new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long' }).format(
        new Date(year, mNum - 1, 1)
      ),
      centerName: settings.centerName,
      supervisorName: settings.supervisorName,
      summary: {
        totalSpecialists: specialists.length,
        totalSessions: totalSessionsAll,
        totalMinutes: totalMinutesAll,
      },
      specialists: breakdown,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Performance Rankings
managerRouter.get('/statistics/rankings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getCairoTodayDate();
    const period = (req.query.period as string) || 'month'; // 'today', 'week', 'month', 'all', 'custom'
    let startDate = req.query.startDate as string;
    let endDate = (req.query.endDate as string) || today;

    if (period === 'today') {
      startDate = today;
      endDate = today;
    } else if (period === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = getCairoTodayDate(d);
    } else if (period === 'month') {
      startDate = `${today.substring(0, 7)}-01`;
    } else if (period === 'all') {
      startDate = '2020-01-01';
    } else if (!startDate) {
      startDate = `${today.substring(0, 7)}-01`;
    }

    const specialists = db.getSpecialists(true);
    const sessions = db.getSessionsRange(startDate, endDate);

    const rankingData = specialists.map((spec) => {
      const specSessions = sessions.filter((s) => s.specialistId === spec.id);
      const totalSessions = specSessions.length;
      const totalMinutes = specSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      return {
        specialistId: spec.id,
        name: spec.name,
        specialization: spec.specialization,
        isActive: spec.isActive,
        totalSessions,
        totalMinutes,
      };
    });

    // 1. Ranked by sessions count
    const rankedBySessions = [...rankingData].sort((a, b) => b.totalSessions - a.totalSessions);
    // 2. Ranked by total duration
    const rankedByDuration = [...rankingData].sort((a, b) => b.totalMinutes - a.totalMinutes);

    return res.json({
      period,
      startDate,
      endDate,
      disclaimer:
        'ملاحظة هامة: هذه الإحصائيات والترتيبات تقيس حجم وساعات العمل المسجلة فقط، ولا تعكس جودة الجلسات أو مدى الفعالية الإكلينيكية والعلاجية للأخصائي.',
      rankedBySessions,
      rankedByDuration,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Center Settings
managerRouter.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ settings: db.getSettings() });
});

managerRouter.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      centerName,
      centerLogo,
      supervisorName,
      workingDays,
      workStartTime,
      workEndTime,
      missingAlertTime,
      minDailySessionsTarget,
    } = req.body;

    const current = db.getSettings();
    const updated = db.updateSettings({
      centerName: centerName?.trim() || current.centerName,
      centerLogo: centerLogo || current.centerLogo,
      supervisorName: supervisorName?.trim() || current.supervisorName,
      workingDays: Array.isArray(workingDays) ? workingDays : current.workingDays,
      workStartTime: workStartTime || current.workStartTime,
      workEndTime: workEndTime || current.workEndTime,
      missingAlertTime: missingAlertTime || current.missingAlertTime,
      minDailySessionsTarget: minDailySessionsTarget ? Number(minDailySessionsTarget) : current.minDailySessionsTarget,
    });

    return res.json({
      success: true,
      message: 'تم تحديث إعدادات المركز بنجاح!',
      settings: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تحديث الإعدادات' });
  }
});

// Backup & Data Protection Endpoints
managerRouter.get('/backup/export', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = db.exportData();
    const today = getCairoTodayDate();
    const [h, m] = getCairoCurrentTime().split(':');
    const filename = `center-backup-${today}-${h}-${m}.json`;

    // Validate structural integrity before returning
    if (!data || !Array.isArray(data.collections?.users) || data.collections.users.length === 0) {
      throw new Error('فشل التحقق من صحة بنية النسخة الاحتياطية قبل التصدير.');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل تصدير النسخة الاحتياطية' });
  }
});

managerRouter.post('/backup/import', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { backupData, mode } = req.body;
    const targetData = backupData || req.body;
    const result = db.importData(targetData, mode || 'merge');
    // Asynchronously synchronize imported state to Cloud Firestore
    syncDatabaseToFirestore(db.exportData()).catch(() => {});
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل استيراد النسخة الاحتياطية' });
  }
});

managerRouter.get('/backup/list', (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = db.listBackups();
    return res.json({ backups });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل جلب قائمة النسخ الاحتياطية' });
  }
});

managerRouter.post('/backup/restore', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'اسم ملف النسخة مطلوب.' });
    }
    const result = db.restoreBackup(fileName);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل استعادة النسخة الاحتياطية' });
  }
});

managerRouter.post('/backup/create', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label } = req.body || {};
    const result = db.createManualBackup(label);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل إنشاء النسخة الاحتياطية' });
  }
});

// Firebase Cloud Sync Endpoints
managerRouter.get('/firebase/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const firestore = getFirestoreServer();
    return res.json({
      connected: !!firestore,
      databaseId: 'ai-studio-4fd5cba3-8f2c-4039-bacd-f62d0d692a24',
      projectId: 'gen-lang-client-0560980802',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

managerRouter.post('/firebase/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fullData = db.exportData();
    const result = await syncDatabaseToFirestore(fullData);
    return res.json({
      success: true,
      message: 'تمت مزامنة جميع البيانات مع Firebase Firestore بنجاح!',
      result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشلت المزامنة مع Firebase' });
  }
});



