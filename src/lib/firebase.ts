import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const FIRESTORE_PROJECT_ID = 'gen-lang-client-0560980802';
export const FIRESTORE_DATABASE_ID = 'ai-studio-4fd5cba3-8f2c-4039-bacd-f62d0d692a24';

const firestoreConfig = {
  ...firebaseConfig,
  projectId: FIRESTORE_PROJECT_ID,
  apiKey: firebaseConfig.projectId === FIRESTORE_PROJECT_ID ? firebaseConfig.apiKey : 'AIzaSyBoGt9EuiUl_GNfQ74EbHGq13D74HLTdek',
  appId: firebaseConfig.projectId === FIRESTORE_PROJECT_ID ? firebaseConfig.appId : '1:502075967157:web:df5931759de500966be0fc',
  authDomain: `${FIRESTORE_PROJECT_ID}.firebaseapp.com`,
  firestoreDatabaseId: FIRESTORE_DATABASE_ID,
};

// Initialize default app for Auth & Google Drive OAuth
export const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize dedicated app for Firestore to connect to user's database
export const firestoreApp = getApps().find((a) => a.name === 'firestoreApp') || initializeApp(firestoreConfig, 'firestoreApp');
export const db = getFirestore(firestoreApp, FIRESTORE_DATABASE_ID);

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore at boot time as mandated by skill guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Please check your Firebase configuration or network connection.');
      return false;
    }
    return true;
  }
}

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
  cachedDriveToken = null;
}

let cachedDriveToken: string | null = null;

export async function getGoogleDriveToken(): Promise<{ user: FirebaseUser; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('لم يتم استلام تصريح الوصول إلى Google Drive من حساب Google');
  }
  cachedDriveToken = credential.accessToken;
  return {
    user: result.user,
    accessToken: credential.accessToken,
  };
}

export function getCachedDriveToken(): string | null {
  return cachedDriveToken;
}

// Client-side Firestore Sync Helper
export async function syncToFirestoreDirect(data: {
  users: any[];
  attendance: any[];
  sessions: any[];
  settings: any;
}) {
  const pathSettings = 'settings/center';
  try {
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
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, pathSettings);
  }

  for (const user of data.users) {
    const userPath = `users/${user.id}`;
    try {
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
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }
  }

  for (const att of data.attendance) {
    const attPath = `attendance/${att.id}`;
    try {
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, attPath);
    }
  }

  for (const session of data.sessions) {
    const sessionPath = `sessions/${session.id}`;
    try {
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
      handleFirestoreError(err, OperationType.WRITE, sessionPath);
    }
  }

  return {
    success: true,
    usersCount: data.users.length,
    attendanceCount: data.attendance.length,
    sessionsCount: data.sessions.length,
    syncedAt: new Date().toISOString(),
  };
}

// Automatically test connection when module loads
testConnection();
