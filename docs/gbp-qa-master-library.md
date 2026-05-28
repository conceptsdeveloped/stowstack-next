# GBP Q&A Master Library — Seed Content for `gbp_question_templates`

**Purpose:** Seed library of storage-vertical questions and answers used to populate every new facility's Google Business Profile with 15-20 high-intent Q&As at onboarding. Per vision doc §4.1 and PRD §3.7.

**Legal posture:** Google explicitly allows business owners to post questions on their own GBP profile alongside the answers (the "Owner" badge surfaces on the question). This is not gray-hat. It is documented in Google's Q&A guidelines as a legitimate use of the surface.

**Substitution variables in `{{double_braces}}`:** filled from `facilities`, `facility_pms_units`, and `facility_pms_specials` at seed time. If a variable can't be filled (e.g., facility doesn't have climate units), the corresponding Q&A is skipped at seed.

**Seeding order:** by `priority DESC`. Top 15 priority items always seeded; items 16-20 seeded if facility data supports them.

**Voice register:** operator voice (`.claude/copy-voice.md`). Plain, concrete, conversational. The answers read like the operator actually wrote them, because in spirit they did.

---

## High-priority Q&As (always seeded — priority 90-100)

### 1. Unit sizes available

**Category:** `sizes`
**Priority:** 100

**Q:** What size storage units do you have?

**A:** We have {{unit_size_list}} units at {{facility_name}}. The most common sizes are 5x10 for small loads (a studio apartment's worth), 10x10 for a one-bedroom or a few rooms of furniture, and 10x15 or 10x20 for a full house. Current prices and availability are at our office or on our website. Stop in or call {{facility_phone}}.

### 2. Climate-controlled availability

**Category:** `climate`
**Priority:** 99
**Skip if:** facility has no climate-controlled inventory

**Q:** Do you have climate-controlled storage?

**A:** Yes, we have climate-controlled units at {{facility_name}}. They're temperature and humidity-regulated, so they're a good fit for electronics, wood furniture, leather, documents, photos, and anything that doesn't do well in extreme heat or cold. Sizes available right now: {{climate_unit_sizes}}. Stop by or call {{facility_phone}} for current pricing.

### 3. Access hours

**Category:** `access_hours`
**Priority:** 98

**Q:** What are your access hours?

**A:** {{facility_name}} gate access hours are {{access_hours}}. Office hours are {{office_hours}}. If you need 24-hour access for business storage, ask us — some facilities accommodate it on a case-by-case basis.

### 4. Security

**Category:** `security`
**Priority:** 97

**Q:** How secure is your facility?

**A:** {{facility_name}} has {{security_features}}. We also keep the property well-lit and the gate keypad-only — your code is unique to you. If anything looks off when you're on the property, our office line is {{facility_phone}} and our manager checks the property regularly.

### 5. Payment methods

**Category:** `payment`
**Priority:** 96

**Q:** How do I pay my storage bill?

**A:** {{facility_name}} accepts all major credit cards, debit cards, ACH bank transfers, and autopay. Most tenants set up autopay so they don't have to think about it. You can pay online at {{facility_website}}, in the office during {{office_hours}}, or by phone at {{facility_phone}}.

### 6. Move-in process

**Category:** `move_in`
**Priority:** 95

**Q:** How do I rent a storage unit from you?

**A:** Three ways at {{facility_name}}: come into our office during {{office_hours}}, call us at {{facility_phone}}, or rent online at {{facility_website}}. Online rental takes about 10 minutes and you get your gate code immediately. If you'd rather see the unit first, just stop by — no appointment needed.

### 7. Required documents

**Category:** `move_in`
**Priority:** 94

**Q:** What do I need to bring to rent a unit?

**A:** At {{facility_name}}, you'll need a government-issued photo ID (driver's license or passport) and a payment method. That's it for rental. We don't require proof of insurance to rent, but we strongly recommend coverage — most renters' or homeowners' policies extend to stored items, and we offer optional storage insurance starting at {{insurance_starting_price}}/month if you don't have coverage.

### 8. Drive-up vs. inside units

**Category:** `unit_type`
**Priority:** 93

**Q:** Do you have drive-up units?

**A:** {{drive_up_availability}} at {{facility_name}}. Drive-up units let you pull right up to your door — no carts, no hallways. They're the easiest to load and unload. Inside units stay temperature-stable and tend to run a few dollars less per month. Both have the same security and the same access hours.

### 9. Cancellation and month-to-month

**Category:** `lease_terms`
**Priority:** 92

**Q:** Am I locked into a long-term contract?

**A:** No. {{facility_name}} rents month-to-month. You can move out any time with a {{notice_required}}-day notice — no early termination fee, no penalty. Most of our tenants stay months or years on their own; we just don't lock you in.

### 10. Truck rental / moving help

**Category:** `move_in`
**Priority:** 91
**Skip if:** facility has no truck partnership

**Q:** Do you rent moving trucks?

**A:** {{truck_rental_status}} at {{facility_name}}. {{truck_rental_details}}. If you're moving in or moving out and need recommendations on local movers or truck rental, the office can point you to the closest options.

---

## Mid-priority Q&As (seeded when data permits — priority 70-89)

### 11. Insurance

**Category:** `insurance`
**Priority:** 89

**Q:** Do I need insurance for my stored items?

**A:** It's strongly recommended. Most renters' and homeowners' policies cover stored items at {{facility_name}}, so check with your insurance company first. If you don't have coverage, we offer optional storage insurance starting at {{insurance_starting_price}}/month — covers fire, theft, water damage, and most common risks. Your call.

### 12. What can I store

**Category:** `restrictions`
**Priority:** 87

**Q:** What can I store in my unit?

**A:** Most personal and business items at {{facility_name}}: household goods, furniture, business inventory, documents, seasonal items, vehicles (in our parking spaces), and most equipment. What you can't store: anything alive (people, pets, plants), perishable food, hazardous materials (gasoline, propane, fireworks, paint), illegal items, or anything stolen. If you're not sure, ask us.

### 13. Vehicle and RV storage

**Category:** `vehicle_storage`
**Priority:** 85
**Skip if:** facility has no vehicle/RV parking

**Q:** Do you have RV, boat, or vehicle storage?

**A:** {{vehicle_storage_availability}} at {{facility_name}}. {{vehicle_storage_details}}. Vehicle storage rents month-to-month like our regular units. Insurance recommendations are the same — check with your vehicle insurance, or ask us about coverage options.

### 14. Specials and discounts

**Category:** `pricing`
**Priority:** 83

**Q:** Do you have any move-in specials?

**A:** {{current_specials}} at {{facility_name}}. Specials change month to month, so it's worth checking with the office — call {{facility_phone}} or stop by during {{office_hours}}. We also occasionally have discounts for military, seniors, students, and first responders.

### 15. Locks

**Category:** `security`
**Priority:** 82

**Q:** Do I need to bring my own lock?

**A:** You can bring your own at {{facility_name}}, or buy one from us. We sell {{lock_options}} starting at {{lock_starting_price}}. We recommend a disc lock or cylinder lock — they're more resistant to cutting than standard padlocks. The lock has to be yours; we don't keep a copy of the key.

---

## Lower-priority Q&As (seeded for facilities with full data — priority 50-69)

### 16. Office hours vs. gate hours

**Category:** `access_hours`
**Priority:** 68

**Q:** Are office hours and gate access hours the same?

**A:** No. At {{facility_name}}, office hours are {{office_hours}} — that's when our manager is there to help with new rentals, payment questions, or any issue with your unit. Gate access hours are {{access_hours}}, which is when you can come and go from your unit. You don't need the office open to access your unit; you just need your gate code.

### 17. Reservation hold

**Category:** `move_in`
**Priority:** 65

**Q:** Can I reserve a unit before I move in?

**A:** Yes. At {{facility_name}}, we'll hold a unit for you for up to {{reservation_hold_days}} days without payment. Just call {{facility_phone}} or rent online and pick a future move-in date. After {{reservation_hold_days}} days, the unit goes back into inventory unless you've paid your first month.

### 18. Late fees and grace period

**Category:** `payment`
**Priority:** 62

**Q:** What happens if I'm late on payment?

**A:** {{facility_name}} has a {{grace_period_days}}-day grace period. After that, late fees apply. We always send a reminder before charging late fees — if you ever have a payment issue, call us at {{facility_phone}} before the bill is overdue and we'll work with you.

### 19. Auctions / abandoned units

**Category:** `auctions`
**Priority:** 58
**Skip if:** facility prefers not to publish auction policy

**Q:** Do you have storage unit auctions?

**A:** Storage liens are a last resort at {{facility_name}}, and we go far out of our way to avoid them. State law requires us to follow specific notice and timing rules if a unit becomes severely past due. If you have a question about a unit in lien status, call {{facility_phone}}.

### 20. Pets at the facility

**Category:** `pets_allowed`
**Priority:** 55

**Q:** Can I bring my dog when I'm at my unit?

**A:** Leashed pets are welcome at {{facility_name}}. Please clean up after them and keep them out of other tenants' units. We can't store pets in a unit — anything alive isn't allowed — but we love seeing dogs at the gate.

---

## Substitution variable reference

| Variable | Source | Type | Notes |
|---|---|---|---|
| `{{facility_name}}` | `facilities.name` | string | Always present |
| `{{facility_phone}}` | `facilities.google_phone` or `facilities.contact_phone` | string | Always present |
| `{{facility_website}}` | `facilities.website` | string | Empty if not set; skip the website reference |
| `{{unit_size_list}}` | `facility_pms_units` aggregated | string | "5x10, 10x10, 10x15, 10x20, and 10x30" |
| `{{climate_unit_sizes}}` | `facility_pms_units` filtered for climate | string | Skip Q&A if empty |
| `{{access_hours}}` | `facilities.hours.gate` | string | "5am to 11pm, 7 days a week" or "24 hours" |
| `{{office_hours}}` | `facilities.hours.office` | string | "Monday-Friday 9am-6pm, Saturday 9am-1pm" |
| `{{security_features}}` | `facility_context` type=security | string | "24-hour video surveillance, individual gate codes, perimeter fencing, and motion-activated lighting" |
| `{{drive_up_availability}}` | `facility_pms_units` filtered for drive-up | string | "Yes, we have drive-up units" or "We don't have drive-up units, but all our inside units are easy to access from our wide loading area" |
| `{{notice_required}}` | `facilities` metadata or default 30 | integer | Typically 30 |
| `{{truck_rental_status}}` | `facility_context` type=truck_rental | string | "Yes, we're a U-Haul dealer" or "We don't rent trucks directly" |
| `{{truck_rental_details}}` | `facility_context` type=truck_rental | string | Optional follow-up |
| `{{insurance_starting_price}}` | `facility_context` type=insurance | string | "$8" |
| `{{vehicle_storage_availability}}` | `facility_pms_units` filtered for vehicle | string | Skip Q&A if empty |
| `{{vehicle_storage_details}}` | `facility_context` type=vehicle_storage | string | Sizes, covered/uncovered, etc. |
| `{{current_specials}}` | `facility_pms_specials` active | string | "Right now we're running first month free on 10x10 and larger" |
| `{{lock_options}}` | `facility_context` type=locks | string | "disc locks and cylinder locks" |
| `{{lock_starting_price}}` | `facility_context` type=locks | string | "$15" |
| `{{reservation_hold_days}}` | `facilities` metadata or default 14 | integer | Typically 14 |
| `{{grace_period_days}}` | `facilities` metadata or default 5 | integer | Typically 5-7 |

---

## Skip rules at seed time

- Skip any Q&A where a required substitution variable is empty and the substitution cannot be elided gracefully.
- Skip Q&A #2 (climate) if facility has no climate units.
- Skip Q&A #8 (drive-up) — never skip; substitute the negative variant cleanly.
- Skip Q&A #10 (truck rental) if facility has no truck partnership.
- Skip Q&A #13 (vehicle/RV) if facility has no vehicle parking.
- Skip Q&A #19 (auctions) if facility's `gbp_qa_settings.publish_auction_policy = false`.
- Skip Q&A #20 (pets) if facility's `gbp_qa_settings.publish_pet_policy = false`.

The seed process targets 15-20 Q&As per facility. Most facilities will land in the 15-18 range after skip rules.

---

## What happens after seeding

- The seeded Q&As post immediately after onboarding completes.
- All seeded Q&As are tracked in `gbp_questions` with the `answer_status = "owner_seeded"` value.
- Inbound user-posted questions (when real tenants or prospects post on the GBP) are handled separately by the existing `/api/cron/process-gbp` route — AI drafts an answer using the universal voice profile, surfaces it for operator review per the AI-safety queue rules in PRD §5.1.
- Seeded answers can be refreshed quarterly by re-running the seed against updated facility data (new unit sizes available, new specials, hours changes, etc.). The refresh is driven by `/api/cron/generate-content` rather than a separate cron.

---

## Tone consistency check

Every answer above should pass these tests:

- Reads like the operator wrote it (not the platform).
- Uses contractions (we're, you're, don't).
- Concrete over abstract.
- No marketing language ("state-of-the-art," "premier," "best-in-class").
- Explicit phone number or office hours so the searcher knows how to take action.
- Honest about what's not available rather than dancing around it.

These same tests should be applied to any future addition to the library.
