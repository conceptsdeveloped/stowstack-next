// Storage-vertical Q&A seed library (Operator OS Phase 1, PRD §3.7).
//
// Seeded into a new facility's Google Business Profile at connect time to
// populate the profile with high-intent questions and answers — first-party
// content Google rewards in the local pack. Answers are intentionally
// generic-but-helpful: they never quote prices, availability, or policies the
// platform wasn't given, and they always route specifics to a call or visit.
//
// Slots: {{facility_name}}, {{location}}.

export interface GbpQuestionTemplate {
  category: string;
  question_text: string;
  answer_template: string;
  priority: number; // higher = seeded first
}

export const GBP_QUESTION_TEMPLATES: GbpQuestionTemplate[] = [
  {
    category: "sizes",
    question_text: "What unit sizes do you offer?",
    answer_template:
      "{{facility_name}} offers a range of unit sizes, typically from small 5x5 lockers up to large 10x30 spaces that hold the contents of a whole house. The right size depends on what you're storing — give us a call and we'll help you pick one that fits without paying for space you won't use.",
    priority: 100,
  },
  {
    category: "sizes",
    question_text: "What size storage unit do I need?",
    answer_template:
      "A good rule of thumb: a 5x10 holds a small apartment's worth, a 10x10 a few rooms, and a 10x20 a full house or a car. Not sure? Tell the team at {{facility_name}} what you're storing and we'll recommend the right fit.",
    priority: 95,
  },
  {
    category: "climate",
    question_text: "Do you have climate-controlled units?",
    answer_template:
      "Many customers choose climate-controlled units to protect furniture, electronics, documents, and anything sensitive to heat and humidity. Availability and pricing change, so reach out to {{facility_name}} and we'll let you know what's open right now.",
    priority: 90,
  },
  {
    category: "access_hours",
    question_text: "What are your access hours?",
    answer_template:
      "{{facility_name}} is set up so you can get to your belongings when you need them. Gate hours can vary, so call or stop by and we'll confirm the current access hours for you.",
    priority: 88,
  },
  {
    category: "getting_started",
    question_text: "How do I rent a unit?",
    answer_template:
      "Renting at {{facility_name}} is quick. Call us or stop by the office, pick the size that fits, and we'll handle the paperwork the same day. Most customers are moved in within a day of deciding.",
    priority: 86,
  },
  {
    category: "security",
    question_text: "How secure is the facility?",
    answer_template:
      "Security is a priority at {{facility_name}} — the site is designed to keep your belongings protected and give you peace of mind. We're happy to walk you through the specific features in place; just give us a call or schedule a visit.",
    priority: 84,
  },
  {
    category: "payment",
    question_text: "How do I pay, and can I set up autopay?",
    answer_template:
      "We keep paying simple at {{facility_name}}, including autopay so you never miss a due date. Contact the office and we'll get you set up in a few minutes.",
    priority: 80,
  },
  {
    category: "vehicle",
    question_text: "Can I store a car, RV, or boat?",
    answer_template:
      "{{facility_name}} can often accommodate vehicle, RV, and boat storage depending on current availability. Options change, so give us a call and we'll tell you what we have open for your vehicle.",
    priority: 78,
  },
  {
    category: "access",
    question_text: "Do you have drive-up units?",
    answer_template:
      "Drive-up units make loading and unloading much easier, and {{facility_name}} often has them available. Availability varies, so reach out and we'll let you know what's open right now.",
    priority: 76,
  },
  {
    category: "contracts",
    question_text: "Am I locked into a long-term contract?",
    answer_template:
      "Most customers rent month-to-month at {{facility_name}}, so you're not tied to a long commitment. Stay as long as you need and let us know when you're ready to move out. Call us for the current terms.",
    priority: 74,
  },
  {
    category: "discounts",
    question_text: "Do you offer any move-in specials?",
    answer_template:
      "We often run move-in specials at {{facility_name}} to help new customers save. Promotions change, so call or check with the office for the current offers before you rent.",
    priority: 72,
  },
  {
    category: "moving_supplies",
    question_text: "Do you sell boxes or moving supplies?",
    answer_template:
      "Many customers pick up boxes, tape, and packing supplies when they rent. Availability varies, so check with the {{facility_name}} office and we'll point you to what you need for your move.",
    priority: 66,
  },
  {
    category: "access",
    question_text: "Do you have carts or dollies to help me move in?",
    answer_template:
      "Move-in day is a lot easier with the right equipment, and {{facility_name}} is set up to help. Ask the office about carts and dollies available on site when you come by.",
    priority: 64,
  },
  {
    category: "insurance",
    question_text: "Do I need insurance for my unit?",
    answer_template:
      "Protecting your stored belongings is a good idea, and there are simple options available. The team at {{facility_name}} can explain the choices when you rent so you can decide what's right for you.",
    priority: 62,
  },
  {
    category: "prohibited",
    question_text: "What am I not allowed to store?",
    answer_template:
      "For everyone's safety, items like hazardous materials, perishables, and anything flammable or illegal can't be stored. If you're unsure about a specific item, just ask the {{facility_name}} team and we'll give you a clear answer.",
    priority: 58,
  },
  {
    category: "business",
    question_text: "Can I use a unit for my business?",
    answer_template:
      "Plenty of local businesses store inventory, equipment, and records with us. {{facility_name}} can help you find a unit that works for your business needs — give us a call to talk through the options.",
    priority: 56,
  },
  {
    category: "move_out",
    question_text: "What happens when I'm ready to move out?",
    answer_template:
      "Moving out of {{facility_name}} is straightforward — let us know, clear out your unit, and you're done. Reach out to the office and we'll walk you through the simple steps.",
    priority: 52,
  },
  {
    category: "location",
    question_text: "Where are you located?",
    answer_template:
      "{{facility_name}} serves the {{location}} area and is easy to reach. Call or visit and we'll give you directions and help you find the right unit close to home.",
    priority: 50,
  },
];
