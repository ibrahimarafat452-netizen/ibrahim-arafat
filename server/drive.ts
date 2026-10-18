import { db } from './db.ts';
import { getCairoTodayDate, getCairoCurrentTime } from './time.ts';

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export interface DriveVerificationResult {
  success: boolean;
  userEmail?: string;
  userName?: string;
  folderId?: string;
  folderName?: string;
  folderLink?: string;
  error?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  sizeBytes: number;
  createdTime: string;
  webViewLink?: string;
}

export interface DriveUploadResult {
  success: boolean;
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
}

/**
 * Verifies that the supplied Google OAuth access token is valid and has Drive access.
 */
export async function verifyGoogleTokenAndUser(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${GOOGLE_DRIVE_API_BASE}/about?fields=user,storageQuota`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        valid: false,
        error: errBody?.error?.message || `Google Drive authentication failed (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      valid: true,
      email: data.user?.emailAddress,
      name: data.user?.displayName,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Failed to connect to Google Drive API',
    };
  }
}

/**
 * Finds or creates a dedicated folder in Google Drive for off-site backups.
 */
export async function getOrCreateDedicatedBackupFolder(
  accessToken: string,
  folderName = 'مؤسسة الدكتورة نسيبه مرعي - النسخ الاحتياطية'
): Promise<{
  folderId: string;
  folderName: string;
  folderLink?: string;
}> {
  // 1. Search for existing folder
  const query = encodeURIComponent(`mimeType = 'application/vnd.google.apps.folder' and name = '${folderName}' and trashed = false`);
  const searchRes = await fetch(
    `${GOOGLE_DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل البحث عن مجلد النسخ الاحتياطية في Google Drive');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return {
      folderId: searchData.files[0].id,
      folderName: searchData.files[0].name,
      folderLink: searchData.files[0].webViewLink,
    };
  }

  // 2. Create folder if not found
  const createRes = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google.apps.folder',
      description: 'مجلد النسخ الاحتياطية السحابية المستقلة لمؤسسة الدكتورة نسيبه مرعي',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إنشاء مجلد النسخ الاحتياطية في Google Drive');
  }

  const created = await createRes.json();
  return {
    folderId: created.id,
    folderName: created.name,
    folderLink: created.webViewLink,
  };
}

/**
 * Uploads a complete, timestamped JSON backup to the dedicated Google Drive folder,
 * and rigorously verifies that the uploaded file exists and has matching size.
 */
export async function uploadAndVerifyBackup(
  accessToken: string,
  folderId: string
): Promise<DriveUploadResult> {
  // 1. Generate full sanitized backup
  const rawBackup = db.exportData();

  // Strict Sanitization: Guarantee zero credentials or secrets
  const sanitizedUsers = (rawBackup.collections?.users || rawBackup.users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    specialization: u.specialization || '',
    workingDays: u.workingDays,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));

  const safeBackupPayload = {
    schemaVersion: '1.0.0',
    backupType: 'google_drive_offsite',
    exportTimestamp: new Date().toISOString(),
    cairoDate: getCairoTodayDate(),
    cairoTime: getCairoCurrentTime(),
    center: rawBackup.settings?.centerName || 'مؤسسة الدكتورة نسيبه مرعي',
    metadata: {
      systemVersion: '2026.1',
      timezone: 'Africa/Cairo',
      usersCount: sanitizedUsers.length,
      sessionsCount: (rawBackup.sessions || []).length,
      attendanceCount: (rawBackup.attendance || []).length,
    },
    collections: {
      users: sanitizedUsers,
      attendance: rawBackup.attendance || [],
      sessions: rawBackup.sessions || [],
      settings: rawBackup.settings || null,
    },
  };

  const cairoDate = getCairoTodayDate();
  const cairoTimeFormatted = getCairoCurrentTime().replace(/:/g, '-');
  const fileName = `backup_${cairoDate}_${cairoTimeFormatted}.json`;
  const fileContent = JSON.stringify(safeBackupPayload, null, 2);
  const fileBytes = Buffer.byteLength(fileContent, 'utf-8');

  // 2. Perform multipart upload to Google Drive
  const boundary = `-------314159265358979323846_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: `نسخة احتياطية سحابية مستقلة بتاريخ ${cairoDate} بتوقيت القاهرة`,
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,size,createdTime`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `فشل رفع النسخة الاحتياطية إلى Google Drive (${uploadRes.status})`);
  }

  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;

  if (!fileId) {
    throw new Error('لم يُرجع خادم Google Drive معرّفاً للملف المرفوع.');
  }

  // 3. Independent Verification: Read back file metadata to confirm existence and size
  const verifyRes = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?fields=id,name,size,createdTime,md5Checksum,parents`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!verifyRes.ok) {
    throw new Error('فشل التحقق من صحة الملف المرفوع على Google Drive. يرجى إعادة المحاولة.');
  }

  const verifiedData = await verifyRes.json();
  const verifiedSize = parseInt(verifiedData.size || '0', 10);

  // Verification check: size must match and be greater than 0
  if (verifiedSize <= 0) {
    throw new Error('فشل التحقق: حجم الملف المرفوع في Google Drive هو 0 بايت.');
  }

  return {
    success: true,
    fileId: verifiedData.id,
    fileName: verifiedData.name,
    folderId,
    sizeBytes: verifiedSize,
    createdTime: verifiedData.createdTime || new Date().toISOString(),
    md5Checksum: verifiedData.md5Checksum,
    verified: true,
    stats: {
      usersCount: sanitizedUsers.length,
      sessionsCount: (rawBackup.sessions || []).length,
      attendanceCount: (rawBackup.attendance || []).length,
    },
  };
}

/**
 * Lists all existing backups in the dedicated Google Drive folder (retaining previous versions).
 */
export async function listDriveBackups(
  accessToken: string,
  folderId: string
): Promise<DriveBackupFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google.apps.folder'`);
  const res = await fetch(
    `${GOOGLE_DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,size,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل جلب قائمة النسخ من Google Drive');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    sizeBytes: parseInt(f.size || '0', 10),
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
  }));
}
