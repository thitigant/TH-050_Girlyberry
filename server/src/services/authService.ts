import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { signToken } from '../utils/jwt.js';

export class AuthService {
  async register(input: { email: string; password: string; name: string; role?: string }) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // BR-01 Security Enforcement: Prevent privilege escalation via self-registration.
    // Self-registration strictly provisions RESPONDENT accounts; SURVEY_OWNER accounts
    // are provisioned exclusively via institutional seed/administrator provisioning.
    if (input.role && input.role !== Role.RESPONDENT) {
      if (input.role === Role.SURVEY_OWNER) {
        const error: any = new Error('Privilege escalation denied: cannot self-register as SURVEY_OWNER');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_ROLE';
        throw error;
      }
      const error: any = new Error(`Invalid role '${input.role}'. Allowed self-registration role: RESPONDENT`);
      error.statusCode = 400;
      error.code = 'INVALID_PAYLOAD';
      throw error;
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const error: any = new Error('Email is already registered');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // BR-11: Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(input.password, 12);
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: normalizedEmail,
        name: input.name.trim(),
        passwordHash,
        role: Role.RESPONDENT,
        isActive: true,
      },
    });

    const { token } = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        fullName: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const { token, jti, expiresAt } = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async logout(userId: string, jti: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
    await prisma.revokedToken.upsert({
      where: { jti },
      update: { revokedAt: new Date() },
      create: {
        jti,
        userId,
        expiresAt,
      },
    });
    return { message: 'Successfully logged out' };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      const error: any = new Error('User not found or inactive');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return user;
  }
}

export const authService = new AuthService();

