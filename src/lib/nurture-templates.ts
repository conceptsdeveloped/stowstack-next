// Shared nurture sequence templates — single source of truth.
// Consumed by the nurture-sequences route (enrollment + listing) and the
// audit-approve route (post-audit enrollment). Lives in lib (not a route
// module) so consumers don't import from a Next route entry point.

export type NurtureSequenceTemplate = {
  name: string;
  trigger_type: string;
  steps: Array<{
    step_number: number;
    delay_minutes: number;
    channel: string;
    subject: string | null;
    body: string;
    send_window: { start: string; end: string } | null;
  }>;
};

export const SEQUENCE_TEMPLATES: Record<string, NurtureSequenceTemplate> = {
  landing_page_abandon: {
    name: "Landing Page Visitor Recovery",
    trigger_type: "landing_page_abandon",
    steps: [
      { step_number: 1, delay_minutes: 60, channel: "sms", subject: null, body: "Hey {first_name}, still looking for storage near {facility_location}? That {unit_size} at {facility_name} is still available at ${unit_rate}/mo. Reserve it here: {reserve_link}", send_window: { start: "09:00", end: "20:00" } },
      { step_number: 2, delay_minutes: 1440, channel: "email", subject: "Your {unit_size} unit is still waiting at {facility_name}", body: "Hi {first_name},\n\nYou were looking at a {unit_size} unit at {facility_name}. Good news, it's still available.\n\n• Rate: ${unit_rate}/month\n• Location: {facility_location}\n\nReserve it now: {reserve_link}\n\nQuestions? Call us at {facility_phone}.\n\n{facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 4320, channel: "sms", subject: null, body: "Heads up {first_name}, people are viewing storage near {facility_location} today. Your {unit_size} unit is still open. Lock it in: {reserve_link}", send_window: { start: "10:00", end: "19:00" } },
      { step_number: 4, delay_minutes: 10080, channel: "email", subject: "Last chance: {unit_size} at {facility_name}", body: "Hi {first_name},\n\nWe're running a limited-time offer at {facility_name}: first month at 50% off when you reserve this week.\n\n{unit_size} unit: ${unit_rate}/mo (first month just ${half_rate})\n\nReserve: {reserve_link}\n\n{facility_name} Team", send_window: null },
      { step_number: 5, delay_minutes: 20160, channel: "email", subject: "We saved a spot for you, {first_name}", body: "Hi {first_name},\n\nA couple weeks ago you were looking for storage near {facility_location}. If you still need space, we've got you covered.\n\nReserve your unit: {reserve_link}\n\nIf your plans changed, no worries, we won't bother you again.\n\n{facility_name} Team", send_window: null },
    ],
  },
  reservation_abandon: {
    name: "Incomplete Reservation Recovery",
    trigger_type: "reservation_abandon",
    steps: [
      { step_number: 1, delay_minutes: 30, channel: "sms", subject: null, body: "Hey {first_name}, looks like you didn't finish reserving your {unit_size} at {facility_name}. Need help? Reply here or call {facility_phone}: {reserve_link}", send_window: { start: "08:00", end: "21:00" } },
      { step_number: 2, delay_minutes: 240, channel: "email", subject: "Finish your reservation at {facility_name}", body: "Hi {first_name},\n\nYou started reserving a {unit_size} unit at {facility_name} but didn't finish.\n\n• Unit: {unit_size}\n• Rate: ${unit_rate}/month\n\nPick up where you left off: {reserve_link}\n\nCall us at {facility_phone} if you need help.\n\n{facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 1440, channel: "sms", subject: null, body: "{first_name}, your {unit_size} reservation at {facility_name} expires today. Finish here before someone else grabs it: {reserve_link}", send_window: { start: "10:00", end: "18:00" } },
    ],
  },
  post_move_in: {
    name: "New Tenant Lifecycle",
    trigger_type: "post_move_in",
    steps: [
      { step_number: 1, delay_minutes: 120, channel: "sms", subject: null, body: "Welcome to {facility_name}, {first_name}! Your gate code is {gate_code}. Office hours: {office_hours}. Questions anytime: {facility_phone}", send_window: { start: "08:00", end: "20:00" } },
      { step_number: 2, delay_minutes: 10080, channel: "email", subject: "How's everything going, {first_name}?", body: "Hi {first_name},\n\nYou've been with us at {facility_name} for a week. How's everything going?\n\nIf you need anything (different unit size, packing supplies, access questions) just reply or call {facility_phone}.\n\n{facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 43200, channel: "sms", subject: null, body: "Hey {first_name}! You've been at {facility_name} for 30 days. If we're doing a good job, would you mind leaving us a quick Google review? It really helps: {review_link}", send_window: { start: "10:00", end: "18:00" } },
      { step_number: 4, delay_minutes: 86400, channel: "email", subject: "Upgrade opportunity at {facility_name}", body: "Hi {first_name},\n\nYou've been with us for 60 days, thanks for being a great tenant.\n\nDid you know we offer:\n• Tenant protection plans starting at $12/mo\n• Climate-controlled upgrades\n• Larger unit options\n\nInterested? Reply or call {facility_phone}.\n\n{facility_name} Team", send_window: null },
      { step_number: 5, delay_minutes: 129600, channel: "email", subject: "Your 90-day check-in at {facility_name}", body: "Hi {first_name},\n\n3 months already! Quick check-in:\n\n✅ Right unit size?\n✅ On autopay yet?\n✅ Want to lock in your current rate?\n\nReply or call {facility_phone}.\n\n{facility_name} Team", send_window: null },
    ],
  },
  win_back: {
    name: "Move-Out Win-Back",
    trigger_type: "win_back",
    steps: [
      { step_number: 1, delay_minutes: 1440, channel: "email", subject: "We'll miss you at {facility_name}, {first_name}", body: "Hi {first_name},\n\nWe're sorry to see you go. If you have 30 seconds, we'd love to know how we did:\n\n{feedback_link}\n\nIf you ever need storage again, you'll always have a spot.\n\n{facility_name} Team", send_window: null },
      { step_number: 2, delay_minutes: 43200, channel: "sms", subject: null, body: "Hey {first_name}, it's {facility_name}. Need storage again? Come back and get 25% off your first month. Code: {promo_code}. Reserve: {reserve_link}", send_window: { start: "10:00", end: "18:00" } },
      { step_number: 3, delay_minutes: 129600, channel: "email", subject: "Your neighbors are still storing with us, {first_name}", body: "Hi {first_name},\n\nIt's been 3 months since you moved out of {facility_name}. If your storage needs have changed, we'd love to have you back.\n\nReturning tenant special: 25% off your first month + waived admin fee.\n\nReserve: {reserve_link}\n\n{facility_name} Team", send_window: null },
    ],
  },
  // Ported from the drip post_audit sequence (src/lib/drip-sequences.ts day 1/3/7 →
  // send-template follow_up / value_add / check_in). Email-only, matching the source
  // templateIds. delay_minutes is incremental (process-nurture schedules each step at
  // now + delay after the prior send), so cumulative diffs preserve the day 1/3/7 schedule.
  post_audit: {
    name: "Post-Audit Follow-up",
    trigger_type: "post_audit",
    steps: [
      { step_number: 1, delay_minutes: 1440, channel: "email", subject: "Quick question about {facility_name}", body: "Hi {first_name},\n\nThanks for filling out the facility audit for {facility_name}. I went through your numbers and I have some initial thoughts on how we could help you fill units faster.\n\nDo you have 15 minutes this week for a quick call? I'd love to walk you through what we're seeing in your market and share a few ideas specific to your facility.\n\nNo pressure at all. I just want to make sure you have the full picture before deciding if we're a fit.\n\nBlake Burkett, StorageAds\n{facility_phone}", send_window: null },
      { step_number: 2, delay_minutes: 2880, channel: "email", subject: "A quick tip for {facility_name}", body: "Hi {first_name},\n\nI've been looking at facilities similar to {facility_name} in your area and noticed something worth sharing.\n\nThe biggest thing we see across the board: facilities send paid traffic to their homepage instead of a dedicated landing page. A simple landing page with unit availability, pricing, and a reservation form typically converts 3 to 4 times better than a homepage.\n\nHappy to dig into this more if you're interested. No pitch, just sharing what's working in your market right now.\n\nBlake Burkett, StorageAds\n{facility_phone}", send_window: null },
      { step_number: 3, delay_minutes: 5760, channel: "email", subject: "Still thinking about {facility_name}?", body: "Hi {first_name},\n\nJust checking in. I know things get busy. I wanted to see if you still had questions about filling units at {facility_name}.\n\nNo worries if the timing isn't right. But if occupancy is still a concern, we're here whenever you're ready to chat.\n\nEither way, I appreciate you taking the time to go through the audit.\n\nBlake Burkett, StorageAds\n{facility_phone}", send_window: null },
    ],
  },
  // Ported from the drip recovery sequence (src/lib/drip-sequences.ts 1hr/24hr/72hr →
  // send-template recovery_1hr / recovery_24hr / recovery_72hr). Email-only, matching the
  // source templateIds. Cumulative diffs (60/1380/2880) preserve the 1hr/24hr/72hr schedule.
  recovery: {
    name: "Abandoned Form Recovery",
    trigger_type: "abandoned_form",
    steps: [
      { step_number: 1, delay_minutes: 60, channel: "email", subject: "Still looking for storage near {facility_name}?", body: "Hi {first_name},\n\nGood news: units are still available and we're holding your spot at {facility_name}.\n\nYou can pick up right where you left off. It takes less than 60 seconds: {reserve_link}\n\nQuestions? Just reply to this email or call us at {facility_phone}.", send_window: null },
      { step_number: 2, delay_minutes: 1380, channel: "email", subject: "Don't miss out, units are filling up at {facility_name}", body: "Hi {first_name},\n\nQuick heads up: we've seen a few units get reserved since yesterday, and availability is getting tighter at {facility_name}.\n\nWe can't guarantee pricing or availability beyond today, so lock in your rate now: {reserve_link}\n\nNeed help deciding? Call us at {facility_phone} and we'll walk you through the options.", send_window: null },
      { step_number: 3, delay_minutes: 2880, channel: "email", subject: "A little something to help you decide, {first_name}", body: "Hi {first_name},\n\nFinding the right storage spot takes time, so to make the decision easier we've got something for you: your first month for $1 at {facility_name}.\n\nReserve in the next 48 hours to lock it in: {reserve_link}\n\nThis offer is limited to new reservations only. Questions? Reply to this email or call {facility_phone}.", send_window: null },
    ],
  },
};
