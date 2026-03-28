import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Data Processing Agreement — StorageAds",
  description: "StorageAds Data Processing Agreement for tenant data handling and compliance.",
};

export default function DpaPage() {
  return (
    <LegalLayout title="Data Processing Agreement" >
      <section>
        <h2>1. Scope and Purpose</h2>
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) applies to the processing of personal data
          by StorageAds (&quot;Processor&quot;) on behalf of the self-storage facility operator (&quot;Controller&quot;)
          in connection with StorageAds marketing and attribution services.
        </p>
        <p>
          StorageAds processes tenant data solely for the purpose of providing advertising attribution,
          campaign performance reporting, and related marketing services as described in the
          Terms of Service.
        </p>
      </section>

      <section>
        <h2>2. Data Processed</h2>
        <p>Categories of personal data processed may include:</p>
        <ul>
          <li>Tenant names and contact information (from storEDGE reservation data)</li>
          <li>Move-in and move-out dates</li>
          <li>Unit type and rental rate</li>
          <li>Advertising interaction data (ad clicks, landing page visits, conversion events)</li>
          <li>Device and browser identifiers for attribution</li>
          <li>IP addresses (anonymized for analytics)</li>
        </ul>
      </section>

      <section>
        <h2>3. Processing Obligations</h2>
        <p>StorageAds shall:</p>
        <ul>
          <li>Process personal data only on documented instructions from the Controller</li>
          <li>Ensure persons authorized to process data have committed to confidentiality</li>
          <li>Implement appropriate technical and organizational security measures</li>
          <li>Not engage sub-processors without prior written authorization</li>
          <li>Assist the Controller in responding to data subject requests</li>
          <li>Delete or return all personal data upon termination of services</li>
        </ul>
      </section>

      <section>
        <h2>4. Sub-Processors</h2>
        <p>StorageAds uses the following sub-processors:</p>
        <ul>
          <li><strong>Vercel</strong> — Application hosting (United States)</li>
          <li><strong>Neon</strong> — Database hosting (United States)</li>
          <li><strong>Upstash</strong> — Caching and rate limiting (United States)</li>
          <li><strong>Resend</strong> — Transactional email delivery (United States)</li>
          <li><strong>Stripe</strong> — Payment processing (United States)</li>
          <li><strong>Meta Platforms</strong> — Advertising delivery via Conversions API</li>
          <li><strong>Google</strong> — Advertising delivery via Google Ads API</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          StorageAds implements industry-standard security measures including encryption in transit
          (TLS 1.3), encryption at rest, access controls, audit logging, and regular security reviews.
          Database access is restricted to authorized personnel with role-based permissions.
        </p>
      </section>

      <section>
        <h2>6. Data Subject Rights</h2>
        <p>
          StorageAds will assist the Controller in fulfilling data subject requests including
          access, rectification, erasure, restriction, and portability. Data deletion requests
          can be submitted through the StorageAds dashboard or via email to privacy@storageads.com.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>
          Attribution data is retained for the duration of the service agreement plus 90 days.
          Upon termination, all personal data is deleted within 30 days unless retention is
          required by law. Anonymized aggregate data may be retained indefinitely for analytics.
        </p>
      </section>

      <section>
        <h2>8. Breach Notification</h2>
        <p>
          StorageAds will notify the Controller of any personal data breach without undue delay,
          and in any event within 72 hours of becoming aware of the breach. Notification will
          include the nature of the breach, categories of data affected, and remedial measures taken.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          For questions about this DPA or to exercise data rights, contact:
          privacy@storageads.com
        </p>
      </section>
    </LegalLayout>
  );
}
