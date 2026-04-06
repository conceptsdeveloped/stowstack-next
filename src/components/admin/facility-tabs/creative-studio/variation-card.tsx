"use client";

import { MetaVariationCard } from "./meta-variation-card";
import { GoogleRSACard } from "./google-rsa-card";
import { LandingPageCard } from "./landing-page-card";
import { EmailDripCard } from "./email-drip-card";
import type { AdVariation } from "./types";

export function VariationCard({
  v,
  adminKey,
  onUpdate,
  onDelete,
}: {
  v: AdVariation;
  adminKey: string;
  onUpdate: (updated: AdVariation) => void;
  onDelete: (id: string) => void;
}) {
  switch (v.platform) {
    case "google_search":
      return (
        <GoogleRSACard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    case "landing_page":
      return (
        <LandingPageCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    case "email_drip":
      return (
        <EmailDripCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
    default:
      return (
        <MetaVariationCard
          v={v}
          adminKey={adminKey}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );
  }
}
