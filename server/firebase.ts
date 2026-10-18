import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';

let firestoreInstance: ReturnType<typeof getFirestore> | null = null;

export function getFirestoreServer() {
  if (firestoreInstance) return firestoreInstance;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firebase Server] firebase-applet-config.json not found');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const firestoreProjectId = 'gen-lang-client-0560980802';
    const firestoreDatabaseId = 'ai-studio-4fd5cba3-8f2c-4039-bacd-f62d0d692a24';
    const firestoreConfig = {
      ...config,
      projectId: firestoreProjectId,
      apiKey: config.projectId === firestoreProjectId ? config.apiKey : 'AIzaSyBoGt9EuiUl_GNfQ74EbHGq13D74HLTdek',
      appId: config.projectId === firestoreProjectId ? config.appId : '1:502075967157:web:df5931759de500966be0fc',
      authDomain: `${firestoreProjectId}.firebaseapp.com`,
      firestoreDatabaseId,
    };

    const app = getApps().find((a) => a.name === 'firestoreApp') || initializeApp(firestoreConfig, 'firestoreApp');
    firestoreInstance = getFirestore(app, firestoreDatabaseId);
    console.log('[Firebase Server] Connected to Firestore database:', firestoreDatabaseId, 'on project:', firestoreProjectId);
    return firestoreInstance;
  } catch (err) {
    console.warn('[Firebase Server] Error initializing Firebase on server:', err);
    return null;
  }
}

// Single-record Firestore persistence
export async function persistSessionToFirestore(session: {
  id: string;
  specialistId: string;
  date: string;
  childName: string;
  durationMinutes: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  try {
    const db = getFirestoreServer();
    if (!db) return;
    await setDoc(doc(db, 'sessions', session.id), {
      id: session.id,
      specialistId: session.specialistId,
      date: session.date,
      childName: session.childName,
      durationMinutes: session.durationMinutes,
      notes: session.notes || null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to persist session to Firestore:', err);
  }
}

export async function removeSessionFromFirestore(sessionId: string) {
  try {
    const db = getFirestoreServer();
    if (!db) return;
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (err) {
    console.error('[Firebase] Failed to delete session from Firestore:', err);
  }
}

export async function persistAttendanceToFirestore(record: {
  id: string;
  specialistId: string;
  date: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes?: string | null;
  recordedAt: string;
  updatedAt: string;
}) {
  try {
    const db = getFirestoreServer();
    if (!db) return;
    await setDoc(doc(db, 'attendance', record.id), {
      id: record.id,
      specialistId: record.specialistId,
      date: record.date,
      status: record.status,
      checkInTime: record.checkInTime || null,
      checkOutTime: record.checkOutTime || null,
      notes: record.notes || null,
      recordedAt: record.recordedAt,
      updatedAt: record.updatedAt,
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to persist attendance to Firestore:', err);
  }
}

export async function persistSettingsToFirestore(settings: any) {
  try {
    const db = getFirestoreServer();
    if (!db) return;
    await setDoc(doc(db, 'settings', 'center'), {
      centerName: settings.centerName,
      supervisorName: settings.supervisorName,
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
      missingAlertTime: settings.missingAlertTime,
      minDailySessionsTarget: settings.minDailySessionsTarget,
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to persist settings to Firestore:', err);
  }
}

export async function persistUserToFirestore(user: any) {
  try {
    const db = getFirestoreServer();
    if (!db) return;
    await setDoc(doc(db, 'users', user.id), {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      specialization: user.specialization || '',
      isActive: user.isActive,
      createdAt: user.createdAt,
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to persist user to Firestore:', err);
  }
}

export async function loadDataFromFirestore() {
  const db = getFirestoreServer();
  if (!db) return null;

  try {
    let users: any[] = [];
    let attendance: any[] = [];
    let sessions: any[] = [];
    let settings: any = null;

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      users = usersSnap.docs.map((d) => d.data());
    } catch {
      // Handled gracefully if list permission is restricted
    }

    try {
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      attendance = attendanceSnap.docs.map((d) => d.data());
    } catch {
      // Handled gracefully if list permission is restricted
    }

    try {
      const sessionsSnap = await getDocs(collection(db, 'sessions'));
      sessions = sessionsSnap.docs.map((d) => d.data());
    } catch {
      // Handled gracefully if list permission is restricted
    }

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'center'));
      if (settingsSnap.exists()) {
        settings = settingsSnap.data();
      }
    } catch {
      // Handled gracefully
    }

    if (users.length === 0 && !settings && attendance.length === 0 && sessions.length === 0) {
      return null;
    }

    return {
      users,
      attendance,
      sessions,
      settings,
    };
  } catch (err) {
    console.warn('[Firebase] Could not fetch remote collections on boot:', err);
    return null;
  }
}

// Sync local database to Firestore in bulk
export async function syncDatabaseToFirestore(data: {
  users: any[];
  attendance: any[];
  sessions: any[];
  settings: any;
}) {
  const db = getFirestoreServer();
  if (!db) {
    throw new Error('قاعدة بيانات Firebase غير مهيأة على الخادم');
  }

  // 1. Sync Settings
  if (data.settings) {
    await setDoc(doc(db, 'settings', 'center'), {
      centerName: data.settings.centerName,
      supervisorName: data.settings.supervisorName,
      workStartTime: data.settings.workStartTime,
      workEndTime: data.settings.workEndTime,
      missingAlertTime: data.settings.missingAlertTime,
      minDailySessionsTarget: data.settings.minDailySessionsTarget,
    }, { merge: true });
  }

  // 2. Sync Users
  for (const user of data.users) {
    await setDoc(doc(db, 'users', user.id), {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      specialization: user.specialization || '',
      isActive: user.isActive,
      createdAt: user.createdAt,
    }, { merge: true });
  }

  // 3. Sync Attendance
  for (const att of data.attendance) {
    await setDoc(doc(db, 'attendance', att.id), {
      id: att.id,
      specialistId: att.specialistId,
      date: att.date,
      status: att.status,
      checkInTime: att.checkInTime || null,
      checkOutTime: att.checkOutTime || null,
      notes: att.notes || null,
      recordedAt: att.recordedAt,
      updatedAt: att.updatedAt,
    }, { merge: true });
  }

  // 4. Sync Sessions
  for (const session of data.sessions) {
    await setDoc(doc(db, 'sessions', session.id), {
      id: session.id,
      specialistId: session.specialistId,
      date: session.date,
      childName: session.childName,
      durationMinutes: session.durationMinutes,
      notes: session.notes || null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }, { merge: true });
  }

  return {
    success: true,
    usersCount: data.users.length,
    attendanceCount: data.attendance.length,
    sessionsCount: data.sessions.length,
    syncedAt: new Date().toISOString(),
  };
}
