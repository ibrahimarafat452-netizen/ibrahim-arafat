import { Router, type Response } from 'express';
import { db } from '../db.ts';
import { authenticate, requireSpecialist, type AuthenticatedRequest } from '../auth.ts';
import { getCairoTodayDate, getCairoCurrentTime, formatCairoArabicDate } from '../time.ts';

export const specialistRouter = Router();

// Apply auth & specialist role check to all specialist routes
specialistRouter.use(authenticate, requireSpecialist);

// Get specialist's dashboard data for today
specialistRouter.get('/today', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const today = getCairoTodayDate();
    const cairoTime = getCairoCurrentTime();

    const attendance = db.getAttendanceRecord(specialistId, today);
    const sessions = db.getSessions(specialistId, today);

    const totalSessions = sessions.length;
    const totalDurationMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    return res.json({
      today,
      cairoTime,
      todayFormatted: formatCairoArabicDate(today),
      attendance: attendance || null,
      sessions,
      totalSessions,
      totalDurationMinutes,
      settings: db.getSettings(),
    });
  } catch (error: any) {
    console.error('Error fetching specialist today data:', error);
    return res.status(500).json({ error: error.message || 'فشل جلب بيانات اليوم' });
  }
});

// Check-in
specialistRouter.post('/attendance/check-in', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const today = getCairoTodayDate();
    const cairoTime = getCairoCurrentTime();
    const { notes } = req.body;

    const record = db.recordCheckIn(specialistId, today, cairoTime, notes);

    return res.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح!',
      record,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تسجيل الحضور' });
  }
});

// Check-out
specialistRouter.post('/attendance/check-out', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const today = getCairoTodayDate();
    const cairoTime = getCairoCurrentTime();

    const record = db.recordCheckOut(specialistId, today, cairoTime);

    return res.json({
      success: true,
      message: 'تم تسجيل الانصراف بنجاح!',
      record,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تسجيل الانصراف' });
  }
});

// Mark as absent
specialistRouter.post('/attendance/mark-absent', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const today = getCairoTodayDate();
    const { notes } = req.body;

    const record = db.recordAbsence(specialistId, today, notes);

    return res.json({
      success: true,
      message: 'تم تسجيل الغياب بنجاح.',
      record,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تسجيل الغياب' });
  }
});

// Get sessions for a date
specialistRouter.get('/sessions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const date = (req.query.date as string) || getCairoTodayDate();
    const sessions = db.getSessions(specialistId, date);

    return res.json({
      date,
      sessions,
      totalSessions: sessions.length,
      totalDurationMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل جلب الجلسات' });
  }
});

// Add a session
specialistRouter.post('/sessions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const today = getCairoTodayDate();
    const { childName, durationMinutes, notes, date } = req.body;

    const sessionDate = date || today;

    // Check attendance state
    const attendance = db.getAttendanceRecord(specialistId, sessionDate);
    if (attendance && attendance.status === 'absent') {
      return res.status(400).json({ error: 'لا يمكن إضافة جلسات ليوم مسجل فيه غياب.' });
    }

    const duration = Number(durationMinutes);
    if (!childName || !childName.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال اسم الطفل' });
    }
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال مدة الجلسة بالدقائق بشكل صحيح' });
    }

    const session = db.addSession(specialistId, sessionDate, childName, duration, notes);

    return res.json({
      success: true,
      message: 'تم تسجيل الجلسة بنجاح!',
      session,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تسجيل الجلسة' });
  }
});

// Update a session
specialistRouter.put('/sessions/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const { id } = req.params;
    const { childName, durationMinutes, notes } = req.body;

    const duration = durationMinutes !== undefined ? Number(durationMinutes) : undefined;
    const updated = db.updateSession(id, specialistId, {
      childName,
      durationMinutes: duration,
      notes,
    });

    return res.json({
      success: true,
      message: 'تم تعديل الجلسة بنجاح!',
      session: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل تعديل الجلسة' });
  }
});

// Delete a session
specialistRouter.delete('/sessions/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const { id } = req.params;

    db.deleteSession(id, specialistId);

    return res.json({
      success: true,
      message: 'تم حذف الجلسة بنجاح',
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'فشل حذف الجلسة' });
  }
});

// Get specialist's own attendance & session history
specialistRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const specialistId = req.user!.id;
    const startDate = (req.query.startDate as string) || '2026-01-01';
    const endDate = (req.query.endDate as string) || getCairoTodayDate();

    const attendances = db.getAttendanceRange(startDate, endDate, specialistId);
    const sessions = db.getSessionsRange(startDate, endDate, specialistId);

    // Group sessions by date
    const sessionsByDate: Record<string, any[]> = {};
    sessions.forEach((s) => {
      if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
      sessionsByDate[s.date].push(s);
    });

    return res.json({
      attendances,
      sessionsByDate,
      totalSessions: sessions.length,
      totalDurationMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل جلب سجلات الأخصائي' });
  }
});
