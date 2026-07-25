import { redis } from "../lib/redis";
import { createHash } from "crypto";

type StepItem = { step: number; explanation: string; equation?: string | undefined };

const DEFAULT_TTL = parseInt(process.env.REDIS_TTL_SECONDS ?? "604800", 10); // 7 days
const CACHE_DISABLED = process.env.DISABLE_CACHE === "true";

function longHashFor(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export async function getLongHashFromShort(short: string) {
  return await redis.get(`hash:${short}`);
}

export async function setShortToLong(short: string, longHash: string, ttl = DEFAULT_TTL) {
  // map short (submission id) -> longHash
  return await redis.set(`hash:${short}`, longHash, "EX", ttl);
}

export async function getSubmissionIdFromLongHash(longHash: string) {
  return await redis.get(`hash_rev:${longHash}`);
}

export async function setSubmissionIdForLongHash(longHash: string, submissionId: string, ttl = DEFAULT_TTL) {
  return await redis.set(`hash_rev:${longHash}`, submissionId, "EX", ttl);
}

export async function getAnswerByQuestion(question: string): Promise<{ answer: string; submissionId?: string } | null> {
  const long = longHashFor(question);
  const v = await redis.get(`answer:${long}`);
  if (!v) return null;
  const submissionId = await getSubmissionIdFromLongHash(long);
  if (submissionId == null) {
    return { answer: v };
  }
  return { answer: v, submissionId };
}

export async function setAnswerForQuestionWithSubmissionId(question: string, answer: string, submissionId: string, ttl = DEFAULT_TTL) {
  const long = longHashFor(question);
  await redis.set(`answer:${long}`, answer, "EX", ttl);
  await setShortToLong(submissionId, long, ttl);
  await setSubmissionIdForLongHash(long, submissionId, ttl);
}

export async function getStepsForQuestion(question: string): Promise<StepItem[] | null> {
  if (CACHE_DISABLED) return null;
  const long = longHashFor(question);
  const v = await redis.get(`steps:${long}`);
  if (!v) return null;
  try {
    return JSON.parse(v) as StepItem[];
  } catch {
    return null;
  }
}

export async function setStepsForQuestion(question: string, steps: StepItem[], submissionId?: string, ttl = DEFAULT_TTL) {
  if (CACHE_DISABLED) return;
  const long = longHashFor(question);
  await redis.set(`steps:${long}`, JSON.stringify(steps), "EX", ttl);
  if (submissionId) {
    await setShortToLong(submissionId, long, ttl);
    await setSubmissionIdForLongHash(long, submissionId, ttl);
  }
}

type HintItem = { text: string };
type HintData = { hintGeneral: string; hints: HintItem[] };

export async function getHintsForQuestion(question: string): Promise<HintData | null> {
  if (CACHE_DISABLED) return null;
  const long = longHashFor(question);
  const v = await redis.get(`hints:${long}`);
  if (!v) return null;
  try {
    return JSON.parse(v) as HintData;
  } catch {
    return null;
  }
}

export async function setHintsForQuestion(question: string, hints: HintData, ttl = DEFAULT_TTL) {
  if (CACHE_DISABLED) return;
  const long = longHashFor(question);
  await redis.set(`hints:${long}`, JSON.stringify(hints), "EX", ttl);
}

export async function getPracticeListForQuestion(question: string): Promise<string[]> {
  const long = longHashFor(question);
  const items = await redis.lrange(`practice:${long}`, 0, -1);
  return items ?? [];
}

export async function appendPracticeListForQuestion(question: string, items: string[], ttl = DEFAULT_TTL) {
  if (!items || items.length === 0) return;
  const long = longHashFor(question);
  await redis.rpush(`practice:${long}`, ...items);
  // set TTL on the list key
  await redis.expire(`practice:${long}`, ttl);
}

export async function ensurePracticeItems(question: string, category: string, count: number, generator: (q: string, c: string, n: number) => Promise<string[]>): Promise<string[]> {
  const existing = await getPracticeListForQuestion(question);
  if (existing.length >= count) return existing.slice(0, count);

  const need = count - existing.length;
  const generated = await generator(question, category, need);
  if (generated.length > 0) {
    await appendPracticeListForQuestion(question, generated);
  }

  const updated = await getPracticeListForQuestion(question);
  return updated.slice(0, count);
}

export default {
  getAnswerByQuestion,
  setAnswerForQuestionWithSubmissionId,
  getStepsForQuestion,
  setStepsForQuestion,
  getHintsForQuestion,
  setHintsForQuestion,
  getPracticeListForQuestion,
  appendPracticeListForQuestion,
  ensurePracticeItems,
  getLongHashFromShort,
  getSubmissionIdFromLongHash,
};
