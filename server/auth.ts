import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, type User } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'speech-therapy-center-secret-key-2026';

export interface AuthPayload {
  id: string;
  phone: string;
  role: 'manager' | 'specialist';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function signToken(user: User): string {
  const payload: AuthPayload = {
    id: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = db.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى مراجعة إدارة المركز.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
  }
}

export function requireManager(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ error: 'غير مصرح: هذه الميزة مخصصة لإدارة المركز فقط' });
  }
  next();
}

export function requireSpecialist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'specialist') {
    return res.status(403).json({ error: 'غير مصرح: هذه الميزة مخصصة للأخصائيين فقط' });
  }
  next();
}
