import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "StowStack terms of service for website and advertising services.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the StowStack website at stowstack.co and any services provided by StowStack (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). By using our website or services, you agree to these Terms.</p>

      <h2>Services</h2>
      <p>StowStack provides digital advertising services for self-storage operators, including but not limited to: facility audits, Meta (Facebook/Instagram) ad campaign creation and management, lead generation, and performance reporting through our client portal.</p>

      <h2>Client Accounts</h2>
      <p>Access to the client portal is provided upon becoming a StowStack client. You are responsible for maintaining the confidentiality of your access code. You agree to notify us immediately of any unauthorized use of your account.</p>

      <h2>Service Agreements</h2>
      <p>Specific service terms, pricing, campaign budgets, and deliverables are defined in individual service agreements between StowStack and each client. These Terms supplement, but do not replace, any signed service agreement.</p>

      <h2>No Guarantees</h2>
      <p>While we strive to deliver strong results, advertising performance depends on many factors outside our control including market conditions, competition, and platform algorithms. We do not guarantee specific lead volumes, occupancy rates, or return on ad spend.</p>

      <h2>Intellectual Property</h2>
      <p>All content on the StowStack website, including text, graphics, logos, and software, is our property or licensed to us. Ad creative, copy, and campaign strategies developed for clients remain our intellectual property unless otherwise specified in a service agreement.</p>

      <h2>Limitation of Liability</h2>
      <p>StowStack shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability shall not exceed the fees paid by you in the 3 months preceding the claim.</p>

      <h2>Termination</h2>
      <p>Either party may terminate the service relationship with 30 days written notice. Upon termination, we will provide a final performance report and cease all advertising activities on your behalf.</p>

      <h2>Changes to Terms</h2>
      <p>We may update these Terms from time to time. We will notify active clients of any material changes via email.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms? Contact us at:</p>
      <p>StowStack<br />Email: blake@storepawpaw.com<br />Phone: (269) 929-8541</p>
    </LegalLayout>
  );
}
