// Hard-topic blocklist for the AI safety substrate (Operator OS Phase 1, vision §5).
//
// A hit never hard-blocks customer service — it routes the AI draft into the
// human review queue instead of auto-publishing. False positives are cheap (an
// operator approves a clean reply); a sensitive topic auto-answered by AI is
// not. Keep this list conservative and high-signal.

export interface BlocklistResult {
  hit: boolean;
  term?: string;
  category?: string;
}

interface BlocklistRule {
  category: string;
  terms: string[]; // matched case-insensitively on word boundaries
}

const BLOCKLIST: BlocklistRule[] = [
  { category: "legal", terms: ["lawsuit", "lawyer", "attorney", "litigation", "subpoena", "small claims", "take legal action", "liable"] },
  { category: "threat", terms: ["threaten", "threatened", "kill you", "violence", "assault"] },
  { category: "injury", terms: ["injured", "got hurt", "ambulance", "hospitalized"] },
  { category: "death", terms: ["died", "deceased", "fatal", "passed away"] },
  { category: "fire", terms: ["fire", "arson", "burned down"] },
  { category: "weapons", terms: ["gun", "guns", "firearm", "firearms", "ammunition", "explosive", "bomb"] },
  { category: "contraband", terms: ["narcotics", "meth", "cocaine", "stolen goods", "contraband", "illegal drugs"] },
  { category: "hazardous", terms: ["hazardous", "toxic waste", "chemical spill", "biohazard", "asbestos"] },
  { category: "self_harm", terms: ["suicide", "kill myself", "self-harm"] },
  { category: "child_safety", terms: ["child endangerment", "underage", "kidnap"] },
];

// Pre-compile one word-boundary regex per term.
const COMPILED: { category: string; term: string; re: RegExp }[] = BLOCKLIST.flatMap(
  (rule) =>
    rule.terms.map((term) => ({
      category: rule.category,
      term,
      re: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
    }))
);

export function checkBlocklist(text: string | null | undefined): BlocklistResult {
  if (!text) return { hit: false };
  for (const { category, term, re } of COMPILED) {
    if (re.test(text)) return { hit: true, term, category };
  }
  return { hit: false };
}

export const BLOCKLIST_CATEGORIES = BLOCKLIST.map((r) => r.category);
