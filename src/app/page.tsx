import dynamic from "next/dynamic";
import Hero from "@/components/marketing/hero";
import ProblemStatement from "@/components/marketing/problem-statement";
import Nav from "@/components/marketing/nav";

const DemandEngineVisual = dynamic(
  () => import("@/components/marketing/demand-engine-visual"),
);
const HowItWorks = dynamic(
  () => import("@/components/marketing/how-it-works"),
);
const ThreeWayComparison = dynamic(
  () => import("@/components/marketing/three-way-comparison"),
);
const InactionTimeline = dynamic(
  () => import("@/components/marketing/inaction-timeline"),
);
const QuickCalculator = dynamic(
  () => import("@/components/marketing/quick-calculator"),
);
const Results = dynamic(() => import("@/components/marketing/results"));
const CTASection = dynamic(
  () => import("@/components/marketing/cta-section"),
);
const Footer = dynamic(() => import("@/components/marketing/footer"));

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <ProblemStatement />
        <DemandEngineVisual />
        <HowItWorks />
        <ThreeWayComparison />
        <InactionTimeline />
        <QuickCalculator />
        <Results />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
