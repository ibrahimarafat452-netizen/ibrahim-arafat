import {
  User,
  AttendanceRecord,
  TherapySession,
  CenterSettings,
  SystemNotification,
  DailyReportItem,
  MonthlyReportSpecialist,
} from '../types.ts';

const TOKEN_KEY = 'speech_therapy_center_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error('تعذر الاتصال بالخادم حالياً. تأكد من اتصال الإنترنت.');
  }

  if (res.status === 401) {
    // If token expired or invalid, clear it
    setStoredToken(null);
    throw new Error('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `خطأ في الطلب (${res.status})`);
  }

  return data as T;
}

// Format minutes into Arabic hours & minutes
export function formatMinutesArabic(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 دقيقة';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) {
    return hours === 1 ? 'ساعة واحدة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
  }
  const hoursText = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
  return `${hoursText} و ${minutes} دقيقة`;
}

// Format 24-hr time to friendly 12-hr Arabic
export function formatArabicTime(timeStr?: string | null): string {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const mins = parts[1];
  const ampm = hours >= 12 ? 'م' : 'ص';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mins} ${ampm}`;
}

export const ARABIC_DAYS_MAP: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

// API Services
export const authApi = {
  login: (phone: string, password: string) =>
    fetchApi<{ token: string; user: User; cairoToday: string; cairoTime: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  getMe: () =>
    fetchApi<{ user: User; cairoToday: string; cairoTime: string; settings: CenterSettings }>('/api/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  loginWithFirebase: (payload: { email: string; uid: string; name?: string }) =>
    fetchApi<{ token: string; user: User; cairoToday: string; cairoTime: string }>('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const specialistApi = {
  getToday: () =>
    fetchApi<{
      today: string;
      cairoTime: string;
      todayFormatted: string;
      attendance: AttendanceRecord | null;
      sessions: TherapySession[];
      totalSessions: number;
      totalDurationMinutes: number;
      settings: CenterSettings;
    }>('/api/specialist/today'),

  checkIn: (data?: { checkInTime?: string; notes?: string }) =>
    fetchApi<{ success: boolean; message: string; record: AttendanceRecord }>(
      '/api/specialist/attendance/check-in',
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    ),

  checkOut: (data?: { checkOutTime?: string }) =>
    fetchApi<{ success: boolean; message: string; record: AttendanceRecord }>(
      '/api/specialist/attendance/check-out',
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    ),

  saveAttendanceTimes: (data: { date?: string; checkInTime?: string; checkOutTime?: string; notes?: string }) =>
    fetchApi<{ success: boolean; message: string; record: AttendanceRecord }>(
      '/api/specialist/attendance/save-times',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  markAbsent: (notes?: string) =>
    fetchApi<{ success: boolean; message: string; record: AttendanceRecord }>(
      '/api/specialist/attendance/mark-absent',
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    ),

  getSessions: (date?: string) =>
    fetchApi<{
      date: string;
      sessions: TherapySession[];
      totalSessions: number;
      totalDurationMinutes: number;
    }>(`/api/specialist/sessions${date ? `?date=${date}` : ''}`),

  addSession: (data: { childName: string; durationMinutes: number; notes?: string; date?: string }) =>
    fetchApi<{ success: boolean; message: string; session: TherapySession }>('/api/specialist/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSession: (id: string, data: { childName?: string; durationMinutes?: number; notes?: string }) =>
    fetchApi<{ success: boolean; message: string; session: TherapySession }>(`/api/specialist/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSession: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/api/specialist/sessions/${id}`, {
      method: 'DELETE',
    }),

  getHistory: (startDate?: string, endDate?: string) =>
    fetchApi<{
      attendances: AttendanceRecord[];
      sessionsByDate: Record<string, TherapySession[]>;
      totalSessions: number;
      totalDurationMinutes: number;
    }>(`/api/specialist/history?startDate=${startDate || ''}&endDate=${endDate || ''}`),
};

export const managerApi = {
  getDashboard: () =>
    fetchApi<{
      today: string;
      cairoTime: string;
      todayFormatted: string;
      dayName: string;
      stats: {
        totalActiveSpecialists: number;
        expectedTodayCount: number;
        checkedInCount: number;
        checkedOutCount: number;
        explicitlyAbsentCount: number;
        notRegisteredCount: number;
        totalSessionsToday: number;
        totalDurationMinutesToday: number;
      };
      settings: CenterSettings;
      notifications: SystemNotification[];
      unreadNotificationsCount: number;
    }>('/api/manager/dashboard'),

  getDailyMonitoring: (date?: string) =>
    fetchApi<{
      date: string;
      dateFormatted: string;
      dayName: string;
      cairoTime: string;
      monitoringList: Array<{
        specialist: {
          id: string;
          name: string;
          phone: string;
          specialization: string;
          isActive: boolean;
        };
        isExpected: boolean;
        attendance: AttendanceRecord | null;
        statusDisplay: 'present' | 'checked_out' | 'absent' | 'not_registered' | 'day_off';
        completeness: 'complete' | 'in_progress' | 'missing_checkout' | 'missing_sessions' | 'not_registered' | 'absent' | 'day_off';
        checkInTime: string | null;
        checkOutTime: string | null;
        absenceReason: string | null;
        sessionsCount: number;
        totalMinutes: number;
        sessions: TherapySession[];
      }>;
    }>(`/api/manager/daily-monitoring${date ? `?date=${date}` : ''}`),

  saveSpecialistAttendanceTimes: (data: {
    specialistId: string;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    status?: string;
    notes?: string;
  }) =>
    fetchApi<{ success: boolean; message: string; record: AttendanceRecord }>(
      '/api/manager/attendance/save-times',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getSpecialists: () =>
    fetchApi<{
      specialists: Array<{
        id: string;
        name: string;
        phone: string;
        specialization: string;
        workingDays: number[];
        isActive: boolean;
        createdAt: string;
        deactivatedAt?: string | null;
        totalSessions: number;
        totalMinutes: number;
        todayStatus: string;
      }>;
    }>('/api/manager/specialists'),

  createSpecialist: (data: {
    name: string;
    phone: string;
    password: string;
    specialization?: string;
    workingDays?: number[];
  }) =>
    fetchApi<{ success: boolean; message: string; specialist: User }>('/api/manager/specialists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSpecialist: (
    id: string,
    data: {
      name?: string;
      phone?: string;
      password?: string;
      specialization?: string;
      workingDays?: number[];
      isActive?: boolean;
    }
  ) =>
    fetchApi<{ success: boolean; message: string; specialist: User }>(`/api/manager/specialists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSpecialist: (id: string, deleteHistory = false) =>
    fetchApi<{ success: boolean; message: string }>(`/api/manager/specialists/${id}?deleteHistory=${deleteHistory}`, {
      method: 'DELETE',
    }),

  getSpecialistDetail: (id: string) =>
    fetchApi<{
      specialist: User;
      attendances: AttendanceRecord[];
      sessions: TherapySession[];
      totalSessions: number;
      totalMinutes: number;
    }>(`/api/manager/specialists/${id}`),

  getDailyReport: (date?: string, specialistId?: string) =>
    fetchApi<{
      date: string;
      dateFormatted: string;
      dayName: string;
      centerName: string;
      supervisorName: string;
      summary: {
        expectedSpecialists: number;
        presentCount: number;
        absentCount: number;
        notRegisteredCount: number;
        totalSessions: number;
        totalMinutes: number;
      };
      items: DailyReportItem[];
    }>(`/api/manager/reports/daily?date=${date || ''}&specialistId=${specialistId || 'all'}`),

  getMonthlyReport: (month?: string, specialistId?: string) =>
    fetchApi<{
      month: string;
      monthFormatted: string;
      centerName: string;
      supervisorName: string;
      summary: {
        totalSpecialists: number;
        totalSessions: number;
        totalMinutes: number;
      };
      specialists: MonthlyReportSpecialist[];
    }>(`/api/manager/reports/monthly?month=${month || ''}&specialistId=${specialistId || 'all'}`),

  getRankings: (period?: string, startDate?: string, endDate?: string) =>
    fetchApi<{
      period: string;
      startDate: string;
      endDate: string;
      disclaimer: string;
      rankedBySessions: Array<{
        specialistId: string;
        name: string;
        specialization: string;
        isActive: boolean;
        totalSessions: number;
        totalMinutes: number;
      }>;
      rankedByDuration: Array<{
        specialistId: string;
        name: string;
        specialization: string;
        isActive: boolean;
        totalSessions: number;
        totalMinutes: number;
      }>;
    }>(`/api/manager/statistics/rankings?period=${period || 'month'}&startDate=${startDate || ''}&endDate=${endDate || ''}`),

  getSettings: () => fetchApi<{ settings: CenterSettings }>('/api/manager/settings'),

  updateSettings: (data: Partial<CenterSettings>) =>
    fetchApi<{ success: boolean; message: string; settings: CenterSettings }>('/api/manager/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getNotifications: () =>
    fetchApi<{ notifications: SystemNotification[]; unreadCount: number }>('/api/manager/notifications'),

  dismissNotification: (id: string) =>
    fetchApi<{ success: boolean }>('/api/manager/notifications/dismiss', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  exportBackup: () => fetchApi<any>('/api/manager/backup/export'),

  importBackup: (backupData: any, mode: 'merge' | 'replace' = 'merge') =>
    fetchApi<{
      success: boolean;
      message: string;
      stats?: {
        usersCount: number;
        sessionsCount: number;
        attendanceCount: number;
        mode: string;
      };
    }>('/api/manager/backup/import', {
      method: 'POST',
      body: JSON.stringify({ backupData, mode }),
    }),

  listBackups: () =>
    fetchApi<{
      backups: Array<{
        fileName: string;
        createdAt: string;
        sizeBytes: number;
        usersCount: number;
        specialistsCount: number;
        sessionsCount: number;
        attendanceCount: number;
      }>;
    }>('/api/manager/backup/list'),

  restoreBackup: (fileName: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/manager/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ fileName }),
    }),

  createBackup: (label?: string) =>
    fetchApi<{ success: boolean; fileName: string; message: string }>('/api/manager/backup/create', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  getFirebaseStatus: () =>
    fetchApi<{
      connected: boolean;
      databaseId: string;
      projectId: string;
    }>('/api/manager/firebase/status'),

  syncToFirebase: () =>
    fetchApi<{
      success: boolean;
      message: string;
      result: {
        success: boolean;
        usersCount: number;
        attendanceCount: number;
        sessionsCount: number;
        syncedAt: string;
      };
    }>('/api/manager/firebase/sync', {
      method: 'POST',
    }),

  verifyGoogleDrive: (googleAccessToken: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      userEmail?: string;
      userName?: string;
      folderId: string;
      folderName: string;
      folderLink?: string;
    }>('/api/manager/drive/verify', {
      method: 'POST',
      headers: { 'x-google-token': googleAccessToken },
      body: JSON.stringify({ googleAccessToken }),
    }),

  backupToGoogleDrive: (googleAccessToken: string, folderId?: string) =>
    fetchApi<{
      success: boolean;
      message: string;
      backup: {
        fileId: string;
        fileName: string;
        folderId: string;
        sizeBytes: number;
        createdTime: string;
        md5Checksum?: string;
        verified: boolean;
        stats: {
          usersCount: number;
          sessionsCount: number;
          attendanceCount: number;
        };
      };
    }>('/api/manager/drive/backup', {
      method: 'POST',
      headers: { 'x-google-token': googleAccessToken },
      body: JSON.stringify({ googleAccessToken, folderId }),
    }),

  listGoogleDriveBackups: (googleAccessToken: string, folderId?: string) =>
    fetchApi<{
      folderId: string;
      backups: Array<{
        id: string;
        name: string;
        sizeBytes: number;
        createdTime: string;
        webViewLink?: string;
      }>;
    }>(`/api/manager/drive/list${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`, {
      headers: { 'x-google-token': googleAccessToken },
    }),
};


