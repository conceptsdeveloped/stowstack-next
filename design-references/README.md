# StorageAds — Design References

## Purpose (instructions for Claude)

This folder exists so you can **decompose reference images into concrete design elements, then recreate and repurpose those elements** in two places:

1. **The StorageAds site itself** — landing page sections, hero treatments, ad mockups, admin UI surfaces, component styling, CSS tokens.
2. **Generated imagery and video** — prompts and templates in `src/app/api/generate-image/route.ts`, `src/app/api/generate-video/route.ts`, `CREATIVE.md` doctrine, style directives in `src/lib/style-references.ts`.

### Your workflow when doing visual work

1. **Read this README and open the relevant category folder(s)** before writing any code, prompt, or CSS.
2. **Decompose each relevant image into its parts:** type treatment, color palette, composition, texture/finish, frame/border device, photographic treatment, copy voice, pairing of type+image. Ignore parts the `Intent` column tells you to ignore.
3. **Map the extracted elements to the target surface.** Example: the offset-frame device from `editorial-zine/01` becomes a card component's `box-shadow` + pseudo-element, not a wholesale clone of the image. The halftone finish in `editorial-zine/02` becomes an image-processing directive in the generate-image prompt, not a CSS filter on site photos.
4. **Recreate, don't copy.** The goal is to translate the *feeling* and *structural devices* of the reference into StorageAds' own visual vocabulary — same editorial logic, new subject matter (self-storage, facilities, ad performance).
5. **Repurpose across surfaces.** A single reference should inform multiple places: e.g. the bold sans-serif hero style in `typography/01` applies to site hero headlines AND to ad creative templates AND to video title cards. When you touch one, consider whether the others should stay consistent.
6. **Match precisely, not approximately.** The user has flagged that "close enough" is unacceptable. If you can't match a specific element, say so — don't approximate and move on.

### How the folder is organized

- Each category subfolder groups references by the *kind of problem they solve* (type, editorial finish, photography, copy/concept).
- Each image has a one-line **Intent** in the tables below. That line is the contract: it tells you which element(s) to extract and which to ignore. Read it before looking at the image.
- **New reference?** Drop it in the right subfolder as `NN-short-name.jpg`, then add a row to the table with an Intent line. Without the Intent line, the image is noise — I won't know what to extract.
- **Replacing vs. adding:** If a new reference supersedes an old one, delete the old one. Don't let stale refs accumulate.

## Aesthetic direction (summary)

StorageAds has **two voices working against each other**, on purpose:

### 1. The editorial voice (what the references in this folder describe)

Editorial zine × oversized sans-serif × cinematic film photography × dry, confident copy. Think newsprint/letterpress finish, offset-frame halftones, massive hero type that fills the frame, and a preference for found/real imagery over stock or AI. Flat graphic color blocks allowed as accents (see `editorial-zine/03`). Ties into the A24/Kubrick editorial principle in `CREATIVE.md`.

**This voice carries emotion.** It's what tells the reader "this was made by people who care about what they're saying." Use it for headlines, captions, editorial imagery, CTA moments, brand statements, storytelling sections, blog posts written in operator voice.

### 2. The system voice (the engineering layer)

Monospace body type, terminal-sparse color palette, grid-true layouts, no decoration-for-decoration's-sake. Admin chrome, data tables, metric readouts, technical UI surfaces, code-adjacent captions, attribution panels, timestamps, deltas, currency. This is what the `.admin-theme` scope does in `globals.css`, and what the `.urbit-landing` body class extends to parts of the marketing site that benefit from a system feel.

**This voice carries precision.** It's what tells the reader "this wasn't just designed — it was engineered." Use it for: anything numeric, anything that looks like operating-system chrome, anything where a human expects to see *machine output*.

### How the two voices divide the page

- **Headline = editorial.** Heavy sans display, tight leading, space around it. (See `typography/01`, `typography/02`.)
- **Hero body / lead copy = editorial.** Italic serif or heavy sans, never monospace.
- **Eyebrow / category labels = system.** Monospace, uppercase, letterspaced, small.
- **Metric readouts (KPIs, prices, percentages, timestamps) = system.** Monospace.
- **Captions under imagery = editorial.** Italic serif. (See `editorial-zine/01`, `editorial-zine/02`.)
- **Body prose = editorial** on emotional surfaces (homepage, about, blog), **system** on technical surfaces (admin, audit JSON, dev tooling).
- **CTAs = editorial on light, system on dark admin/data surfaces.**

The rule is: **the voice should match the job, not the page.** A single marketing section can contain both — an editorial headline above a system metric strip above an editorial caption. That pairing is the signature of the site.

### Why two voices and not one

One voice is a brand. Two voices that don't fight is a product. The editorial voice without the system voice reads like a lifestyle blog; the system voice without the editorial reads like unstyled dev tooling. Together they say "an operator who partnered with real engineering" — which happens to be the actual fact of the company and the implicit trust signal behind everything else.

**A reference with monospace inside this folder** (concept-copy/02, the Urbit grid) is not telling you to steal monospace wholesale — it's showing you the **structural device** (repetition + disruption) that the system voice is good at delivering. Extract the device, not the brand.

---

## typography/

Hero type treatments — what headlines should feel like.

| File | Intent |
|---|---|
| `01-do-what-you-need-online.jpg` | **Hero-scale bold sans-serif filling the frame.** Extract: type weight (heavy, ~800), tight leading, lowercase or sentence case, small accent glyph (cursor) as punctuation. Ignore the washed-out bottom paper texture unless doing a newsprint piece. |
| `02-some-places-better.jpg` | **Slab-italic sans, max contrast, lots of whitespace below the headline.** Extract: italic treatment for the hero line, generous negative space beneath (not centered — weight top-left). Good reference for section openers. |

## editorial-zine/

Newsprint, halftone, letterpress, zine finish.

| File | Intent |
|---|---|
| `01-recharge-yourself.jpg` | **Offset double-frame around image, italic serif caption beneath.** Extract: the offset-frame treatment (duplicate rectangle shifted ~6px down-right), italic serif for the caption. Use for editorial cards or quote blocks. |
| `02-sundays-unwind.jpg` | **Halftone photograph inside offset frame with italic caption.** Extract: halftone grain on imagery, same offset-frame device. Body copy is italic serif, centered, short. Good for testimonial or "principle" cards. |
| `03-trust-living-online-green.jpg` | **Flat graphic color block with small logomark + stacked left-aligned copy.** Extract: the courage to use a flat green field as a full section background, small mark paired with tight 4-word stacked label. Reference for CTA blocks or brand moments, not for the logo itself. |

## photography/

When real photography is called for — never stock, never AI.

| File | Intent |
|---|---|
| `01-forest-true.jpg` | **Cinematic film grain, natural light, small human scale against landscape, object with type in scene.** Extract: the A24-ish color grade (muted greens, warm highlights), in-scene signage as a storytelling device. Reference for any hero photography. |
| `02-hills-arrows.jpg` | **B&W photojournalism + overlaid hand-drawn white arrows/annotations.** Extract: the *annotation* treatment — overlaying rough directional glyphs on documentary imagery. Good for "how it works" diagrams or diagnostic visuals where a real photo is marked up. |

## concept-copy/

How dry, confident copy pairs with found/real imagery.

| File | Intent |
|---|---|
| `01-generators-war-empire.jpg` | **Real-world object listing + wry commentary as caption.** Extract: the *tone* of the caption ("for the war and the coming empire") — short, confident, slightly mythic, doesn't try to sell. Copy reference, not visual. Good for ad headline voice. |
| `02-urbit-grid-discord.jpg` | **Repetition grid with one cell breaking the pattern to deliver the message.** Extract: the structural device (5×5 identical + 1 disruptor). Use for conceptual brand moments, statement sections, not dashboards. |

---

## What this folder is *not*

- Not a pixel-accurate spec — for that see `STORAGEADS_DESIGN_BIBLE.md` on `~/Desktop/`.
- Not the brand doctrine — see `BRAND_DOCTRINE.md` at repo root.
- Not a dumping ground for pretty images. Every ref needs an intent line or it gets deleted.
