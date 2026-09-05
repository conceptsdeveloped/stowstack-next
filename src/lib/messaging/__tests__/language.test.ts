import { describe, expect, it } from "vitest";
import { COPY, LANGUAGES, asLanguage, t, type Language, type Templates } from "@/lib/messaging/copy";
import { detectLanguage } from "@/lib/messaging/language";
import { foldKeyword, isStartReply, isStopReply, segmentCount } from "@/lib/messaging/types";
import { classifyInbound, replies } from "@/lib/messaging/inbound";

describe("asLanguage", () => {
  it("takes what it knows", () => {
    expect(asLanguage("es")).toBe("es");
    expect(asLanguage("ES")).toBe("es");
    expect(asLanguage("es-MX")).toBe("es");
    expect(asLanguage("en-US")).toBe("en");
  });
  // A bad locale string on a landing page must cost us nothing.
  it("falls back to English rather than throwing", () => {
    ["", "  ", "fr", "klingon", null, undefined].forEach((v) =>
      expect(asLanguage(v as string | null)).toBe("en")
    );
  });
});

describe("keyword folding", () => {
  // Without accent folding `sí` reduces to `s` and matches nothing.
  it("strips accents instead of destroying the word", () => {
    expect(foldKeyword("sí")).toBe("si");
    expect(foldKeyword("  PARÁ! ")).toBe("para");
    expect(foldKeyword("ALTO.")).toBe("alto");
  });
  it("collapses a sentence into something that matches no keyword", () => {
    expect(foldKeyword("para mi unidad")).toBe("paramiunidad");
  });
});

describe("Spanish opt-out is honoured", () => {
  // We send "Responde PARAR para salir". If PARAR does nothing, that message is
  // a lie and the opt-out obligation is unmet.
  it("treats the Spanish stop words as stop", () => {
    ["PARAR", "parar", "Pará", "alto", "CANCELAR", "salir", "baja", "eliminar"].forEach((w) =>
      expect(isStopReply(w)).toBe(true)
    );
  });
  it("still honours the English ones", () => {
    ["STOP", "unsubscribe", "quit", "opt-out"].forEach((w) => expect(isStopReply(w)).toBe(true));
  });
  // Declining one unit is not unsubscribing from everything.
  it("does NOT treat a plain no as an opt-out in either language", () => {
    expect(isStopReply("no")).toBe(false);
    expect(isStopReply("nope")).toBe(false);
  });
  it("routes Spanish stop words through the classifier as stop", () => {
    ["PARAR", "alto", "salir"].forEach((w) => expect(classifyInbound(w)).toBe("stop"));
  });
});

describe("Spanish resubscribe and confirm", () => {
  it("INICIO resubscribes, because that is what our Spanish copy tells them", () => {
    expect(isStartReply("INICIO")).toBe(true);
    expect(classifyInbound("INICIO")).toBe("start");
  });
  // `si` must reach the hold path, not the resubscribe path.
  it("SI is a confirmation, not a resubscribe", () => {
    expect(isStartReply("si")).toBe(false);
    expect(classifyInbound("si")).toBe("confirm");
    expect(classifyInbound("sí")).toBe("confirm");
  });
  it("AYUDA reaches the help reply", () => {
    expect(classifyInbound("AYUDA")).toBe("help");
  });
});

describe("detectLanguage", () => {
  it("reads Spanish off unambiguous words", () => {
    ["hola", "AYUDA", "cuanto cuesta", "necesito una unidad", "sí"].forEach((b) =>
      expect(detectLanguage(b)).toBe("es")
    );
  });
  it("reads Spanish off Spanish-only characters", () => {
    expect(detectLanguage("¿Cuanto?")).toBe("es");
    expect(detectLanguage("mañana")).toBe("es");
  });
  /**
   * The important half. `null` means "no signal", and no signal must never be
   * read as English — otherwise a STOP or an "ok" from somebody who already
   * told us they speak Spanish silently resets them.
   */
  it("returns null for replies that say nothing about language", () => {
    ["STOP", "ok", "OK", "no", "yes", "", "  ", "10x10", null, undefined].forEach((b) =>
      expect(detectLanguage(b as string | null)).toBeNull()
    );
  });
});

describe("every template exists in every language", () => {
  const KEYS: (keyof Templates)[] = [
    "missedCall", "leadAck", "operatorAlert", "rescue", "waitlist",
    "stop", "start", "help", "heldOk", "heldGone", "noHold",
  ];
  LANGUAGES.forEach((lang) => {
    it(`${lang} implements all ${KEYS.length} templates`, () => {
      KEYS.forEach((k) => expect(COPY[lang][k]).toBeDefined());
    });
  });

  /**
   * A deliberately long real facility name. LONG is 14 characters and
   * flatters the copy; this is 33 and is the shape of a name we actually have on
   * the books, so the segment budget is proved against the worst realistic case
   * rather than the best one.
   */
  const LONG = "Longhorn State Storage Springtown";

  /** Keyed, not indexed, so adding a template cannot silently shift an assertion. */
  const rendered = (lang: Language): Record<string, string> => {
    const c = COPY[lang];
    return {
      missedCall: c.missedCall(LONG),
      leadAck: c.leadAck({ name: "Dana Reeves", unitSize: "10x10", facilityName: LONG }),
      leadAckBare: c.leadAck({ name: null, unitSize: null, facilityName: LONG }),
      operatorAlert: c.operatorAlert({
        name: "Dana Reeves", phone: "+15125550123", unitSize: "10x10", facilityName: LONG,
      }),
      operatorAlertBare: c.operatorAlert({
        name: null, phone: null, unitSize: null, facilityName: LONG,
      }),
      rescue: c.rescue({ name: "Dana Reeves", unitSize: "10x10", facilityName: LONG }),
      rescueBare: c.rescue({ name: null, unitSize: null, facilityName: LONG }),
      waitlist: c.waitlist({ name: "Dana", sizeLabel: "10x10", facilityName: LONG, streetRate: 149 }),
      waitlistBare: c.waitlist({ name: null, sizeLabel: null, facilityName: LONG, streetRate: null }),
      stop: c.stop, start: c.start, help: c.help, heldGone: c.heldGone, noHold: c.noHold,
      heldOk: c.heldOk("10x10", 30), heldOkBare: c.heldOk(null, 30),
    };
  };

  /** Messages that go to a customer. The operator alert is internal. */
  const MARKETING = ["missedCall", "leadAck", "leadAckBare", "rescue", "rescueBare", "waitlist", "waitlistBare"];

  LANGUAGES.forEach((lang) => {
    it(`${lang} never renders null or undefined into a message`, () => {
      Object.values(rendered(lang)).forEach((m) => {
        expect(m).not.toMatch(/null|undefined|NaN/);
        expect(m).not.toMatch(/\s{2,}/); // a dropped name must not leave a double space
        expect(m).toBe(m.trim());
      });
    });

    it(`${lang} carries an opt-out on every marketing message`, () => {
      const optOutWord = lang === "es" ? /PARAR/ : /STOP/;
      const r = rendered(lang);
      MARKETING.forEach((k) => expect(r[k], k).toMatch(optOutWord));
    });

    /**
     * English stays inside one 160-character GSM segment. Spanish cannot: the
     * accents force 70-character UCS-2, so three segments is the honest floor
     * and stripping the accents to beat it is the wrong trade. The cap is here
     * to catch copy that has grown, not to push Spanish back to ASCII.
     */
    it(`${lang} stays inside its segment budget`, () => {
      const cap = lang === "es" ? 3 : 1;
      Object.entries(rendered(lang)).forEach(([k, m]) =>
        expect(segmentCount(m), `${k}: ${m.length} chars`).toBeLessThanOrEqual(cap)
      );
    });
  });

  it("English is plain ASCII, so it bills as one segment", () => {
    Object.entries(rendered("en")).forEach(([k, m]) => expect(/^[\x20-\x7e]*$/.test(m), k).toBe(true));
  });

  it("the two languages are actually different text", () => {
    const en = rendered("en"), es = rendered("es");
    Object.keys(en).forEach((k) => expect(es[k], k).not.toBe(en[k]));
  });

  /**
   * The copy tells people which word to send. If the Spanish copy says PARAR
   * and nothing listens for PARAR, that is worse than sending no Spanish at all.
   */
  it("every keyword the copy names is a keyword we honour", () => {
    const es = COPY.es;
    expect(isStopReply("PARAR")).toBe(true);
    expect(es.missedCall("X")).toMatch(/PARAR/);
    expect(es.stop).toMatch(/INICIO/);
    expect(isStartReply("INICIO")).toBe(true);
    expect(es.waitlist({ name: null, sizeLabel: null, facilityName: "X", streetRate: null })).toMatch(/SI/);
    expect(classifyInbound("SI")).toBe("confirm");

    const en = COPY.en;
    expect(en.stop).toMatch(/START/);
    expect(isStartReply("START")).toBe(true);
    expect(en.waitlist({ name: null, sizeLabel: null, facilityName: "X", streetRate: null })).toMatch(/YES/);
    expect(classifyInbound("YES")).toBe("confirm");
  });

  it("the HELP reply names the sender and the opt-out in both languages", () => {
    LANGUAGES.forEach((lang) => {
      expect(COPY[lang].help).toMatch(/StorageAds/);
      expect(COPY[lang].help).toMatch(lang === "es" ? /PARAR/ : /STOP/);
    });
  });
});

describe("t() and replies()", () => {
  it("hand back the right table", () => {
    expect(t("es").stop).toBe(COPY.es.stop);
    expect(replies("es").stop).toBe(COPY.es.stop);
  });
  it("fall back to English rather than crashing a webhook", () => {
    expect(t("fr").stop).toBe(COPY.en.stop);
    expect(t(null).stop).toBe(COPY.en.stop);
    expect(replies(undefined).stop).toBe(COPY.en.stop);
  });
});
