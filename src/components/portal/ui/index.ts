/**
 * Portal primitive kit. Token-only, accessible building blocks shared across
 * every /portal route. Import from "@/components/portal/ui".
 */
export { Button } from "./button";
export type { ButtonProps } from "./button";
export { Card } from "./card";
export { PageHeader } from "./page-header";
export { StatCard } from "./stat-card";
export { Badge } from "./badge";
export { EmptyState } from "./empty-state";
export { PortalPage } from "./portal-page";
export { Tabs } from "./tabs";
export type { TabOption } from "./tabs";

// Re-export the shared loading/error states so pages have one import surface.
export { Skeleton, CardSkeleton, SectionSkeleton, ErrorState } from "@/lib/portal-helpers";
