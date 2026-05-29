import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  BarChart3,
  Search,
  Sparkles,
  Megaphone,
  FileText,
  Target,
  Eye,
  Activity,
  Smartphone,
  Layers,
} from "lucide-react";

export const STATS = [
  { value: 34, prefix: "", suffix: "", label: "Move-ins, 90 days", decimals: 0, icon: TrendingUp },
  { value: 84, prefix: "", suffix: "%", label: "Occupancy, one quarter", decimals: 0, icon: DollarSign },
  { value: 8.7, prefix: "", suffix: "%", label: "Page conversion rate", decimals: 1, icon: MousePointerClick },
  { value: 35, prefix: "", suffix: "x", label: "Return on ad spend", decimals: 0, icon: BarChart3 },
];

// Ordered to mirror the funnel: see the field, run ads, convert,
// capture organic, optimize, increase per-tenant revenue. Market
// intelligence leads because that's where Blake says every audit
// actually starts.
export const CAPABILITIES = [
  { icon: Search, label: "Market Intelligence", desc: "Competitor pricing, reviews, positioning, and trade area analysis. See the field before you spend a dollar.", color: "#8a70b0" },
  { icon: Sparkles, label: "Ad Creator", desc: "Generate Meta and Google ads from facility data. Copy, headlines, creative.", color: "var(--color-blue)" },
  { icon: Megaphone, label: "Publishing Manager", desc: "Publish to Meta and Google from one dashboard. Both channels, side by side.", color: "var(--color-dark)" },
  { icon: FileText, label: "Landing Pages", desc: "Dedicated page per campaign. storEDGE rental flow embedded so the renter books on your branded page.", color: "var(--color-green)" },
  { icon: Target, label: "Organic Capture", desc: "Google Business Profile, review management, walk-in capture. The leads you already get, organized.", color: "var(--color-dark)" },
  { icon: BarChart3, label: "Reservation Conversion", desc: "Automated follow-up. Reservation-to-move-in recovery. Stop leaking revenue at the bottom of the funnel.", color: "var(--color-blue)" },
  { icon: Eye, label: "A/B Testing", desc: "Headlines, offers, and pages scored by move-ins, not clicks.", color: "var(--color-green)" },
  { icon: Activity, label: "Revenue Intelligence", desc: "Rate optimization, ancillary revenue, tax advantages, occupancy modeling. Increase the lifetime value of every tenant.", color: "#8a70b0" },
];

export const PIPELINE_STEPS = [
  { icon: Megaphone, label: "Ad", sublabel: "Meta / Google" },
  { icon: FileText, label: "Page", sublabel: "Custom LP" },
  { icon: Smartphone, label: "Reserve", sublabel: "storEDGE" },
  { icon: Target, label: "Move-in", sublabel: "Signed lease" },
];

// Mix of proof points (numbers from Blake's portfolio) and system framing
// (create / capture / recapture, REIT-grade tools, reach 100%). Keeps the
// hook from reading as a single dimension.
export const TYPEWRITER_WORDS = [
  "Create demand. Capture demand. Recapture demand.",
  "Close the 5-point gap to the REIT band.",
  "34 move-ins in 90 days.",
  "REIT-grade tools to reach 100% occupancy.",
  "71% to 84% in one quarter.",
  "Stop leaking $72,000 a year to the REIT down the road.",
];

export const FEATURE_HIGHLIGHTS = [
  { icon: Search, title: "Facility audit and market map", stat: "Intelligence", desc: "Competitor pricing, review gaps, trade area positioning. See the field before you deploy capital." },
  { icon: Sparkles, title: "Ad creation and publishing", stat: "Execution", desc: "Meta and Google ads built from facility data and published from one dashboard. Creative studio included." },
  { icon: FileText, title: "Landing pages with embedded rental", stat: "Conversion", desc: "Dedicated page per campaign. storEDGE reservation flow built in. Renter never leaves your brand." },
  { icon: Layers, title: "Self-serve or fully managed", stat: "Deployment", desc: "Operate the system directly or deploy our team. Same infrastructure either way." },
];

export const BEFORE_AFTER = [
  { before: "No paid acquisition system", after: "Meta and Google ads deployed in your trade area" },
  { before: "No competitive intelligence", after: "Market map with pricing, reviews, and positioning" },
  { before: "No dedicated landing pages", after: "Branded page per campaign with embedded storEDGE" },
  { before: "No reservation follow-through", after: "Automated conversion from reservation to move-in" },
];

export const DASHBOARD_ROWS = [
  { campaign: "Two Paws · 10x10 Climate", channel: "Meta", spend: 847, clicks: 312, reservations: 14, moveIns: 9, cpm: 94, trend: "down" as const },
  { campaign: "Midway · Drive-up", channel: "Google", spend: 612, clicks: 198, reservations: 11, moveIns: 7, cpm: 87, trend: "down" as const },
  { campaign: "Two Paws · Boat / RV", channel: "Meta", spend: 423, clicks: 156, reservations: 6, moveIns: 4, cpm: 106, trend: "flat" as const },
  { campaign: "Midway · Climate retarget", channel: "Meta", spend: 298, clicks: 89, reservations: 5, moveIns: 4, cpm: 74, trend: "down" as const },
];

// 6-month campaign progression — mirrors /demo data so the hero dashboard
// can scrub through the same story the full demo tells. Compounds month over
// month: spend climbs slowly, CPM drops as the system learns.
export const HERO_DEMO_MONTHS = [
  { label: "Oct 2025", short: "Oct", spend: 1800, leads: 42, moveIns: 8,  cpm: 225, occupancy: 68, rowScale: 0.62, trend: "flat" as const, topAudience: "Lookalike 1%", topCreative: "Your Stuff Deserves Better" },
  { label: "Nov 2025", short: "Nov", spend: 2100, leads: 58, moveIns: 12, cpm: 175, occupancy: 73, rowScale: 0.74, trend: "down" as const, topAudience: "Recently Moved", topCreative: "Unit Size Guide" },
  { label: "Dec 2025", short: "Dec", spend: 2100, leads: 51, moveIns: 10, cpm: 210, occupancy: 76, rowScale: 0.81, trend: "flat" as const, topAudience: "14-Day Retarget", topCreative: "Holiday Declutter" },
  { label: "Jan 2026", short: "Jan", spend: 2400, leads: 67, moveIns: 15, cpm: 160, occupancy: 80, rowScale: 0.90, trend: "down" as const, topAudience: "Phone Call LAL", topCreative: "$1 First Month" },
  { label: "Feb 2026", short: "Feb", spend: 2400, leads: 74, moveIns: 18, cpm: 133, occupancy: 85, rowScale: 0.96, trend: "down" as const, topAudience: "Life Event", topCreative: "Move-In in 10 Minutes" },
  { label: "Mar 2026", short: "Mar", spend: 2800, leads: 89, moveIns: 22, cpm: 127, occupancy: 89, rowScale: 1.00, trend: "down" as const, topAudience: "Broad + Advantage+", topCreative: "Customer Testimonial Reel" },
];
export const HERO_DEMO_STARTING_OCCUPANCY = 64;

// Mini lead feed for the "Lead activity" preview tile. We surface a sliding
// window of two leads based on the active month, so as playback advances
// the most-recent leads cycle. Names + units + sources are static; the
// recency tag and ordering shift.
export const HERO_DEMO_LEADS = [
  { name: "Sarah M.",   unit: "10x10 Standard", status: "moved_in" as const },
  { name: "David K.",   unit: "10x15 Drive-up", status: "tour"     as const },
  { name: "Jennifer L.",unit: "5x10 Climate",   status: "moved_in" as const },
  { name: "Mike R.",    unit: "10x20 Drive-up", status: "new"      as const },
  { name: "Amanda T.",  unit: "10x10 Standard", status: "moved_in" as const },
  { name: "Chris B.",   unit: "10x30 Vehicle",  status: "new"      as const },
];
export const HERO_DEMO_LEAD_STATUS: Record<string, { label: string; color: string }> = {
  new:      { label: "New",      color: "var(--color-blue)" },
  tour:     { label: "Tour",     color: "#8a70b0" },
  moved_in: { label: "Move-in",  color: "var(--color-green)" },
};

export const CHANNEL_DOT: Record<string, string> = {
  Meta: "var(--color-dark)",
  Google: "var(--color-blue)",
  Retargeting: "var(--color-green)",
};

// Sparkline path for the avg cost-per-move-in trend (12 points). In SVG
// y=0 is top, so a descending line starts at a small y and ends at a
// large y — i.e. cost was higher 30 days ago and is lower now.
export const SPARKLINE_PATH = "M0 4 C8 5, 16 6, 24 8 S40 11, 48 13 S64 15, 72 16 S88 17, 96 18";

// Playback cadence constants — pulled out so the demo's rhythm is easy
// to tune in one place rather than hunting through JSX.
export const HERO_DEMO_TICK_MS = 1400;
export const HERO_DEMO_AUTOSTART_DELAY_MS = 1100;
export const HERO_DEMO_LAST_INDEX = HERO_DEMO_MONTHS.length - 1;

export const BECAUSE_MESSAGES = [
  "A SIGN ON A CHAINLINK FENCE IS NOT AN ACQUISITION STRATEGY",
  "WE'RE ON PAGE 2 OF GOOGLE IS NOT A MARKETING PLAN",
  "YOUR COMPETITOR FILLED 40 UNITS LAST MONTH AND YOU HAVE NO IDEA HOW",
  "YOU ASKED YOUR AGENCY WHICH ADS DROVE MOVE-INS AND THEY CHANGED THE SUBJECT",
  "YOU'RE PAYING $200 PER MOVE-IN AND CALLING IT BRAND AWARENESS",
  "YOUR AGENCY SENDS YOU A REPORT EVERY MONTH AND YOU DON'T UNDERSTAND A SINGLE LINE ON IT",
  "DRONE FOOTAGE OF YOUR ROOF HAS 200 VIEWS AND ZERO RESERVATIONS",
  "YOU JUST PAID GOOGLE $6 SO SOMEONE COULD CLICK YOUR AD TO PAY THEIR BILL",
  "EXTRA SPACE IS RUNNING 14 CAMPAIGNS IN YOUR ZIP CODE AND YOU'RE RUNNING VIBES",
  "YOUR BEST AD GOT 3 LIKES AND TWO WERE EMPLOYEES",
  "YOU'VE BEEN ABOUT TO LAUNCH A CAMPAIGN SINCE Q2 OF LAST YEAR",
  "YOUR GOOGLE BUSINESS LISTING IS DOING MORE WORK THAN YOUR ENTIRE MARKETING BUDGET",
  "THE MARKETING MEETING WAS YOU AND YOUR MANAGER STARING AT GOOGLE REVIEWS",
];
