export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'manager' | 'specialist';
  specialization: string;
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string | null;
}

export type AttendanceStatus = 'present' | 'checked_out' | 'absent';

export interface AttendanceRecord {
  id: string;
  specialistId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes?: string | null;
  recordedAt: string;
  updatedAt: string;
}

export interface TherapySession {
  id: string;
  specialistId: string;
  date: string;
  childName: string;
  durationMinutes: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CenterSettings {
  centerName: string;
  centerLogo: string;
  supervisorName: string;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  missingAlertTime: string;
  minDailySessionsTarget: number;
}

export interface SystemNotification {
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
}

export interface DailyReportItem {
  specialistId: string;
  specialistName: string;
  specialization: string;
  phone: string;
  isExpected: boolean;
  statusKey: 'present' | 'checked_out' | 'absent' | 'not_registered' | 'day_off';
  statusText: string;
  checkInTime: string;
  checkOutTime: string;
  absenceNotes: string | null;
  sessionsCount: number;
  totalMinutes: number;
  children: Array<{
    childName: string;
    durationMinutes: number;
    notes?: string | null;
  }>;
}

export interface MonthlyReportSpecialist {
  specialistId: string;
  specialistName: string;
  specialization: string;
  phone: string;
  isActive: boolean;
  scheduledWorkDays: number;
  presentDays: number;
  absentDays: number;
  notRegisteredDays: number;
  totalSessions: number;
  totalMinutes: number;
}
