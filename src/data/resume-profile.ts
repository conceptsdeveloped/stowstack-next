/* ============================================================
   SINGLE SOURCE OF TRUTH. Edit copy here, never in components.
   Voice: blunt, matter-of-fact, showcase only. No em dashes.
   ============================================================ */

export type InfoRow = { label: string; value: string };
export type TimelineItem = { org: string; title?: string; date?: string; location?: string; blurb?: string; highlights?: string[] };
export type Skill = { label: string; level: number };
export type PortfolioItem = { title: string; category: string; img?: string; tags: string[]; href?: string };
export type LanguageItem = { language: string; proficiency: string; years?: number; detail?: string };
export type Social = { type: "website" | "email" | "linkedin" | "instagram" | "x" | "github"; label: string; href: string };

export type Profile = {
  name: string;
  role: string;
  initials: string;
  avatar?: string;
  tagline: string;
  bio: string;
  skillTags: string[];
  availability: string[];
  introParas: string[];
  info: InfoRow[];
  stats: { value: string; label: string }[];
  resume: {
    education: TimelineItem[];
    experience: TimelineItem[];
    recognition: TimelineItem[];
    resumePdf: string | null;
  };
  skills: Skill[];
  portfolio: PortfolioItem[];
  languages: { summary: string; items: LanguageItem[] };
  operating: { title: string; subtitle: string; text: string }[];
  personal: {
    blurb: string;
    interests: string[];
    facts: { label: string; value: string }[];
  };
  contact: {
    address: string;
    phone?: string;
    email: string;
    website: string;
    mapQuery: string;
    socials: Social[];
  };
};

export const profile: Profile = {
  name: "Blake Burkett",
  role: "Self-Storage Operator & Software Founder",
  initials: "BB",
  avatar: "/resume-img/avatar.jpg",
  tagline: "Operator, software founder, and technologist.",

  bio: "Southwest Michigan operator and software founder. Self-storage, commercial real estate, and applied AI.",

  skillTags: [
    "Self-Storage Ops",
    "Revenue & Occupancy",
    "Commercial Real Estate",
    "Site Selection",
    "Acquisitions",
    "Ground-Up Development",
    "Agentic AI & LLMs",
    "Full-Stack Dev",
    "Meta & Google Ads",
    "Conversion / CRO",
    "P&L Management",
    "Team Leadership",
    "CAD & 3D Modeling",
    "U-Haul Operations",
  ],


  availability: [
    "Will relocate",
    "Remote, hybrid, or on-site",
    "Will travel",
    "Available now",
    "Authorized to work in the US",
  ],

  introParas: [
    "I'm Blake Burkett, a self-storage operator and software founder from Southwest Michigan. I run multi-site storage and logistics operations and build the software that scales them.",
    "BBA from Western Michigan, Harvard certificate in Agentic AI. I've grown a $10M+ portfolio for ownership, carried full P&L on a multi-million-dollar operation, and taught myself full-stack and applied AI to build StorageAds end to end.",
  ],

  info: [
    { label: "Name", value: "Blake Burkett" },
    { label: "Based in", value: "Southwest Michigan" },
    { label: "Focus", value: "Self-storage operations, paid acquisition, applied AI" },
    { label: "Email", value: "blake@storepawpaw.com" },
    { label: "Website", value: "storageads.com" },
  ],

  stats: [
    { value: "$10M+", label: "Assets managed" },
    { value: "50,000+", label: "Sq ft of storage" },
    { value: "1,000+", label: "Tenant accounts" },
    { value: "7+", label: "Years experience" },
  ],

  resume: {
    experience: [
      {
        org: "StorageAds",
        title: "Founder",
        date: "2022 - Present",
        blurb:
          "B2B software that fills units for storage operators. AI-built Meta and Google creative, storEDGE reservation flow, full ad-to-move-in attribution. Built end to end, self-taught.",
      },
      {
        org: "Self-Storage, Transportation & Logistics",
        title: "Operations Manager",
        date: "2019 - Present",
        location: "Southwest Michigan",
        blurb:
          "Grew a $10M+ portfolio for ownership: 50,000+ sq ft, 1,000+ tenants across storage, U-Haul, moving, and logistics. Owned P&L, acquisitions, revenue, and staffing; converted a bowling alley into storage for $1M+ in value.",
      },
      {
        org: "DataAnnotation",
        title: "Corporate Development Associate, AI Trainer",
        date: "2025 - Present",
        location: "Remote · 1099",
        blurb:
          "Freelance contract alongside StorageAds. Evaluate and improve frontier AI on corporate finance, macro, and capital markets, stress-testing reasoning and writing structured feedback.",
      },
      {
        org: "DPB Real Estate",
        title: "CRE Photographer & 3D Modeler",
        date: "2018 - 2019",
        location: "Southwest Michigan",
        blurb:
          "Commercial listing media: DSLR and drone photography, Matterport 3D tours, CAD-built models. Client-facing work with owners and investors.",
      },
      {
        org: "Hungry Howie's",
        title: "Key Holder",
        date: "2017 - 2018",
        location: "Texas Corners, MI",
        blurb: "Opened and closed a high-volume location, 40 hours a week, while in college full-time.",
      },
      {
        org: "CertaPro / Cady Painting",
        title: "Foreman, Commercial Prep Crew",
        date: "Summers 2016 - 2017",
        location: "Southwest Michigan",
        blurb:
          "Ran crews and OSHA-compliant lead-abatement prep on commercial projects. Field leadership by 18.",
      },
      {
        org: "DMS Motor Services",
        title: "CAD Intern",
        date: "2015 - 2017",
        location: "Kalamazoo, MI",
        blurb:
          "CAD and technical analysis for industrial manufacturing: AutoCAD, Inventor, Revit, FEA, CFD, and HMI/PLC systems. Manual drafting to ISO 128. Started at 16.",
      },
    ],
    education: [
      {
        org: "Western Michigan University",
        title: "BBA, Integrated Business Administration · Marketing Focus",
        date: "Class of 2022",
        location: "Kalamazoo, MI",
        blurb: "Haworth College of Business, AACSB-accredited.",
        highlights: [
          "Capstone: StorageAds, founded and still running",
          "Full business core: finance, marketing, operations, strategy",
          "Applied to work: unit economics, demand generation, conversion",
        ],
      },
      {
        org: "Mattawan Consolidated High School",
        title: "High School Diploma",
        date: "Class of 2017",
        location: "Mattawan, MI",
        highlights: [
          "4.0 GPA, cum laude",
          "Dean's List",
          "AP Scholar",
          "Junior Achievement: ran the school's vending business, my first P&L",
        ],
      },
    ],
    recognition: [
      {
        org: "Harvard Agentic AI Intensive Program",
        title: "Certificate",
        blurb: "Agentic AI, LLMs, and applied automation.",
      },
      { org: "TEFL", title: "Certified", blurb: "Certified to Teach English as a Foreign Language." },
      { org: "Self Storage Association", title: "Member (SSA)", blurb: "" },
      { org: "U-Haul Co. of Michigan", title: "Authorized Dealer, Affiliate (MCO 751)", blurb: "" },
      { org: "AutoCAD", title: "University Accreditation", blurb: "" },
      { org: "Lead Abatement", title: "Certified", blurb: "" },
      { org: "Scuba Diving", title: "NAUI Open Water Diver", blurb: "" },
    ],
    resumePdf: null,
  },

  skills: [
    { label: "Self-Storage Operations", level: 95 },
    { label: "Paid Acquisition (Meta / Google)", level: 88 },
    { label: "Applied AI & Automation", level: 86 },
    { label: "Full-Stack Development", level: 85 },
    { label: "Commercial Real Estate", level: 82 },
    { label: "CAD & 3D Modeling", level: 78 },
  ],

  portfolio: [
    { title: "StorageAds", category: "Software", tags: ["Meta Ads", "storEDGE", "Attribution"], img: "/resume-img/storageads.jpg", href: "https://storageads.com" },
    { title: "Two Paws Self Storage", category: "Facility", tags: ["Self-Storage", "U-Haul"], img: "/resume-img/two-paws.jpg" },
    { title: "Midway Self Storage", category: "Facility", tags: ["Drive-In", "Climate"], img: "/resume-img/midway.jpg" },
    { title: "Midway Moving & Storage", category: "Logistics", tags: ["Fleet", "Moving"], img: "/resume-img/moving.jpg" },
    { title: "Paw Paw Facility", category: "Operations", tags: ["On-site Office", "U-Haul Dealer"], img: "/resume-img/facility-office.webp" },
    { title: "Community & Workforce", category: "Operations", tags: ["Hiring", "Outreach"], img: "/resume-img/team-visit.jpg" },
  ],

  languages: {
    summary: "Trilingual.",
    items: [
      { language: "English", proficiency: "Native" },
      { language: "Brazilian Portuguese", proficiency: "Professional", years: 6 },
      { language: "Spanish", proficiency: "Conversational", years: 4 },
    ],
  },

  operating: [
    {
      title: "Beyond the Business",
      subtitle: "Travel and languages",
      text: "Self-taught polyglot and traveler. Builds fluency, businesses, and software from scratch.",
    },
    {
      title: "Execution Profile",
      subtitle: "Built to ship",
      text: "Decisive, independent, execution-driven.",
    },
  ],

  personal: {
    blurb:
      "Dependable, work-focused, with a life kept deliberately simple.",
    interests: [
      "Software development",
      "Scuba diving",
      "International travel and languages",
    ],
    facts: [
      { label: "Film", value: "The Breakfast Club" },
      { label: "Album", value: "Voodoo by D'Angelo" },
      { label: "Destination", value: "Rio de Janeiro" },
    ],
  },

  contact: {
    address: "Southwest Michigan",
    email: "blake@storepawpaw.com",
    website: "storageads.com",
    mapQuery: "Paw Paw, MI",
    socials: [
      { type: "website", label: "storageads.com", href: "https://storageads.com" },
      { type: "email", label: "Email", href: "mailto:blake@storepawpaw.com" },
    ],
  },
};
