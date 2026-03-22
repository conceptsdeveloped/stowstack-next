import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "StowStack privacy policy. How we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>StowStack by StorageAds.com (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the website stowstack.co and related applications. This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit our website, use our services, or interact with our applications on third-party platforms including Meta (Facebook and Instagram).</p>

      <h2>Information We Collect</h2>
      <p><strong>Information you provide directly:</strong></p>
      <ul>
        <li>Name, email address, and phone number when you submit our audit intake form or contact us</li>
        <li>Facility information such as name, location, occupancy range, and unit count</li>
        <li>Login credentials for the client portal (email and access code)</li>
        <li>Messages, notes, and other content you submit through our forms or client portal</li>
      </ul>
      <p><strong>Information collected automatically:</strong></p>
      <ul>
        <li>Browser type and version, operating system, and device type</li>
        <li>IP address and approximate geographic location</li>
        <li>Pages visited, time spent on pages, and referring URLs</li>
        <li>Interaction data such as clicks, scrolls, and form interactions</li>
      </ul>
      <p><strong>Information from third-party platforms:</strong></p>
      <ul>
        <li>When we run advertising campaigns on your behalf via Meta (Facebook/Instagram), we may receive aggregated campaign performance data including impressions, clicks, leads, and conversion events through the Meta Marketing API and Conversions API</li>
        <li>We do not collect or store personal data of individual Facebook or Instagram users who view or interact with ads</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We process your information for the following specific purposes:</p>
      <ul>
        <li><strong>Service delivery:</strong> Providing facility audits, creating and managing advertising campaigns, and generating performance reports</li>
        <li><strong>Client portal:</strong> Authenticating your identity and displaying campaign performance data in your dashboard</li>
        <li><strong>Communications:</strong> Sending audit results, campaign reports, onboarding information, and responding to your inquiries</li>
        <li><strong>Campaign optimization:</strong> Analyzing ad performance data to optimize campaigns, conduct A/B testing, and improve conversion rates</li>
        <li><strong>Meta platform integration:</strong> Using the Meta Marketing API and Conversions API to create, manage, and measure advertising campaigns on Facebook and Instagram on behalf of our clients</li>
        <li><strong>Service improvement:</strong> Improving our website, tools, and service offerings based on usage patterns</li>
      </ul>

      <h2>Information Sharing and Disclosure</h2>
      <p>We do not sell, trade, or rent your personal information to third parties. We may share information with:</p>
      <ul>
        <li><strong>Meta Platforms, Inc.:</strong> Campaign data shared through the Meta Marketing API and Conversions API for the purpose of running and measuring advertising campaigns on your behalf. This data is processed in accordance with Meta&apos;s Platform Terms and Data Policy.</li>
        <li><strong>Service providers:</strong> Third parties who assist us in operating our website and services, including email delivery (Resend), hosting (Vercel), and analytics tools. These providers are contractually obligated to protect your data.</li>
        <li><strong>Legal requirements:</strong> When required by law, court order, or governmental regulation, or to protect our rights, property, or safety.</li>
      </ul>

      <h2>Meta Platform Data</h2>
      <p>Our application integrates with Meta&apos;s platform (Facebook and Instagram) to provide advertising services. Regarding data obtained through Meta&apos;s platform:</p>
      <ul>
        <li>We only access Meta platform data that is necessary to provide our advertising management services</li>
        <li>We do not use Meta platform data for purposes other than providing and improving our services for the specific client whose campaigns we manage</li>
        <li>We do not transfer or sell Meta platform data to third parties, advertising networks, or data brokers</li>
        <li>We do not use Meta platform data to build or augment user profiles for purposes unrelated to our services</li>
        <li>Campaign performance data accessed through Meta APIs is displayed only to the authorized client in their secure portal</li>
      </ul>

      <h2>Data Security</h2>
      <p>We implement reasonable security measures to protect your personal information. Client portal access is secured with unique access codes, and all data is transmitted over encrypted connections (HTTPS). We regularly review our security practices and update them as necessary.</p>

      <h2>Data Retention</h2>
      <p>We retain your personal information for as long as your account is active or as needed to provide our services. Campaign performance data is retained for the duration of our service agreement and for a reasonable period afterward for reporting purposes.</p>

      <h2>Data Deletion</h2>
      <p>You have the right to request deletion of your personal data at any time. To request data deletion:</p>
      <ul>
        <li><strong>Email:</strong> Send a deletion request to <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a> with the subject line &ldquo;Data Deletion Request&rdquo;</li>
        <li><strong>Response time:</strong> We will acknowledge your request within 5 business days and complete deletion within 30 days</li>
        <li><strong>Scope:</strong> Upon deletion, we will remove your personal data from our systems, including any data obtained through Meta&apos;s platform APIs. Some data may be retained if required by law or legitimate business purposes (e.g., financial records).</li>
      </ul>

      <h2>Cookies and Tracking</h2>
      <p>Our website uses essential cookies for functionality such as maintaining your login session. On client landing pages built for advertising campaigns, we may use:</p>
      <ul>
        <li>Meta Pixel for conversion tracking and campaign optimization</li>
        <li>Meta Conversions API (server-side) for accurate attribution</li>
        <li>Essential analytics to measure page performance</li>
      </ul>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Correct inaccurate or incomplete personal information</li>
        <li>Request deletion of your personal data (see Data Deletion section above)</li>
        <li>Object to or restrict certain processing of your data</li>
        <li>Withdraw consent where processing is based on consent</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a>.</p>

      <h2>Children&apos;s Privacy</h2>
      <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.</p>

      <h2>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify active clients of any material changes via email. The &ldquo;Last updated&rdquo; date at the top of this page indicates when this policy was last revised.</p>

      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy, how we handle your data, or wish to exercise your data rights, contact us at:</p>
      <p>StowStack<br />Email: <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a><br />Phone: (269) 929-8541<br />Website: stowstack.co</p>
    </LegalLayout>
  );
}
