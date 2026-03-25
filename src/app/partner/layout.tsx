import { PartnerShell } from "@/components/partner/partner-shell";

export const metadata = {
  title: "Partner Dashboard | StorageAds",
  robots: { index: false, follow: false },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PartnerShell>{children}</PartnerShell>;
}
