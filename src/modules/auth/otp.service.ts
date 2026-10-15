/**
 * OTP Service — in-memory OTP store for phone-based login.
 * In production, replace with Redis + an SMS gateway (MSG91, Fast2SMS, Twilio).
 */

interface OtpEntry {
  otp: string;
  phone: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

// Simple in-memory store (use Redis in production)
const otpStore = new Map<string, OtpEntry>();

function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createOtp(phone: string): string {
  const otp = generateOtp();
  otpStore.set(phone, {
    otp,
    phone,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return otp;
}

export function verifyOtp(phone: string, otp: string): { valid: boolean; reason?: string } {
  const entry = otpStore.get(phone);

  if (!entry) {
    return { valid: false, reason: 'OTP not requested or expired. Please request a new OTP.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, reason: 'OTP has expired. Please request a new OTP.' };
  }

  entry.attempts++;

  if (entry.attempts > MAX_ATTEMPTS) {
    otpStore.delete(phone);
    return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (entry.otp !== otp.trim()) {
    return { valid: false, reason: `Incorrect OTP. ${MAX_ATTEMPTS - entry.attempts} attempts remaining.` };
  }

  // OTP is valid — consume it
  otpStore.delete(phone);
  return { valid: true };
}

export async function sendOtp(phone: string, otp: string): Promise<void> {
  // In development: just log OTP to console
  // In production: integrate MSG91, Fast2SMS, or Twilio here
  console.log(`\n📱 OTP for ${phone}: ${otp} (valid 5 min)\n`);

  // Example MSG91 integration (uncomment when credentials are available):
  // await fetch('https://api.msg91.com/api/v5/otp', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', authkey: process.env.MSG91_AUTH_KEY! },
  //   body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID, mobile: `91${phone}`, otp }),
  // });
}
