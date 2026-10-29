/**
 * Input validation utilities for the AnonyHealth application.
 */

/** Validate email format */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/** Validate password minimum length (min 6 chars for Supabase Auth) */
export const isValidPassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= 6;
};

/** Validate strong password (for registration) */
export const isStrongPassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
};

/** Validate date of birth in MM/DD/YYYY format */
export const isValidDob = (dob) => {
  if (!dob || typeof dob !== "string") return false;
  return /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(dob);
};

/** Sanitize user input — strip HTML tags and trim */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 5000); // max length guard
};

/** Sanitize chat message input */
export const sanitizeChatMessage = (msg) => {
  if (!msg || typeof msg !== "string") return "";
  return msg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 2000);
};
