/**
 * Every outbound message, in every language (MISSION.md RESPOND r10).
 *
 * Built now rather than later on purpose. There are eight templates today and
 * they live in four files; retrofitting a second language once RESPOND is
 * finished means touching every send site instead of one.
 *
 * The shape is deliberate: `Templates` is an interface and each language is a
 * full implementation of it, so a template added in English and forgotten in
 * Spanish is a compile error rather than an English text sent to somebody who
 * asked us in Spanish.
 *
 * ## On accents and cost
 *
 * GSM-03.38 carries ñ, ü, é, ¿ and ¡ but NOT á, í, ó or ú, so honest Spanish
 * forces UCS-2 and a 70-character segment. A rescue text runs three segments
 * instead of one: about two extra cents against a rental worth $150 a month.
 * Stripping the accents to save that is the wrong trade, so the copy keeps them
 * and `segmentCount` — which conservatively treats anything non-ASCII as UCS-2 —
 * costs them correctly.
 */

export type Language = "en" | "es";

export const LANGUAGES: readonly Language[] = ["en", "es"] as const;

export const DEFAULT_LANGUAGE: Language = "en";

export function asLanguage(value: string | null | undefined): Language {
  const v = (value ?? "").trim().toLowerCase().slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(v) ? (v as Language) : DEFAULT_LANGUAGE;
}

export interface RescueInput {
  name: string | null;
  unitSize: string | null;
  facilityName: string;
}

export interface WaitlistInput {
  name: string | null;
  sizeLabel: string | null;
  facilityName: string;
  streetRate: number | null;
}

export interface Templates {
  /** Sent seconds after a call rings out. */
  missedCall(facilityName: string): string;
  /** Sent 10-120 minutes after somebody abandons a rental form. */
  rescue(input: RescueInput): string;
  /** Sent when a unit they are waiting for frees up. */
  waitlist(input: WaitlistInput): string;
  /** Carrier-expected confirmation after an opt-out. Exempt from opt-out itself. */
  stop: string;
  /** Confirmation after an opt-in. */
  start: string;
  /** Carrier-expected reply to HELP. Must name the sender and the opt-out. */
  help: string;
  heldOk(size: string | null, minutes: number): string;
  heldGone: string;
  noHold: string;
}

const firstName = (name: string | null) => (name ? name.trim().split(/\s+/)[0] : "");

/**
 * English. Plain ASCII throughout, deliberately: a single curly quote or em-dash
 * drops the whole message to 70-character UCS-2 and doubles the bill.
 */
const EN: Templates = {
  missedCall: (f) =>
    `Sorry we missed your call at ${f}. Reply here and we'll help you find a unit, ` +
    `or call us back any time. Reply STOP to opt out.`,

  rescue: ({ name, unitSize, facilityName }) =>
    `${name ? `${firstName(name)}, ` : ""}you were part-way through reserving ` +
    `${unitSize ? `the ${unitSize}` : "a unit"} at ${facilityName}. ` +
    `Reply here and we'll finish it for you. Reply STOP to opt out.`,

  waitlist: ({ name, sizeLabel, facilityName, streetRate }) =>
    `${name ? `${firstName(name)}, ` : ""}${sizeLabel ? `a ${sizeLabel}` : "a unit"} ` +
    `just opened up at ${facilityName}${streetRate ? ` at $${Math.round(streetRate)}/mo` : ""}. ` +
    `You're on the waitlist. Reply YES to hold it, STOP to opt out.`,

  stop: "You're unsubscribed and won't get any more texts from us. Reply START to resume.",
  start: "You're resubscribed. Reply STOP at any time to opt out.",
  help: "StorageAds notifies you when a unit opens up. Reply STOP to opt out. Msg & data rates may apply.",

  heldOk: (size, minutes) =>
    `Held${size ? ` a ${size}` : ""} for you for ${minutes} minutes. We'll call to finish the paperwork.`,
  heldGone: "Sorry, that one just went. You're still on the list for the next one.",
  noHold: "Thanks! We don't have anything on hold for you right now, but you're on the list.",
};

/**
 * Spanish. Informal `tú` throughout — this is a neighbourhood storage operator
 * texting somebody who just called them, and `usted` reads like a bank.
 *
 * "Unidad" rather than "bodega": bodega is right in Texas and wrong in New York,
 * and unidad is understood everywhere.
 *
 * The reply keywords people are told to send (SI, PARAR, INICIO) must stay in
 * sync with the Spanish keyword sets in `./types` — a message telling somebody
 * to reply PARAR when nothing listens for PARAR is worse than no Spanish at all.
 */
const ES: Templates = {
  missedCall: (f) =>
    `Perdimos tu llamada en ${f}. Responde aquí y te ayudamos a encontrar una unidad, ` +
    `o llámanos cuando quieras. Responde PARAR para salir.`,

  rescue: ({ name, unitSize, facilityName }) =>
    `${name ? `${firstName(name)}, ` : ""}dejaste a medias tu reserva de ` +
    `${unitSize ? `la ${unitSize}` : "una unidad"} en ${facilityName}. ` +
    `Responde aquí y la terminamos por ti. Responde PARAR para salir.`,

  waitlist: ({ name, sizeLabel, facilityName, streetRate }) =>
    `${name ? `${firstName(name)}, ` : ""}se desocupó ${sizeLabel ? `una ${sizeLabel}` : "una unidad"} ` +
    `en ${facilityName}${streetRate ? ` por $${Math.round(streetRate)}/mes` : ""}. ` +
    `Estás en la lista de espera. Responde SI para apartarla, PARAR para salir.`,

  stop: "Ya no recibirás más mensajes nuestros. Responde INICIO para reactivarlos.",
  start: "Estás suscrito de nuevo. Responde PARAR en cualquier momento para salir.",
  help: "StorageAds te avisa cuando se desocupa una unidad. Responde PARAR para salir. Pueden aplicar tarifas de mensajes y datos.",

  heldOk: (size, minutes) =>
    `Te apartamos${size ? ` una ${size}` : ""} por ${minutes} minutos. Te llamamos para terminar el papeleo.`,
  heldGone: "Lo sentimos, esa se acaba de rentar. Sigues en la lista para la próxima.",
  noHold: "¡Gracias! Ahora mismo no tenemos nada apartado para ti, pero sigues en la lista.",
};

export const COPY: Record<Language, Templates> = { en: EN, es: ES };

/** Templates for a language, falling back to English rather than throwing. */
export function t(language: Language | string | null | undefined): Templates {
  return COPY[asLanguage(typeof language === "string" ? language : language ?? undefined)];
}
