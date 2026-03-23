# COMPLIANCE.md — Platform Advertising Policy Reference

This document is a reference for the post-generation compliance validator. It is NOT injected into creative generation prompts. Its purpose is to define the rules that generated content is checked against before publishing.

---

## Meta (Facebook/Instagram) Advertising Policies

### Prohibited Content
- Ads must not contain misleading or false claims about products, services, or pricing
- No "bait-and-switch" — the landing page must match the ad's claims (price, offer, availability)
- No content that implies or generates negative self-perception ("Is your life a mess?")
- No before/after images that depict unrealistic or unlikely results
- No deceptive buttons or UI elements that look like interactive features but are just images
- No ads that assert or imply knowledge of personally identifiable information ("We know you just moved!")

### Special Ad Categories (Housing Adjacency)
- Self-storage is NOT classified as housing, but shares proximity. Exercise caution:
- NEVER use demographic exclusions (age, gender, ethnicity) in targeting recommendations
- NEVER reference "families" as a targeting criterion in a way that could be interpreted as housing discrimination
- Location-based targeting (radius, zip code) is always acceptable
- Interest-based targeting (moving, home organization, decluttering) is acceptable

### Andromeda/Lattice Ranking Signals (Positive Practices)
- High engagement rate (relevance score) improves delivery
- Low negative feedback (hide, report) improves delivery
- Fresh creative rotation (every 2-3 weeks) prevents fatigue penalties
- Relevance signals: local area references, specific pricing, specific unit types
- Native-feeling content outperforms overtly promotional content
- Text-heavy images receive reduced delivery (keep text under 20% of image area)

### Content Restrictions
- No ALL CAPS body text (single emphasized words acceptable: "FREE", "NOW")
- No excessive exclamation marks (max 1 per ad)
- No emojis that replace words or create confusion
- No misleading use of urgency ("Only 2 left!" must reflect real inventory data)
- No fake social proof ("Thousands of happy customers" without verification)
- Pricing must be current and match the landing page exactly
- Review counts and ratings must be current (within 30 days)
- Promotions ("First month free") must be actually active at the facility

### Landing Page Requirements
- Landing page must load and be functional
- Content must match ad claims
- No automatic downloads or unexpected redirects
- Clear business identification on the page
- Privacy policy must be accessible

---

## Google Ads Policies

### Content Accuracy
- Headlines must accurately represent the business and offering
- No keyword stuffing in ad copy
- Display URL must match the landing page domain
- No misleading extensions or callouts
- Price extensions must reflect actual current pricing

### Responsive Search Ads (RSA) Specific
- Headlines must be independently coherent (they appear in random combinations)
- No duplicate meaning across headlines (variety is required)
- No trademarked terms of competitors
- Call extensions must use a working, staffed phone number
- Sitelinks must lead to distinct, relevant pages

### Landing Page Quality
- Page must load quickly (under 3 seconds)
- Content must be relevant to the ad
- Navigation must be clear
- Mobile-friendly required
- No interstitials or popups blocking content

---

## SMS / TCPA Compliance

### Consent Requirements
- Must have prior express written consent before sending marketing SMS
- Consent must be clear, not bundled with other agreements
- Must identify the sender (facility name)
- Must include opt-out instructions in every message ("Reply STOP to unsubscribe")

### Content Rules
- Business hours only (8am-9pm recipient's local time)
- No more than 2 messages without a response
- Personalization required (name, unit type referenced)
- No misleading sender identification
- No URL shorteners that obscure the destination

---

## General Compliance Rules (All Platforms)

### Pricing & Offers
- All advertised prices must be currently available at the facility
- "Starting at $X" must reflect the actual lowest available price
- Promotional offers must be currently active
- Expiration dates on offers must be real
- No hidden fees or conditions not mentioned in the ad

### Social Proof & Claims
- Star ratings must match the facility's current rating (within 0.1)
- Review counts must be current (within 30 days of the actual count)
- "X families trust us" or similar claims must be verifiable
- No fabricated testimonials or reviews
- No implied endorsements that don't exist

### Urgency & Scarcity
- "Limited units" or "filling fast" must reflect actual occupancy data
- "Only X left" must be verified from real-time inventory
- Seasonal urgency ("spring special ends soon") is acceptable if the promotion exists
- Never manufacture false urgency to pressure conversion

### Targeting & Discrimination
- Always use location-based targeting as the primary method
- Interest-based targeting is acceptable (moving, organization, decluttering)
- Never recommend demographic exclusions
- Never use language that could be perceived as discriminatory
- "Near you" and location-specific references are always safe

---

## How This File Is Used

This document is loaded by the compliance validator at `src/lib/compliance.ts`. After ad copy is generated, a separate validation pass checks the output against these rules and returns:
- `passed` — no policy violations detected
- `flagged` — potential violations found, requires human review before publishing
- `failed` — clear policy violation, must be revised

The compliance check runs automatically on generation. Flagged or failed variations cannot be published until reviewed and resolved.
