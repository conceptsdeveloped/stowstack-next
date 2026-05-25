# Ad Builder — Feature Spec

## What
Freemium "Make Your Own Ad" wizard for storage facility owners. Same model as the existing audit tool at `/audit-tool` — public, no auth to start, email capture to get the output. This is a top-of-funnel acquisition tool, not a full ad management platform.

## How It Fits
This follows the exact same pattern as `src/app/audit-tool/`. That page has a two-field form, calls `/api/facility-lookup` to pull Google Places data, renders results client-side, and captures email via `/api/consumer-lead`. The ad builder does the same thing but outputs a downloadable ad image instead of an audit score.

## Routes

### Pages
- `/ad-builder` — the wizard (public page, same structure as `/audit-tool`)
- `/ad-builder/templates` — SEO gallery showing all template previews

### API
- `/api/ad-builder/generate` — POST, accepts ad data + template ID, returns PNG image URL
- `/api/ad-builder/save` — POST, saves completed ad to DB, requires email

## File Structure
Follow existing conventions:
```
src/app/ad-builder/
  page.tsx              — server component with metadata (like audit-tool/page.tsx)
  ad-builder-client.tsx — "use client" component with full wizard (like audit-tool/audit-client.tsx)

src/app/ad-builder/templates/
  page.tsx              — SEO gallery page

src/app/api/ad-builder/
  generate/route.ts     — image generation endpoint
  save/route.ts         — save ad record + email capture

src/components/ad-builder/
  templates/            — one file per template component
    fill-units-bold.tsx
    fill-units-clean.tsx
    fill-units-urgent.tsx
    fill-units-value.tsx
    special-discount.tsx
    special-promo.tsx
    special-limited.tsx
    special-bundle.tsx
    seasonal-spring.tsx
    seasonal-summer.tsx
    seasonal-holiday.tsx
    seasonal-school.tsx
  template-preview.tsx  — thumbnail preview card for gallery
  wizard-steps.tsx      — step indicator component
```

## Wizard Flow

Single client component (`ad-builder-client.tsx`), same pattern as `audit-client.tsx` — manage wizard state with `useState`, no router navigation between steps.

### Step 1: Pick Your Goal
Three cards the user clicks:
- "Fill Empty Units" — show fill-units templates
- "Promote a Special" — show special templates  
- "Seasonal Campaign" — show seasonal templates

### Step 2: Pick a Template
Show 4 template previews for the selected goal. Each is a static preview image rendered from the template component with placeholder data. User clicks one.

### Step 3: Enter Your Info
Form fields:
- Facility name (required)
- City or zip (required) — on blur, call existing `/api/facility-lookup` to auto-populate address, phone, and pull a facility photo
- Address (auto-filled, editable)
- Phone (auto-filled, editable)
- Headline (pre-filled from template, editable — e.g. "Units Starting at $__/mo")
- Offer text (e.g. "First Month Free", "50% Off First Month")
- Price (e.g. "$89/mo")
- Logo upload (optional) — use existing Vercel Blob upload pattern from `/api/upload-token`

Use the same `PlacesResult` interface from `audit-client.tsx`. Reuse the existing `/api/facility-lookup` endpoint — don't build a new one.

### Step 4: Preview
Full-size preview of the ad rendered client-side using the template component with their real data. Show it at 1080x1080 in a centered frame.

Two buttons:
- "Download Free" — goes to Step 5 (email capture)
- "Edit" — back to Step 3

### Step 5: Email + Download
- Email input field
- "Get Your Ad" button
- POST to `/api/ad-builder/save` with all ad data + email
- That endpoint calls `/api/ad-builder/generate` server-side to render the final PNG
- Returns the image URL
- Show download link/button
- Below the download: upsell card — "Remove the StorageAds badge + get 6 formats — $49/mo" linking to `/pricing`

## Template Components

Each template is a React component that accepts these props:

```typescript
interface AdTemplateProps {
  facilityName: string;
  address: string;
  phone: string;
  headline: string;
  offerText: string;
  price: string;
  logoUrl?: string;
  photoUrl?: string;
  showWatermark: boolean; // true for free tier
}
```

Templates render at 1080x1080. They're used in two contexts:
1. Client-side preview (React component in the browser)
2. Server-side PNG generation (rendered via `@vercel/og` ImageResponse which uses satori under the hood — this is already available through Next.js, no new dependency needed)

Design rules (from CLAUDE.md):
- Use brand colors: `--color-dark`, `--color-light`, `--color-gold`, `--color-gold-light`
- Poppins for headings (600 weight), Lora for body (400 weight)
- No gradients, no stock photos in the template chrome
- Clean, professional, trustworthy — these are for small business owners
- Watermark: small "storageads.com" in bottom-right corner, `--color-mid-gray` at 60% opacity

Template categories:
- **Fill Units (4):** Bold pricing emphasis, urgency language, "X units left" style. One bold/dark bg, one light/airy, one urgent/red-accent, one value-focused.
- **Special Offer (4):** Discount callout front and center. Percentage off, dollar amount, "first month free", bundle deal variants.
- **Seasonal (4):** Spring cleaning, moving season/summer, holiday storage, back-to-school. Each with seasonal color accent within brand palette.

## Image Generation API

`/api/ad-builder/generate` — POST

Uses Next.js `ImageResponse` (built on satori + resvg) to render template components to PNG server-side. This is the same tech as OG image generation — no new deps needed.

```typescript
import { ImageResponse } from "next/og";
```

Request body:
```json
{
  "templateId": "fill-units-bold",
  "data": { ...AdTemplateProps },
  "format": "square"
}
```

Response: renders the PNG, uploads to Vercel Blob (existing `@vercel/blob` pattern), returns `{ url: string }`.

Follow existing API patterns:
- Export `OPTIONS` with `corsResponse()`
- Rate limit: `PUBLIC_WRITE` tier (10/min)
- Use `jsonResponse()` / `errorResponse()` from `@/lib/api-helpers`

## Save API

`/api/ad-builder/save` — POST

Request body:
```json
{
  "email": "owner@facility.com",
  "facilityName": "Sunrise Storage",
  "templateId": "fill-units-bold",
  "adData": { ...all form fields },
  "imageUrl": "https://..."
}
```

Saves to new `ad_builder_ads` table. Also creates a `consumer-lead` record (same pattern as audit tool email capture) for the sales funnel.

## Database

Add to `prisma/schema.prisma`:

```prisma
model ad_builder_ads {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String
  facility_name String
  template_id   String
  ad_data       Json
  image_url     String?
  tier          String   @default("free")
  created_at    DateTime @default(now()) @db.Timestamptz(6)

  @@index([email], map: "idx_ad_builder_email")
  @@index([created_at(sort: Desc)], map: "idx_ad_builder_created")
}
```

Then run `npx prisma db push`.

## Free vs Pro

For V1, everything is free tier with watermark. No Stripe gating yet — just the upsell CTA pointing to `/pricing`. The watermark is baked into the image by the template's `showWatermark` prop.

This keeps scope tight. Pro tier (no watermark, multi-format, unlimited) comes later once there's actual usage data.

## Styling

Use the existing design system exactly:
- `var(--color-gold)` for CTAs and active states
- `var(--color-light)` for backgrounds
- `var(--color-dark)` for text
- `var(--color-light-gray)` for card borders and surfaces
- `var(--color-body-text)` for secondary text
- `btn-primary` class for buttons
- `input-field` class for form inputs
- `section` / `section-content` classes for page layout
- Lucide icons only (already in deps)
- Poppins headings, Lora body — use `var(--font-heading)` and `var(--font-body)`

## What NOT to Build
- No drag-and-drop editor
- No AI copy generation
- No direct publishing to social platforms
- No analytics dashboard
- No multi-location support
- No landing page builder
- No login/auth system (email capture only, like audit tool)
- No new dependencies beyond what's already in package.json (satori comes through next/og)
