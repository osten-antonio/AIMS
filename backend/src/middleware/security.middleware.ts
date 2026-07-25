import type { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../lib/error-response";

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BASE64_CANDIDATE_REGEX = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;
const DISALLOWED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SAFE_DISPLAY_NAME_REGEX = /^[\p{L}\p{N} ._'-]+$/u;

const IMAGE_MIME_TO_SIGNATURE_TYPE: Record<string, "jpeg" | "png" | "webp"> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/i,
  /system\s*override/i,
  /reveal\s+(the\s+)?(system\s+)?prompt/i,
  /bypass\s+(safety|guardrails?|restrictions?)/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /print\s+(your\s+)?(hidden|system)\s+instructions?/i,
];

const DANGEROUS_MARKUP_PATTERNS: RegExp[] = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /on\w+\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /<\s*svg\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
];

const TYPOGLYCEMIA_KEYWORDS = [
  "ignore",
  "bypass",
  "override",
  "reveal",
  "system",
  "developer",
  "prompt",
  "instruction",
  "instructions",
];

export function normalizeAndCleanText(value: string): string {
  return value.normalize("NFKC").replace(CONTROL_CHARS_REGEX, "").trim();
}

export function containsDangerousMarkup(value: string): boolean {
  return DANGEROUS_MARKUP_PATTERNS.some((pattern) => pattern.test(value));
}

function sortString(value: string): string {
  return value.split("").sort().join("");
}

function isTypoglycemiaVariant(word: string, target: string): boolean {
  if (word.length !== target.length || word.length < 4) return false;
  if (word === target) return false;
  if (word[0] !== target[0]) return false;
  if (word[word.length - 1] !== target[target.length - 1]) return false;

  const wordMiddle = word.slice(1, -1);
  const targetMiddle = target.slice(1, -1);
  return sortString(wordMiddle) === sortString(targetMiddle);
}

function containsTypoglycemiaAttack(value: string): boolean {
  const words = (value.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).slice(0, 256);
  let suspiciousCount = 0;

  for (const word of words) {
    const isSuspicious = TYPOGLYCEMIA_KEYWORDS.some((keyword) => isTypoglycemiaVariant(word, keyword));
    if (isSuspicious) {
      suspiciousCount += 1;
      if (suspiciousCount >= 2) {
        return true;
      }
    }
  }

  return false;
}

function decodeBase64Safely(value: string): string | null {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    // guard against high-binary payloads and false positives
    if (!/^[\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]{8,}$/.test(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function containsEncodedInjection(value: string): boolean {
  const candidates = value.match(BASE64_CANDIDATE_REGEX) ?? [];
  for (const candidate of candidates) {
    const decoded = decodeBase64Safely(candidate);
    if (!decoded) continue;
    if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(decoded.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

export function containsPromptInjectionIndicators(value: string): boolean {
  const normalized = normalizeAndCleanText(value).toLowerCase();

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (containsEncodedInjection(normalized)) {
    return true;
  }

  return containsTypoglycemiaAttack(normalized);
}

function hasUnsafeObjectKeys(value: unknown, seen = new WeakSet<object>()): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const objectValue = value as Record<string, unknown>;
  if (seen.has(objectValue)) {
    return false;
  }
  seen.add(objectValue);

  for (const key of Object.keys(objectValue)) {
    if (DISALLOWED_OBJECT_KEYS.has(key)) {
      return true;
    }

    if (hasUnsafeObjectKeys(objectValue[key], seen)) {
      return true;
    }
  }

  return false;
}

function fail(
  res: Response,
  message: string,
  code: string,
  status = 400,
  details?: string,
): Response {
  const extras = details ? { details } : undefined;
  return sendErrorResponse(res, status, message, code, extras);
}

type SanitizedStringOptions = {
  field: string;
  value: unknown;
  minLength: number;
  maxLength: number;
  blockPromptInjection?: boolean;
  blockDangerousMarkup?: boolean;
};

function sanitizeStringField(options: SanitizedStringOptions): { ok: true; value: string } | { ok: false; error: string } {
  const { field, value, minLength, maxLength, blockPromptInjection, blockDangerousMarkup } = options;

  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }

  const cleaned = normalizeAndCleanText(value);

  if (cleaned.length < minLength || cleaned.length > maxLength) {
    return {
      ok: false,
      error: `${field} must be between ${minLength} and ${maxLength} characters`,
    };
  }

  if (blockPromptInjection && containsPromptInjectionIndicators(cleaned)) {
    return { ok: false, error: `${field} contains disallowed prompt-injection patterns` };
  }

  if (blockDangerousMarkup && containsDangerousMarkup(cleaned)) {
    return { ok: false, error: `${field} contains disallowed markup patterns` };
  }

  return { ok: true, value: cleaned };
}

function validateBodyObject(req: Request, res: Response): req is Request & { body: Record<string, unknown> } {
  if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
    fail(res, "Invalid request body", "SECURITY_INVALID_BODY");
    return false;
  }

  if (hasUnsafeObjectKeys(req.body)) {
    fail(res, "Unsafe object keys in request body", "SECURITY_UNSAFE_OBJECT_KEYS");
    return false;
  }

  return true;
}

export function apiSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  if (req.originalUrl.startsWith("/api/docs")) {
    next();
    return;
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  next();
}

export function validateIngestionTextSecurity(req: Request, res: Response, next: NextFunction): void {
  if (!validateBodyObject(req, res)) return;

  const question = sanitizeStringField({
    field: "question",
    value: req.body.question,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });

  if (!question.ok) {
    fail(res, question.error, "SECURITY_INVALID_QUESTION");
    return;
  }

  req.body.question = question.value;

  if (typeof req.body.category === "string") {
    const category = sanitizeStringField({
      field: "category",
      value: req.body.category,
      minLength: 1,
      maxLength: 64,
      blockDangerousMarkup: true,
    });

    if (!category.ok) {
      fail(res, category.error, "SECURITY_INVALID_CATEGORY");
      return;
    }

    req.body.category = category.value;
  }

  next();
}

export function validateStepsRequestSecurity(req: Request, res: Response, next: NextFunction): void {
  if (!validateBodyObject(req, res)) return;

  const question = sanitizeStringField({
    field: "question",
    value: req.body.question,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });

  if (!question.ok) {
    fail(res, question.error, "SECURITY_INVALID_QUESTION");
    return;
  }

  req.body.question = question.value;

  if (typeof req.body.answer === "string" && req.body.answer.length > 0) {
    const answer = sanitizeStringField({
      field: "answer",
      value: req.body.answer,
      minLength: 1,
      maxLength: 2000,
      blockDangerousMarkup: true,
    });

    if (!answer.ok) {
      fail(res, answer.error, "SECURITY_INVALID_ANSWER");
      return;
    }

    req.body.answer = answer.value;
  } else {
    // Allow empty answer for evaluation purposes
    req.body.answer = '';
  }

  if (typeof req.body.category === "string") {
    const category = sanitizeStringField({
      field: "category",
      value: req.body.category,
      minLength: 1,
      maxLength: 64,
      blockDangerousMarkup: true,
    });

    if (!category.ok) {
      fail(res, category.error, "SECURITY_INVALID_CATEGORY");
      return;
    }

    req.body.category = category.value;
  }

  next();
}

export function validateGenerateExplanationSecurity(req: Request, res: Response, next: NextFunction): void {
  if (!validateBodyObject(req, res)) return;

  const question = sanitizeStringField({
    field: "question",
    value: req.body.question,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!question.ok) {
    fail(res, question.error, "SECURITY_INVALID_QUESTION");
    return;
  }

  const answer = sanitizeStringField({
    field: "answer",
    value: req.body.answer,
    minLength: 1,
    maxLength: 1000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!answer.ok) {
    fail(res, answer.error, "SECURITY_INVALID_ANSWER");
    return;
  }

  if (typeof req.body.step !== "object" || req.body.step === null || Array.isArray(req.body.step)) {
    fail(res, "step must be an object", "SECURITY_INVALID_STEP");
    return;
  }

  const stepObject = req.body.step as Record<string, unknown>;
  if (hasUnsafeObjectKeys(stepObject)) {
    fail(res, "Unsafe object keys in step", "SECURITY_UNSAFE_OBJECT_KEYS");
    return;
  }

  if (typeof stepObject.step !== "number" || !Number.isFinite(stepObject.step)) {
    fail(res, "step.step must be a number", "SECURITY_INVALID_STEP_NUMBER");
    return;
  }

  const stepExplanation = sanitizeStringField({
    field: "step.explanation",
    value: stepObject.explanation,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!stepExplanation.ok) {
    fail(res, stepExplanation.error, "SECURITY_INVALID_STEP_EXPLANATION");
    return;
  }

  req.body.question = question.value;
  req.body.answer = answer.value;
  stepObject.explanation = stepExplanation.value;

  next();
}

export function validateFollowUpSecurity(req: Request, res: Response, next: NextFunction): void {
  if (!validateBodyObject(req, res)) return;

  const explanation = sanitizeStringField({
    field: "explanation",
    value: req.body.explanation,
    minLength: 1,
    maxLength: 6000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!explanation.ok) {
    fail(res, explanation.error, "SECURITY_INVALID_EXPLANATION");
    return;
  }

  const question = sanitizeStringField({
    field: "question",
    value: req.body.question,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!question.ok) {
    fail(res, question.error, "SECURITY_INVALID_QUESTION");
    return;
  }

  const ogQuestion = sanitizeStringField({
    field: "ogQuestion",
    value: req.body.ogQuestion,
    minLength: 1,
    maxLength: 2000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!ogQuestion.ok) {
    fail(res, ogQuestion.error, "SECURITY_INVALID_ORIGINAL_QUESTION");
    return;
  }

  const answer = sanitizeStringField({
    field: "answer",
    value: req.body.answer,
    minLength: 1,
    maxLength: 1000,
    blockPromptInjection: true,
    blockDangerousMarkup: true,
  });
  if (!answer.ok) {
    fail(res, answer.error, "SECURITY_INVALID_ANSWER");
    return;
  }

  req.body.explanation = explanation.value;
  req.body.question = question.value;
  req.body.ogQuestion = ogQuestion.value;
  req.body.answer = answer.value;

  next();
}

export function isSafeDisplayName(displayName: string): boolean {
  return SAFE_DISPLAY_NAME_REGEX.test(displayName);
}

export function validateUpdateUsernameSecurity(req: Request, res: Response, next: NextFunction): void {
  if (!validateBodyObject(req, res)) return;

  const displayName = sanitizeStringField({
    field: "displayName",
    value: req.body.displayName,
    minLength: 1,
    maxLength: 40,
    blockDangerousMarkup: true,
  });

  if (!displayName.ok) {
    fail(res, displayName.error, "SECURITY_INVALID_DISPLAY_NAME");
    return;
  }

  if (!isSafeDisplayName(displayName.value)) {
    fail(
      res,
      "displayName contains unsupported characters",
      "SECURITY_INVALID_DISPLAY_NAME",
    );
    return;
  }

  req.body.displayName = displayName.value;
  next();
}

export function detectImageTypeFromSignature(buffer: Buffer): "jpeg" | "png" | "webp" | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function validateImageUploadSecurity(req: Request, res: Response, next: NextFunction): void {
  const file = req.file;
  if (!file) {
    fail(res, "No image uploaded", "SECURITY_MISSING_FILE");
    return;
  }

  const normalizedName = normalizeAndCleanText(file.originalname || "");
  if (!normalizedName || normalizedName.length > 120) {
    fail(res, "Invalid image filename", "SECURITY_INVALID_FILENAME");
    return;
  }

  const signatureType = detectImageTypeFromSignature(file.buffer);
  const expectedType = IMAGE_MIME_TO_SIGNATURE_TYPE[file.mimetype];

  if (!signatureType || !expectedType || signatureType !== expectedType) {
    fail(
      res,
      "Image signature does not match declared MIME type",
      "SECURITY_INVALID_FILE_SIGNATURE",
    );
    return;
  }

  next();
}
