export {
  magicLinkEmail,
  alertEmail,
  weeklyDigestEmail,
  scanCompleteEmail,
} from "@/lib/email/templates";
export {
  ensureNotificationPreference,
  canSendEmailKind,
} from "@/lib/email/preferences";
export { sendEmail } from "@/lib/email/send";
export type { EmailInput, SendEmailResult } from "@/lib/email/send";
export { runWeeklyDigest } from "@/lib/email/digest";
