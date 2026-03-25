// Copywriting templates for systematic ad generation
// Used by the campaign creation wizard and AI copy generation system

export const META_AD_TEMPLATES = {
  climate: {
    headlines: [
      'Climate-controlled from $[PRICE]/mo',
      'Your stuff deserves better than a hot garage',
      '[RATING]★ rated. Climate-controlled. From $[PRICE].',
    ],
    body: [
      "[FACILITY] on [STREET]. Climate-controlled units starting at $[PRICE]/mo. Reserve online in 60 seconds — no long-term lease required.",
      "[COUNT] families trust [FACILITY] with their belongings. Climate-controlled, 24/7 access, from $[PRICE]/mo.",
    ],
    cta: ['Reserve Your Unit', 'See Available Units'],
  },
  standard: {
    headlines: [
      'Storage from $[PRICE]/mo — [CITY]',
      'Finally, room to breathe',
      '[CITY] storage. [RATING]★ from [REVIEW_COUNT] reviews.',
    ],
    body: [
      "[FACILITY] in [CITY]. Drive-up access, month-to-month, from $[PRICE]/mo. Reserve your unit online — takes 60 seconds.",
      "Your garage called. It needs a break. [FACILITY] — from $[PRICE]/mo, no deposit, no long-term lease.",
    ],
    cta: ['Reserve Your Unit', 'Check Availability'],
  },
  vehicle: {
    headlines: [
      'RV & vehicle storage from $[PRICE]/mo',
      'Secure outdoor parking — [CITY]',
      'Your [VEHICLE] deserves a safe spot',
    ],
    body: [
      "Covered and uncovered vehicle storage at [FACILITY]. Wide driveways, easy access, from $[PRICE]/mo. No long-term commitment.",
      "Stop paying for a parking spot that isn't secure. [FACILITY] — gated, camera-monitored, from $[PRICE]/mo.",
    ],
    cta: ['Reserve Your Spot', 'See Parking Options'],
  },
  business: {
    headlines: [
      'Business storage from $[PRICE]/mo',
      'Secure. Accessible. Month-to-month.',
      'Your inventory deserves a real space',
    ],
    body: [
      "Business storage at [FACILITY]. Drive-up access, extended hours, from $[PRICE]/mo. Perfect for inventory, equipment, and records.",
      "[FACILITY] — professional storage for your business. 7-day access, security cameras, month-to-month. From $[PRICE]/mo.",
    ],
    cta: ['Reserve Your Unit', 'Contact Us'],
  },
} as const;

export const GOOGLE_AD_TEMPLATES = {
  near_me: {
    headlines: ['Storage Units Near You', '[CITY] Storage From $[PRICE]/Mo', '[RATING]★ Rated · Reserve Online'],
    descriptions: ['Drive-up access, month-to-month, no deposit. Reserve your unit online in 60 seconds at [FACILITY].', 'Trusted by [REVIEW_COUNT]+ families. Climate-controlled & standard units from $[PRICE]/mo.'],
  },
  cheap: {
    headlines: ['Affordable Storage [CITY]', 'Units From $[PRICE]/Month', 'No Deposit · No Long Lease'],
    descriptions: ['[FACILITY] in [CITY] — storage from $[PRICE]/mo. First month free on select units. Reserve online today.', 'Why pay more? [FACILITY] offers clean, secure storage from $[PRICE]/mo with no hidden fees.'],
  },
  climate: {
    headlines: ['Climate-Controlled Storage', 'Protect Your Belongings', '[CITY] Climate Storage $[PRICE]/Mo'],
    descriptions: ['Temperature and humidity controlled units at [FACILITY]. From $[PRICE]/mo. Keep your valuables safe year-round.', 'Climate-controlled storage in [CITY]. [RATING]★ rated, 24/7 access, from $[PRICE]/mo. Reserve online.'],
  },
} as const;

export const LANDING_PAGE_FORMULAS = {
  headline: [
    '[Benefit] storage in [City]. From $[Price]/mo.',
    '[Rating]★ rated. [Unit Type] from $[Price].',
    'Your [audience need]. [Facility] on [Street].',
    '[Number] families trust us. From $[Price]/mo.',
    '[Offer]. [Unit Type] in [City].',
  ],
  subheadline: [
    'Reserve online in 60 seconds. No long-term lease.',
    'Drive-up access. Month-to-month. Move in today.',
    '[Rating]★ from [Count] reviews. See why [City] trusts [Facility].',
  ],
} as const;

export const EMAIL_SUBJECTS = {
  report: '[Facility] — [Month]: [X] move-ins at $[Y] each',
  budget_alert: 'Budget alert: [Campaign] at [X]% of monthly limit',
  welcome: 'Welcome to StorageAds, [Name]',
  move_in: 'New move-in: [Tenant] via [Campaign]',
  weekly: 'Your week at [Facility]: [X] move-ins, $[Y] cost/MI',
} as const;

export const NAMING_CONVENTIONS = {
  campaign: '[Facility] — [Platform] — [Unit Type] — [Geo]',
  landing_page: '[Facility] — [Unit Type] — [Offer] — [Variant]',
  utm_campaign: '[facility-slug]-[unit]-[geo]-[variant]',
} as const;
