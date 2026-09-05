/**
 * Which language to text somebody in (MISSION.md RESPOND r10).
 *
 * Stored per phone number rather than per lead or per waitlist row, for the same
 * reason the opt-out registry is: somebody who writes to us in Spanish means it
 * for every message we ever send them, not just for the one list they happen to
 * be on when they said it.
 */

import { db } from "@/lib/db";
import { DEFAULT_LANGUAGE, asLanguage, type Language } from "./copy";
import { foldKeyword, normalisePhone } from "./types";

/** How we learned somebody's language. */
export type LanguageSource = "reply" | "form" | "operator";

/**
 * Words that only a Spanish speaker sends. Every one of these is unambiguous in
 * a one-or-two-word SMS reply — `ok`, `no` and `info` are excluded precisely
 * because they are not.
 */
const SPANISH_MARKERS = new Set([
  "si", "sii", "claro", "dale", "bueno", "gracias", "ayuda", "hola", "buenas",
  "parar", "para", "pare", "alto", "cancelar", "salir", "baja", "eliminar",
  "inicio", "iniciar", "comenzar", "reactivar", "cuanto", "cuando", "donde",
  "precio", "precios", "disponible", "unidad", "bodega", "necesito", "quiero",
  "informacion", "mas", "tienen", "cuesta",
]);

/** Characters that effectively only appear in Spanish in our inbound traffic. */
const SPANISH_CHARS = /[ñáíóú¿¡]/i;

/**
 * Read a language off an inbound message.
 *
 * Returns `null` for "no signal", which is not the same as English. A reply of
 * "ok" or "STOP" tells us nothing about language — STOP is a universal keyword —
 * and treating silence as English would reset somebody who has already told us
 * they speak Spanish. So this only ever flips a contact TO Spanish; an operator
 * has to set English back explicitly.
 */
export function detectLanguage(body: string | null | undefined): Language | null {
  if (!body) return null;
  if (SPANISH_CHARS.test(body)) return "es";

  const words = body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/);
  if (words.some((w) => w && SPANISH_MARKERS.has(w))) return "es";

  // A single-word reply, folded the same way the keyword matchers fold it.
  const folded = foldKeyword(body);
  return folded && SPANISH_MARKERS.has(folded) ? "es" : null;
}

/** The language we should text one number in. Defaults to English. */
export async function languageFor(phone: string | null | undefined): Promise<Language> {
  const to = normalisePhone(phone);
  if (!to) return DEFAULT_LANGUAGE;
  const rows = await db.$queryRaw<{ language: string }[]>`
    SELECT language FROM contact_language WHERE phone = ${to} LIMIT 1
  `;
  return rows[0] ? asLanguage(rows[0].language) : DEFAULT_LANGUAGE;
}

/**
 * Languages for many numbers at once.
 *
 * The rescue sweep handles up to 50 leads per run, and 50 round trips to answer
 * a question this small is how a five-minute cron starts timing out.
 */
export async function languagesFor(phones: (string | null | undefined)[]): Promise<Map<string, Language>> {
  const wanted = [...new Set(phones.map(normalisePhone).filter((p): p is string => !!p))];
  const out = new Map<string, Language>();
  if (wanted.length === 0) return out;

  const rows = await db.$queryRaw<{ phone: string; language: string }[]>`
    SELECT phone, language FROM contact_language WHERE phone = ANY(${wanted}::text[])
  `;
  for (const r of rows) out.set(r.phone, asLanguage(r.language));
  return out;
}

/**
 * Record somebody's language.
 *
 * A reply never overwrites what an operator or a form set deliberately: those
 * are statements of fact, a detected reply is an inference, and an inference
 * should not silently undo a fact.
 */
export async function setLanguage(
  phone: string | null | undefined,
  language: Language,
  source: LanguageSource
): Promise<Language> {
  const to = normalisePhone(phone);
  if (!to) return DEFAULT_LANGUAGE;

  // The CASE arms, rather than a guard in the WHERE, so the statement always
  // returns a row: we need the language that is now stored, which is not the
  // same as the one we asked for when a deliberate setting overrules a guess.
  const rows = await db.$queryRaw<{ language: string }[]>`
    INSERT INTO contact_language (phone, language, source, created_at, updated_at)
    VALUES (${to}, ${language}, ${source}, now(), now())
    ON CONFLICT (phone) DO UPDATE
      SET language = CASE
            WHEN ${source} = 'reply' AND contact_language.source IN ('form', 'operator')
            THEN contact_language.language ELSE EXCLUDED.language END,
          source = CASE
            WHEN ${source} = 'reply' AND contact_language.source IN ('form', 'operator')
            THEN contact_language.source ELSE EXCLUDED.source END,
          updated_at = now()
    RETURNING language
  `;
  return rows[0] ? asLanguage(rows[0].language) : DEFAULT_LANGUAGE;
}

/**
 * Learn a language from an inbound message, if it says anything.
 *
 * Best-effort: a failure here must never stop us answering a STOP.
 */
export async function noteLanguageFromReply(
  phone: string | null | undefined,
  body: string | null | undefined
): Promise<Language> {
  const detected = detectLanguage(body);
  if (!detected) return languageFor(phone);
  try {
    // The effective language, not the detected one: an operator who set English
    // on this contact outranks our reading of one reply.
    return await setLanguage(phone, detected, "reply");
  } catch {
    return detected;
  }
}
