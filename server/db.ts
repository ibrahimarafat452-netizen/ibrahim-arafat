import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getCairoTodayDate, getCairoCurrentTime, getCairoDayOfWeek } from './time.ts';
import {
  persistSessionToFirestore,
  removeSessionFromFirestore,
  persistAttendanceToFirestore,
  persistSettingsToFirestore,
  persistUserToFirestore,
  loadDataFromFirestore,
} from './firebase.ts';

export interface User {
  id: string;
  phone: string;
  passwordHash: string;
  name: string;
  role: 'manager' | 'specialist';
  specialization: string;
  workingDays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string | null;
}

export type AttendanceStatus = 'present' | 'checked_out' | 'absent';

export interface AttendanceRecord {
  id: string;
  specialistId: string;
  date: string; // YYYY-MM-DD (Cairo)
  status: AttendanceStatus;
  checkInTime: string | null; // HH:mm:ss
  checkOutTime: string | null; // HH:mm:ss
  notes?: string | null;
  recordedAt: string;
  updatedAt: string;
}

export interface TherapySession {
  id: string;
  specialistId: string;
  date: string; // YYYY-MM-DD
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
  workingDays: number[]; // [6, 0, 1, 2, 3, 4] = Sat to Thu
  workStartTime: string; // "09:00"
  workEndTime: string; // "16:00"
  missingAlertTime: string; // "10:30"
  minDailySessionsTarget: number;
}

export interface NotificationDismissal {
  id: string;
  dismissedAt: string;
}

interface DatabaseSchema {
  users: User[];
  attendance: AttendanceRecord[];
  sessions: TherapySession[];
  settings: CenterSettings;
  dismissedNotifications: string[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_BAK_FILE = path.join(DATA_DIR, 'database.json.bak');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// In-memory cache + persistent disk storage
let dbData: DatabaseSchema;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// Throttle full snapshot creation to once every 10 seconds or on explicit critical events
let lastSnapshotTime = 0;

function pruneOldBackups() {
  try {
    ensureDataDir();
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    // Keep max 40 backups
    if (files.length > 40) {
      for (let i = 40; i < files.length; i++) {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, files[i]));
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    console.error('Failed to prune old backups:', e);
  }
}

let isSaving = false;
let pendingSave = false;
let pendingForceSnapshot = false;

function executeSave() {
  if (isSaving) {
    pendingSave = true;
    return;
  }

  isSaving = true;
  try {
    ensureDataDir();

    // Safety validation: never overwrite with corrupt or empty memory
    if (!dbData || !Array.isArray(dbData.users) || dbData.users.length === 0) {
      console.error('Critical warning: Attempted to save invalid or empty dbData. Aborting save to protect data.');
      return;
    }

    const jsonStr = JSON.stringify(dbData, null, 2);
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);

    // Keep direct shadow copy
    try {
      fs.writeFileSync(DB_BAK_FILE, jsonStr, 'utf-8');
    } catch (e) {
      // shadow copy error ignored
    }

    const now = Date.now();
    const shouldSnapshot = pendingForceSnapshot || (now - lastSnapshotTime > 15000);
    if (shouldSnapshot) {
      lastSnapshotTime = now;
      pendingForceSnapshot = false;
      try {
        const cairoDate = getCairoTodayDate();
        const cairoTime = getCairoCurrentTime().replace(/:/g, '-');
        const snapName = `backup_${cairoDate}_${cairoTime}_${Date.now()}.json`;
        fs.writeFileSync(path.join(BACKUPS_DIR, snapName), jsonStr, 'utf-8');
        pruneOldBackups();
      } catch (e) {
        console.error('Failed to write backup snapshot:', e);
      }
    }
  } catch (err) {
    console.error('Error during database file save:', err);
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      setImmediate(() => executeSave());
    }
  }
}

function saveDb(forceSnapshot = false) {
  if (forceSnapshot) {
    pendingForceSnapshot = true;
  }
  executeSave();
}

function generateInitialSeed(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const managerPasswordHash = bcrypt.hashSync('abdo12345', salt);

  const manager: User = {
    id: 'mo',
    phone: '0111464256',
    passwordHash: managerPasswordHash,
    name: 'مدير المركز',
    role: 'manager',
    specialization: 'إدارة المركز والإشراف العام',
    workingDays: [0, 1, 2, 3, 4, 6], // Saturday to Thursday
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const settings: CenterSettings = {
    centerName: 'مركز بصمة أمل للتخاطب وتنمية المهارات',
    centerLogo: 'sparkles',
    supervisorName: 'د. منى عبد الرحمن - استشاري أمراض التخاطب والتوحد',
    workingDays: [0, 1, 2, 3, 4, 6], // Saturday through Thursday
    workStartTime: '09:00',
    workEndTime: '16:00',
    missingAlertTime: '10:30',
    minDailySessionsTarget: 4,
  };

  return {
    users: [manager],
    attendance: [],
    sessions: [],
    settings,
    dismissedNotifications: [],
  };
}

export function initDb() {
  ensureDataDir();

  let loaded = false;

  // 1. Try primary database.json
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        dbData = parsed;
        loaded = true;
      }
    } catch (e) {
      console.error('Error reading primary database.json:', e);
    }
  }

  // 2. If primary failed, try shadow backup database.json.bak
  if (!loaded && fs.existsSync(DB_BAK_FILE)) {
    try {
      const rawBak = fs.readFileSync(DB_BAK_FILE, 'utf-8');
      const parsed = JSON.parse(rawBak);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        dbData = parsed;
        loaded = true;
        saveDb(true);
        console.log('Restored database successfully from shadow backup file!');
      }
    } catch (e) {
      console.error('Error reading database.json.bak:', e);
    }
  }

  // 3. If still not loaded, search backups directory for the most recent valid backup
  if (!loaded && fs.existsSync(BACKUPS_DIR)) {
    try {
      const backupFiles = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();
      for (const bFile of backupFiles) {
        try {
          const raw = fs.readFileSync(path.join(BACKUPS_DIR, bFile), 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
            dbData = parsed;
            loaded = true;
            saveDb(true);
            console.log(`Restored database successfully from snapshot ${bFile}!`);
            break;
          }
        } catch {
          // continue to next backup
        }
      }
    } catch (e) {
      console.error('Error scanning backups directory:', e);
    }
  }

  // 4. Only if absolutely nothing exists, generate initial seed
  if (!loaded) {
    console.log('No existing database or backup found. Initializing fresh manager database.');
    dbData = generateInitialSeed();
    saveDb(true);
  }
}

// Ensure DB is initialized
initDb();

// Resilient background sync from Firestore on startup
setTimeout(async () => {
  try {
    const remote = await loadDataFromFirestore();
    if (remote) {
      let merged = false;
      // Merge remote center settings if present in Firestore
      if (remote.settings && typeof remote.settings === 'object') {
        dbData.settings = {
          ...dbData.settings,
          ...remote.settings,
        };
        merged = true;
      }
      // Merge any remote sessions that might be missing locally
      for (const rSess of (remote.sessions || [])) {
        if (!dbData.sessions.some(s => s.id === rSess.id)) {
          dbData.sessions.push(rSess as TherapySession);
          merged = true;
        }
      }
      // Merge any remote attendance records
      for (const rAtt of (remote.attendance || [])) {
        if (!dbData.attendance.some(a => a.id === rAtt.id)) {
          dbData.attendance.push(rAtt as AttendanceRecord);
          merged = true;
        }
      }
      // Merge any remote specialists
      for (const rUser of (remote.users || [])) {
        const local = dbData.users.find(u => u.id === rUser.id);
        if (!local) {
          dbData.users.push({
            ...(rUser as User),
            passwordHash: bcrypt.hashSync('spec123', 10),
          });
          merged = true;
        }
      }
      if (merged) {
        saveDb(false);
        console.log('[Firebase] Successfully merged remote Firestore records and settings into local cache.');
      }
    }
  } catch (err) {
    console.warn('[Firebase] Remote sync check completed with error:', err);
  }
}, 3000);

// Automated Periodic Backup: Run every 30 minutes in background
setInterval(() => {
  try {
    saveDb(true);
    console.log(`[Auto-Backup] Periodic snapshot verified at Cairo time: ${getCairoTodayDate()} ${getCairoCurrentTime()}`);
  } catch (err) {
    console.error('[Auto-Backup] Error during scheduled backup:', err);
  }
}, 30 * 60 * 1000);

/* ================= DATABASE REPOSITORY METHODS ================= */

export const db = {
  // Users
  getAllUsers(): User[] {
    return dbData.users;
  },

  getUserById(id: string): User | undefined {
    return dbData.users.find((u) => u.id === id);
  },

  getUserByPhone(phone: string): User | undefined {
    const cleanPhone = phone.trim();
    return dbData.users.find((u) => u.phone.trim() === cleanPhone);
  },

  getSpecialists(includeInactive = true): User[] {
    return dbData.users.filter((u) => {
      if (u.role !== 'specialist') return false;
      if (!includeInactive && !u.isActive) return false;
      return true;
    });
  },

  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const id = `spec_${crypto.randomUUID()}`;
    const user: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    dbData.users.push(user);
    saveDb();
    persistUserToFirestore(user).catch(() => {});
    return user;
  },

  updateUser(id: string, updates: Partial<User>): User | null {
    const index = dbData.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    dbData.users[index] = {
      ...dbData.users[index],
      ...updates,
    };
    saveDb();
    persistUserToFirestore(dbData.users[index]).catch(() => {});
    return dbData.users[index];
  },

  deleteSpecialist(id: string, deleteHistory: boolean = false): boolean {
    const index = dbData.users.findIndex((u) => u.id === id && u.role === 'specialist');
    if (index === -1) return false;
    dbData.users.splice(index, 1);
    if (deleteHistory) {
      dbData.attendance = dbData.attendance.filter((a) => a.specialistId !== id);
      dbData.sessions = dbData.sessions.filter((s) => s.specialistId !== id);
    }
    saveDb();
    return true;
  },

  // Attendance
  getAttendanceRecord(specialistId: string, date: string): AttendanceRecord | undefined {
    return dbData.attendance.find((a) => a.specialistId === specialistId && a.date === date);
  },

  getAttendanceByDate(date: string): AttendanceRecord[] {
    return dbData.attendance.filter((a) => a.date === date);
  },

  getAttendanceRange(startDate: string, endDate: string, specialistId?: string): AttendanceRecord[] {
    return dbData.attendance.filter((a) => {
      if (specialistId && a.specialistId !== specialistId) return false;
      return a.date >= startDate && a.date <= endDate;
    });
  },

  recordCheckIn(specialistId: string, date: string, time: string, notes?: string): AttendanceRecord {
    const existing = dbData.attendance.find((a) => a.specialistId === specialistId && a.date === date);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === 'absent') {
        throw new Error('تم تسجيل هذا اليوم كغياب بالفعل. تواصل مع الإدارة للتعديل إذا لزم الأمر.');
      }
      // If already present, allow updating checkInTime to the newly entered time
      existing.checkInTime = time;
      if (notes) existing.notes = notes;
      existing.updatedAt = now;
      saveDb();
      persistAttendanceToFirestore(existing).catch(() => {});
      return existing;
    }

    const newRecord: AttendanceRecord = {
      id: `att_${crypto.randomUUID()}`,
      specialistId,
      date,
      status: 'present',
      checkInTime: time,
      checkOutTime: null,
      notes: notes || null,
      recordedAt: now,
      updatedAt: now,
    };

    dbData.attendance.push(newRecord);
    saveDb();
    persistAttendanceToFirestore(newRecord).catch(() => {});
    return newRecord;
  },

  setAttendanceTimes(
    specialistId: string,
    date: string,
    checkInTime?: string | null,
    checkOutTime?: string | null,
    notes?: string,
    forceStatus?: AttendanceStatus
  ): AttendanceRecord {
    let existing = dbData.attendance.find((a) => a.specialistId === specialistId && a.date === date);
    const now = new Date().toISOString();

    const finalCheckIn = checkInTime !== undefined ? checkInTime : (existing?.checkInTime || null);
    const finalCheckOut = checkOutTime !== undefined ? checkOutTime : (existing?.checkOutTime || null);

    let status: AttendanceStatus = forceStatus || 'present';
    if (!forceStatus) {
      if (finalCheckIn && finalCheckOut) {
        status = 'checked_out';
      } else if (finalCheckIn) {
        status = 'present';
      } else {
        status = 'absent';
      }
    }

    const record: AttendanceRecord = {
      id: existing?.id || `att_${crypto.randomUUID()}`,
      specialistId,
      date,
      status,
      checkInTime: finalCheckIn,
      checkOutTime: finalCheckOut,
      notes: notes !== undefined ? notes : (existing?.notes || null),
      recordedAt: existing?.recordedAt || now,
      updatedAt: now,
    };

    if (existing) {
      const idx = dbData.attendance.indexOf(existing);
      dbData.attendance[idx] = record;
    } else {
      dbData.attendance.push(record);
    }

    saveDb();
    persistAttendanceToFirestore(record).catch(() => {});
    return record;
  },

  recordCheckOut(specialistId: string, date: string, time: string): AttendanceRecord {
    let existing = dbData.attendance.find((a) => a.specialistId === specialistId && a.date === date);
    const now = new Date().toISOString();

    if (!existing) {
      // If specialist had not registered check-in first, automatically register attendance & departure together smoothly
      existing = {
        id: `att_${crypto.randomUUID()}`,
        specialistId,
        date,
        status: 'checked_out',
        checkInTime: time,
        checkOutTime: time,
        notes: null,
        recordedAt: now,
        updatedAt: now,
      };
      dbData.attendance.push(existing);
      saveDb();
      persistAttendanceToFirestore(existing).catch(() => {});
      return existing;
    }

    if (existing.status === 'absent') {
      throw new Error('لا يمكن تسجيل انصراف ليوم مسجل كغياب.');
    }

    existing.status = 'checked_out';
    existing.checkOutTime = time;
    existing.updatedAt = now;

    saveDb();
    persistAttendanceToFirestore(existing).catch(() => {});
    return existing;
  },

  recordAbsence(specialistId: string, date: string, notes?: string): AttendanceRecord {
    const existing = dbData.attendance.find((a) => a.specialistId === specialistId && a.date === date);
    if (existing && existing.status !== 'absent') {
      throw new Error('تم تسجيل حضور لهذا اليوم مسبقاً، لا يمكن تسجيله كغياب الآن.');
    }

    const now = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: existing?.id || `att_${crypto.randomUUID()}`,
      specialistId,
      date,
      status: 'absent',
      checkInTime: null,
      checkOutTime: null,
      notes: notes || 'غياب مسجل من قبل الأخصائي',
      recordedAt: existing?.recordedAt || now,
      updatedAt: now,
    };

    if (existing) {
      const idx = dbData.attendance.indexOf(existing);
      dbData.attendance[idx] = newRecord;
    } else {
      dbData.attendance.push(newRecord);
    }

    saveDb();
    persistAttendanceToFirestore(newRecord).catch(() => {});
    return newRecord;
  },

  // Sessions
  getSessions(specialistId?: string, date?: string): TherapySession[] {
    return dbData.sessions.filter((s) => {
      if (specialistId && s.specialistId !== specialistId) return false;
      if (date && s.date !== date) return false;
      return true;
    });
  },

  getSessionsRange(startDate: string, endDate: string, specialistId?: string): TherapySession[] {
    return dbData.sessions.filter((s) => {
      if (specialistId && s.specialistId !== specialistId) return false;
      return s.date >= startDate && s.date <= endDate;
    });
  },

  addSession(
    specialistId: string,
    date: string,
    childName: string,
    durationMinutes: number,
    notes?: string
  ): TherapySession {
    if (!childName.trim()) {
      throw new Error('اسم الطفل مطلوب.');
    }
    if (durationMinutes <= 0 || isNaN(durationMinutes)) {
      throw new Error('مدة الجلسة يجب أن تكون رقماً موجباً بالدقائق.');
    }

    const now = new Date().toISOString();
    const session: TherapySession = {
      id: `sess_${crypto.randomUUID()}`,
      specialistId,
      date,
      childName: childName.trim(),
      durationMinutes: Math.round(durationMinutes),
      notes: notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    dbData.sessions.push(session);
    saveDb();
    persistSessionToFirestore(session).catch(() => {});
    return session;
  },

  updateSession(
    id: string,
    specialistId: string,
    updates: { childName?: string; durationMinutes?: number; notes?: string }
  ): TherapySession {
    const session = dbData.sessions.find((s) => s.id === id);
    if (!session) {
      throw new Error('الجلسة غير موجودة.');
    }
    if (session.specialistId !== specialistId) {
      throw new Error('غير مصرح لك بتعديل هذه الجلسة.');
    }

    if (updates.childName !== undefined) {
      if (!updates.childName.trim()) throw new Error('اسم الطفل مطلوب.');
      session.childName = updates.childName.trim();
    }
    if (updates.durationMinutes !== undefined) {
      if (updates.durationMinutes <= 0) throw new Error('مدة الجلسة يجب أن تكون أكبر من صفر.');
      session.durationMinutes = Math.round(updates.durationMinutes);
    }
    if (updates.notes !== undefined) {
      session.notes = updates.notes?.trim() || null;
    }

    session.updatedAt = new Date().toISOString();
    saveDb();
    persistSessionToFirestore(session).catch(() => {});
    return session;
  },

  deleteSession(id: string, specialistId: string): boolean {
    const index = dbData.sessions.findIndex((s) => s.id === id);
    if (index === -1) return false;
    if (dbData.sessions[index].specialistId !== specialistId) {
      throw new Error('غير مصرح لك بحذف هذه الجلسة.');
    }
    dbData.sessions.splice(index, 1);
    saveDb();
    removeSessionFromFirestore(id).catch(() => {});
    return true;
  },

  // Settings
  getSettings(): CenterSettings {
    return { ...dbData.settings };
  },

  updateSettings(updates: Partial<CenterSettings>): CenterSettings {
    dbData.settings = {
      ...dbData.settings,
      ...updates,
    };
    saveDb();
    persistSettingsToFirestore(dbData.settings).catch(() => {});
    return { ...dbData.settings };
  },

  // Dismissed notifications
  getDismissedNotifications(): string[] {
    return dbData.dismissedNotifications || [];
  },

  dismissNotification(id: string) {
    if (!dbData.dismissedNotifications) {
      dbData.dismissedNotifications = [];
    }
    if (!dbData.dismissedNotifications.includes(id)) {
      dbData.dismissedNotifications.push(id);
      saveDb();
    }
  },

  // Backup & Disaster Recovery API
  exportData(): any {
    const today = getCairoTodayDate();
    const time = getCairoCurrentTime();
    // Exclude passwordHash for security, include document IDs and schemaVersion
    const safeUsers = dbData.users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      specialization: u.specialization || '',
      workingDays: u.workingDays,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return {
      schemaVersion: '1.0.0',
      exportTimestamp: new Date().toISOString(),
      cairoDate: today,
      cairoTime: time,
      center: dbData.settings?.centerName || 'مركز بصمة أمل للتخاطب',
      collections: {
        users: safeUsers,
        attendance: dbData.attendance || [],
        sessions: dbData.sessions || [],
        settings: dbData.settings,
      },
      // Direct compatibility properties
      users: safeUsers,
      attendance: dbData.attendance || [],
      sessions: dbData.sessions || [],
      settings: dbData.settings,
    };
  },

  importData(data: any, mode: 'merge' | 'replace' = 'merge'): {
    success: boolean;
    message: string;
    stats: {
      usersCount: number;
      sessionsCount: number;
      attendanceCount: number;
      mode: string;
    };
  } {
    if (!data || typeof data !== 'object') {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
    }

    // Support both structured { collections: { users, sessions } } and flat { users, sessions }
    const incomingUsers = Array.isArray(data.collections?.users)
      ? data.collections.users
      : Array.isArray(data.users)
      ? data.users
      : [];

    const incomingSessions = Array.isArray(data.collections?.sessions)
      ? data.collections.sessions
      : Array.isArray(data.sessions)
      ? data.sessions
      : [];

    const incomingAttendance = Array.isArray(data.collections?.attendance)
      ? data.collections.attendance
      : Array.isArray(data.attendance)
      ? data.attendance
      : [];

    const incomingSettings = data.collections?.settings || data.settings || null;

    if (incomingUsers.length === 0 && incomingSessions.length === 0 && !incomingSettings) {
      throw new Error('الملف لا يحتوي على بيانات صالحة للاستعادة (المستخدمين أو الجلسات أو الإعدادات).');
    }

    // Always create pre-import safety backup
    saveDb(true);

    let usersCount = 0;
    let sessionsCount = 0;
    let attendanceCount = 0;

    if (mode === 'replace') {
      // In replace mode, preserve existing password hashes where available
      const mergedUsers = incomingUsers.map((inUser: any) => {
        const existing = dbData.users.find((u) => u.id === inUser.id || u.phone === inUser.phone);
        return {
          id: inUser.id || `spec_${crypto.randomUUID()}`,
          name: inUser.name || 'بدون اسم',
          phone: inUser.phone || '',
          passwordHash: inUser.passwordHash || existing?.passwordHash || bcrypt.hashSync('spec123', 10),
          role: inUser.role || 'specialist',
          specialization: inUser.specialization || '',
          workingDays: Array.isArray(inUser.workingDays) ? inUser.workingDays : [0, 1, 2, 3, 4, 6],
          isActive: inUser.isActive !== false,
          createdAt: inUser.createdAt || new Date().toISOString(),
        };
      });

      dbData.users = mergedUsers;
      dbData.sessions = incomingSessions.map((s: any) => ({
        id: s.id || `sess_${crypto.randomUUID()}`,
        specialistId: s.specialistId,
        date: s.date,
        childName: s.childName,
        durationMinutes: Number(s.durationMinutes) || 30,
        notes: s.notes || null,
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString(),
      }));

      dbData.attendance = incomingAttendance.map((a: any) => ({
        id: a.id || `att_${crypto.randomUUID()}`,
        specialistId: a.specialistId,
        date: a.date,
        status: a.status || 'present',
        checkInTime: a.checkInTime || null,
        checkOutTime: a.checkOutTime || null,
        notes: a.notes || null,
        recordedAt: a.recordedAt || new Date().toISOString(),
        updatedAt: a.updatedAt || new Date().toISOString(),
      }));

      if (incomingSettings) {
        dbData.settings = { ...dbData.settings, ...incomingSettings };
      }

      usersCount = dbData.users.length;
      sessionsCount = dbData.sessions.length;
      attendanceCount = dbData.attendance.length;
    } else {
      // Default: MERGE mode (safe, avoids deleting existing records)
      for (const inUser of incomingUsers) {
        const existingIdx = dbData.users.findIndex((u) => u.id === inUser.id || u.phone === inUser.phone);
        if (existingIdx !== -1) {
          dbData.users[existingIdx] = {
            ...dbData.users[existingIdx],
            name: inUser.name || dbData.users[existingIdx].name,
            specialization: inUser.specialization || dbData.users[existingIdx].specialization,
            workingDays: Array.isArray(inUser.workingDays) ? inUser.workingDays : dbData.users[existingIdx].workingDays,
            isActive: inUser.isActive !== undefined ? inUser.isActive : dbData.users[existingIdx].isActive,
          };
        } else {
          dbData.users.push({
            id: inUser.id || `spec_${crypto.randomUUID()}`,
            name: inUser.name || 'أخصائي جديد',
            phone: inUser.phone || '',
            passwordHash: inUser.passwordHash || bcrypt.hashSync('spec123', 10),
            role: inUser.role || 'specialist',
            specialization: inUser.specialization || '',
            workingDays: Array.isArray(inUser.workingDays) ? inUser.workingDays : [0, 1, 2, 3, 4, 6],
            isActive: inUser.isActive !== false,
            createdAt: inUser.createdAt || new Date().toISOString(),
          });
        }
      }

      for (const inSess of incomingSessions) {
        const existingIdx = dbData.sessions.findIndex((s) => s.id === inSess.id);
        if (existingIdx !== -1) {
          dbData.sessions[existingIdx] = {
            ...dbData.sessions[existingIdx],
            ...inSess,
          };
        } else {
          dbData.sessions.push({
            id: inSess.id || `sess_${crypto.randomUUID()}`,
            specialistId: inSess.specialistId,
            date: inSess.date,
            childName: inSess.childName,
            durationMinutes: Number(inSess.durationMinutes) || 30,
            notes: inSess.notes || null,
            createdAt: inSess.createdAt || new Date().toISOString(),
            updatedAt: inSess.updatedAt || new Date().toISOString(),
          });
        }
      }

      for (const inAtt of incomingAttendance) {
        const existingIdx = dbData.attendance.findIndex((a) => a.id === inAtt.id || (a.specialistId === inAtt.specialistId && a.date === inAtt.date));
        if (existingIdx !== -1) {
          dbData.attendance[existingIdx] = {
            ...dbData.attendance[existingIdx],
            ...inAtt,
          };
        } else {
          dbData.attendance.push({
            id: inAtt.id || `att_${crypto.randomUUID()}`,
            specialistId: inAtt.specialistId,
            date: inAtt.date,
            status: inAtt.status || 'present',
            checkInTime: inAtt.checkInTime || null,
            checkOutTime: inAtt.checkOutTime || null,
            notes: inAtt.notes || null,
            recordedAt: inAtt.recordedAt || new Date().toISOString(),
            updatedAt: inAtt.updatedAt || new Date().toISOString(),
          });
        }
      }

      if (incomingSettings) {
        dbData.settings = { ...dbData.settings, ...incomingSettings };
      }

      usersCount = incomingUsers.length;
      sessionsCount = incomingSessions.length;
      attendanceCount = incomingAttendance.length;
    }

    saveDb(true);
    return {
      success: true,
      message: `تمت عملية الاستعادة بنجاح بنمط ${mode === 'replace' ? 'الاستبدال الكامل' : 'الدمج الآمن'} (${dbData.users.length} مستخدم، ${dbData.sessions.length} جلسة، ${dbData.attendance.length} سجل حضور).`,
      stats: {
        usersCount,
        sessionsCount,
        attendanceCount,
        mode,
      },
    };
  },

  listBackups() {
    ensureDataDir();
    try {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse();

      return files.map((fileName) => {
        try {
          const filePath = path.join(BACKUPS_DIR, fileName);
          const stat = fs.statSync(filePath);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          return {
            fileName,
            createdAt: stat.mtime.toISOString(),
            sizeBytes: stat.size,
            usersCount: Array.isArray(parsed.users) ? parsed.users.length : 0,
            specialistsCount: Array.isArray(parsed.users)
              ? parsed.users.filter((u: any) => u.role === 'specialist').length
              : 0,
            sessionsCount: Array.isArray(parsed.sessions) ? parsed.sessions.length : 0,
            attendanceCount: Array.isArray(parsed.attendance) ? parsed.attendance.length : 0,
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch {
      return [];
    }
  },

  restoreBackup(fileName: string): { success: boolean; message: string } {
    ensureDataDir();
    const cleanName = path.basename(fileName);
    const targetPath = path.join(BACKUPS_DIR, cleanName);

    if (!fs.existsSync(targetPath)) {
      throw new Error('ملف النسخة الاحتياطية المحدد غير موجود على الخادم.');
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return this.importData(parsed);
  },

  createManualBackup(customLabel?: string): { success: boolean; fileName: string; message: string } {
    ensureDataDir();
    const cairoDate = getCairoTodayDate();
    const cairoTime = getCairoCurrentTime().replace(/:/g, '-');
    const label = customLabel ? `_${customLabel.replace(/[^a-zA-Z0-9_-]/g, '')}` : '_manual';
    const snapName = `backup_${cairoDate}_${cairoTime}${label}_${Date.now()}.json`;
    const jsonStr = JSON.stringify(dbData, null, 2);
    fs.writeFileSync(path.join(BACKUPS_DIR, snapName), jsonStr, 'utf-8');
    pruneOldBackups();
    return {
      success: true,
      fileName: snapName,
      message: 'تم حفظ نسخة احتياطية فورية على الخادم بنجاح!',
    };
  },
};

