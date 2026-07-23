import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "密码至少 8 位";
  if (password.length > 72) return "密码过长";
  return null;
}
