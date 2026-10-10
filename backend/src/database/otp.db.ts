import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { dbConnection } from './connection';

export interface OtpRecord {
  id: string;
  identifier: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  resendCount: number;
  lastResendAt: Date;
  verified: boolean;
  createdAt: Date;
}

// In-memory fallback if PostgreSQL is temporarily disconnected
const fallbackOtpStore = new Map<string, OtpRecord>();

export class OtpDatabase {
  public hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code.trim() + config.jwtSecret).digest('hex');
  }

  public async saveOtp(
    identifier: string,
    rawCode: string
  ): Promise<{ allowed: boolean; message?: string; record?: OtpRecord }> {
    await dbConnection.ensureReady();
    const cleanId = identifier.trim().toLowerCase();
    const otpHash = this.hashOtp(rawCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 1. Exactly 5 minutes expiration

    const pool = dbConnection.getPool();

    // 1. PostgreSQL Persistence
    if (pool && dbConnection.isConnected()) {
      try {
        const existingRes = await pool.query(
          'SELECT * FROM verification_otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1;',
          [cleanId]
        );

        if (existingRes.rows.length > 0) {
          const row = existingRes.rows[0];
          const lastResend = new Date(row.last_resend_at);
          const timeSinceLastResend = now.getTime() - lastResend.getTime();

          // 2. Limit resend attempts: Cooldown of 45 seconds between requests
          if (timeSinceLastResend < 45 * 1000) {
            const waitSeconds = Math.ceil((45 * 1000 - timeSinceLastResend) / 1000);
            return {
              allowed: false,
              message: `Please wait ${waitSeconds} seconds before requesting a new code.`
            };
          }

          // 2. Limit resend attempts: Max 5 resends within a 15-minute window
          const createdAt = new Date(row.created_at);
          if (row.resend_count >= 5 && now.getTime() - createdAt.getTime() < 15 * 60 * 1000) {
            return {
              allowed: false,
              message: 'Maximum verification resend attempts reached. Please try again after 15 minutes.'
            };
          }

          // Update existing record with hashed OTP and reset attempts
          const newResendCount = (now.getTime() - createdAt.getTime() > 15 * 60 * 1000) ? 1 : row.resend_count + 1;
          await pool.query(
            `UPDATE verification_otps
             SET otp_hash = $1, expires_at = $2, attempts = 0, resend_count = $3, last_resend_at = $4, verified = false
             WHERE id = $5;`,
            [otpHash, expiresAt, newResendCount, now, row.id]
          );

          return {
            allowed: true,
            record: {
              id: row.id,
              identifier: cleanId,
              otpHash,
              expiresAt,
              attempts: 0,
              resendCount: newResendCount,
              lastResendAt: now,
              verified: false,
              createdAt: row.created_at
            }
          };
        } else {
          // Insert new OTP record
          const id = `otp-${uuidv4()}`;
          await pool.query(
            `INSERT INTO verification_otps (id, identifier, otp_hash, expires_at, attempts, resend_count, last_resend_at, verified, created_at)
             VALUES ($1, $2, $3, $4, 0, 1, $5, false, $5);`,
            [id, cleanId, otpHash, expiresAt, now]
          );

          return {
            allowed: true,
            record: {
              id,
              identifier: cleanId,
              otpHash,
              expiresAt,
              attempts: 0,
              resendCount: 1,
              lastResendAt: now,
              verified: false,
              createdAt: now
            }
          };
        }
      } catch (err: any) {
        console.error('[OTP DB ERROR] Failed to save OTP in PostgreSQL, using fallback:', err.message);
      }
    }

    // Fallback: in-memory store
    const existing = fallbackOtpStore.get(cleanId);
    if (existing) {
      const timeSinceLastResend = now.getTime() - existing.lastResendAt.getTime();
      if (timeSinceLastResend < 45 * 1000) {
        const waitSeconds = Math.ceil((45 * 1000 - timeSinceLastResend) / 1000);
        return {
          allowed: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`
        };
      }
      if (existing.resendCount >= 5 && now.getTime() - existing.createdAt.getTime() < 15 * 60 * 1000) {
        return {
          allowed: false,
          message: 'Maximum verification resend attempts reached. Please try again after 15 minutes.'
        };
      }
      existing.otpHash = otpHash;
      existing.expiresAt = expiresAt;
      existing.attempts = 0;
      existing.resendCount += 1;
      existing.lastResendAt = now;
      existing.verified = false;
      fallbackOtpStore.set(cleanId, existing);
      return { allowed: true, record: existing };
    }

    const record: OtpRecord = {
      id: `otp-${uuidv4()}`,
      identifier: cleanId,
      otpHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      lastResendAt: now,
      verified: false,
      createdAt: now
    };
    fallbackOtpStore.set(cleanId, record);
    return { allowed: true, record };
  }

  public async verifyOtp(
    identifier: string,
    rawCode: string
  ): Promise<{ success: boolean; message: string }> {
    await dbConnection.ensureReady();
    const cleanId = identifier.trim().toLowerCase();
    const inputHash = this.hashOtp(rawCode);
    const now = new Date();

    const pool = dbConnection.getPool();

    // 1. PostgreSQL Verification
    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          'SELECT * FROM verification_otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1;',
          [cleanId]
        );

        if (res.rows.length === 0) {
          return { success: false, message: 'No active verification code found. Please request a new code.' };
        }

        const row = res.rows[0];

        // Check if locked out due to excessive incorrect attempts
        if (row.attempts >= 5) {
          return {
            success: false,
            message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.'
          };
        }

        // Check 5-minute expiration
        if (now.getTime() > new Date(row.expires_at).getTime()) {
          return { success: false, message: 'Verification code has expired (valid for 5 minutes). Please request a new code.' };
        }

        // Check hash equality
        if (inputHash !== row.otp_hash) {
          const nextAttempts = row.attempts + 1;
          await pool.query('UPDATE verification_otps SET attempts = $1 WHERE id = $2;', [nextAttempts, row.id]);
          const remaining = Math.max(0, 5 - nextAttempts);

          if (remaining === 0) {
            return {
              success: false,
              message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.'
            };
          }

          return {
            success: false,
            message: `Incorrect verification code. ${remaining} attempt(s) remaining.`
          };
        }

        // Code matches! Mark as verified
        await pool.query('UPDATE verification_otps SET verified = true WHERE id = $1;', [row.id]);
        return { success: true, message: 'Verification code verified successfully.' };
      } catch (err: any) {
        console.error('[OTP DB ERROR] Verification query failed in PostgreSQL, checking fallback:', err.message);
      }
    }

    // Fallback in-memory
    const record = fallbackOtpStore.get(cleanId);
    if (!record) {
      return { success: false, message: 'No active verification code found. Please request a new code.' };
    }
    if (record.attempts >= 5) {
      return { success: false, message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.' };
    }
    if (now.getTime() > record.expiresAt.getTime()) {
      return { success: false, message: 'Verification code has expired (valid for 5 minutes). Please request a new code.' };
    }
    if (inputHash !== record.otpHash) {
      record.attempts += 1;
      const remaining = Math.max(0, 5 - record.attempts);
      if (remaining === 0) {
        return { success: false, message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.' };
      }
      return { success: false, message: `Incorrect verification code. ${remaining} attempt(s) remaining.` };
    }

    record.verified = true;
    fallbackOtpStore.set(cleanId, record);
    return { success: true, message: 'Verification code verified successfully.' };
  }

  public async isVerified(identifier: string, rawCode?: string): Promise<boolean> {
    await dbConnection.ensureReady();
    const cleanId = identifier.trim().toLowerCase();
    const now = new Date();

    const pool = dbConnection.getPool();
    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          'SELECT * FROM verification_otps WHERE identifier = $1 ORDER BY created_at DESC LIMIT 1;',
          [cleanId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const isNotExpired = now.getTime() <= new Date(row.expires_at).getTime();
          if (row.verified && isNotExpired) return true;
          if (rawCode && this.hashOtp(rawCode) === row.otp_hash && isNotExpired) return true;
        }
      } catch (err: any) {
        console.error('[OTP DB ERROR] isVerified query failed in PostgreSQL:', err.message);
      }
    }

    const record = fallbackOtpStore.get(cleanId);
    if (!record) return false;
    const isNotExpired = now.getTime() <= record.expiresAt.getTime();
    if (record.verified && isNotExpired) return true;
    if (rawCode && this.hashOtp(rawCode) === record.otpHash && isNotExpired) return true;
    return false;
  }

  public async deleteOtp(identifier: string): Promise<void> {
    await dbConnection.ensureReady();
    const cleanId = identifier.trim().toLowerCase();

    const pool = dbConnection.getPool();
    if (pool && dbConnection.isConnected()) {
      try {
        await pool.query('DELETE FROM verification_otps WHERE identifier = $1;', [cleanId]);
      } catch (err: any) {
        console.error('[OTP DB ERROR] deleteOtp failed in PostgreSQL:', err.message);
      }
    }
    fallbackOtpStore.delete(cleanId);
  }
}

export const otpDb = new OtpDatabase();
