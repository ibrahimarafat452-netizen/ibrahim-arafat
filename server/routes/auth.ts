import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { signToken, authenticate, type AuthenticatedRequest } from '../auth.ts';
import { getCairoTodayDate, getCairoCurrentTime } from '../time.ts';

export const authRouter = Router();

// Login with Phone and Password
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'يرجى إدخال رقم الهاتف وكلمة المرور' });
    }

    const cleanPhone = phone.toString().trim();
    const user = db.getUserByPhone(cleanPhone);

    if (!user) {
      return res.status(401).json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى التواصل مع إدارة المركز.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        specialization: user.specialization,
        workingDays: user.workingDays,
        isActive: user.isActive,
      },
      cairoToday: getCairoTodayDate(),
      cairoTime: getCairoCurrentTime(),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// Get current user profile
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مسجل' });
  }

  const { passwordHash, ...safeUser } = req.user;
  return res.json({
    user: safeUser,
    cairoToday: getCairoTodayDate(),
    cairoTime: getCairoCurrentTime(),
    settings: db.getSettings(),
  });
});

// Change Password
authRouter.post('/change-password', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'غير مسجل' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'يرجى إدخال كلمة المرور الحالية والجديدة' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف أو أرقام' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    db.updateUser(req.user.id, { passwordHash: newHash });

    return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل تغيير كلمة المرور' });
  }
});

// Login with Firebase Authenticated Google Account
authRouter.post('/firebase-login', (req: Request, res: Response) => {
  try {
    const { email, uid, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'البريد الإلكتروني لحساب Google مطلوب' });
    }

    // Check if email matches manager
    const isBootstrappedAdmin = email === 's-ibrahim.yassin@zewailcity.edu.eg';

    // Find user in local DB or assign manager
    let user = db.getAllUsers().find((u: any) => u.phone === email || (isBootstrappedAdmin && u.role === 'manager'));

    if (!user && isBootstrappedAdmin) {
      // Default to manager
      user = db.getAllUsers().find((u: any) => u.role === 'manager');
    }

    if (!user) {
      return res.status(403).json({
        error: `البريد (${email}) غير مسجل في مركز التخاطب. يرجى مراجعة إدارة المركز لإضافتك كأخصائي.`,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى التواصل مع إدارة المركز.' });
    }

    const token = signToken(user);
    const { passwordHash, ...safeUser } = user;

    return res.json({
      token,
      user: safeUser,
      cairoToday: getCairoTodayDate(),
      cairoTime: getCairoCurrentTime(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'فشل تسجيل الدخول عبر Google' });
  }
});

