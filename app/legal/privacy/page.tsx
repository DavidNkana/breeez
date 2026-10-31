import Link from 'next/link';
import { brand } from '@/lib/brand';
import { legal } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy — Evasale' };

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-brand-500">Last updated: {legal.lastUpdated}</p>

        <p>
          We take your personal information seriously. This policy explains who we are, what we collect, why
          we collect it, who we share it with, how long we keep it, and the rights you have under the
          Protection of Personal Information Act 4 of 2013 ({'POPIA'}).
        </p>

        <h2>1. Who we are</h2>
        <p>The &ldquo;responsible party&rdquo; for your personal information is:</p>
        <ul>
          <li>Legal entity: {legal.entityName}, trading as {legal.tradingName}</li>
          {legal.registrationNumber && <li>Company registration number: {legal.registrationNumber}</li>}
          {legal.vatNumber && <li>VAT number: {legal.vatNumber}</li>}
          <li>Website: {legal.websiteDisplay}</li>
          <li>
            Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          </li>
          <li>
            Telephone and WhatsApp: <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a>
          </li>
          <li>Address: {brand.contact.address.full}, {brand.contact.address.country}</li>
        </ul>
        <p>
          {legal.informationOfficer
            ? `Our Information Officer, appointed under POPIA, is ${legal.informationOfficer}. Please direct any POPIA queries to them at the email address above, marked for their attention.`
            : 'Our Information Officer is appointed in terms of POPIA. Until that appointment is published here, please direct all POPIA queries to our general support address above and they will be forwarded to the Information Officer.'}
        </p>

        <h2>2. What we collect</h2>
        <p>We collect two kinds of information.</p>
        <h3>Information you give us</h3>
        <ul>
          <li>Your name, email address, phone number and WhatsApp number;</li>
          <li>Your delivery address and any delivery instructions you add at checkout;</li>
          <li>Your order history, returns and support conversations;</li>
          <li>Marketing preferences, if you have given us consent to market to you.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>Your IP address, browser type, device type and operating system;</li>
          <li>Pages you visit, the pages that refer you to us and how you interact with the site;</li>
          <li>Cookies and similar technologies, described in section 7.</li>
        </ul>
        <p>
          We do <strong>not</strong> collect or store your card details. Payments are processed on Payfast&apos;s
          hosted checkout, so your card number, expiry date and CVV never reach our servers.
        </p>

        <h2>3. Special categories of personal information</h2>
        <p>
          We do not intentionally collect special personal information as defined by POPIA (such as
          health, biometric or racial information), and we do not sell or rent your personal information.
        </p>

        <h2>4. Why we use your information, and our lawful grounds</h2>
        <p>We process personal information for these purposes:</p>
        <ul>
          <li>
            <strong>To fulfil your order</strong> — processing payment, arranging delivery with{' '}
            {`The Courier Guy`}, and sending you your order confirmation and invoice. This is necessary to
            perform the contract you enter into with us.
          </li>
          <li>
            <strong>To meet our legal obligations</strong> — including tax records required by the VAT Act
            and our obligation to retain order and payment records.
          </li>
          <li>
            <strong>For our legitimate business interests</strong> — preventing fraud, securing the site,
            improving the storefront, and understanding how the store is used, provided your interests are
            not overridden by your rights.
          </li>
          <li>
            <strong>With your consent</strong> — sending you marketing communications or optional
            analytics cookies. You can withdraw consent at any time.
          </li>
        </ul>

        <h2>5. Who we share it with</h2>
        <p>We share personal information only with service providers who need it to run the store, and who are bound to protect it:</p>
        <ul>
          <li>Payfast — to take payment and confirm it back to us;</li>
          <li>The Courier Guy — to deliver your parcel;</li>
          <li>Supabase — to store accounts, orders and product data;</li>
          <li>Resend — to send order confirmations and account emails;</li>
          <li>Vercel — to host the website and mobile app backend;</li>
          <li>Our payment, email and hosting providers, and professional advisers, where required by law.</li>
        </ul>
        <p>
          We may also disclose information where we are legally required to do so, for example in response
          to a lawful court order or a regulator&apos;s direction.
        </p>

        <h2>6. Where your information is stored</h2>
        <p>
          Your information is stored on servers located with our hosting and database providers. Some of our
          providers process data outside South Africa, in line with their own security and privacy
          commitments. Where personal information is transferred outside South Africa we ensure the
          receiving party is bound by an equivalent level of protection.
        </p>

        <h2>7. Cookies and analytics</h2>
        <p>
          We use strictly necessary cookies to keep you signed in, remember your cart and make the
          checkout work — for example your session and your cookie consent choice. Where you allow it, we
          also use analytics cookies to understand how visitors use the store, and to measure whether our
          marketing is working.
        </p>
        <p>
          Optional cookies are only set after you accept them, and you can change your choice at any time
          from the cookie banner or your browser settings. Blocking or deleting cookies may affect how the
          site works for you.
        </p>

        <h2>8. How we protect your information</h2>
        <p>
          We protect personal information with reasonable technical and organisational safeguards:
          encryption in transit, access controls on our systems, restricted admin access, and keeping
          payment details out of our own systems entirely. No system is perfectly secure, and we will
          notify you and the Information Regulator without undue delay if a breach that is likely to
          result in serious harm to you becomes known to us.
        </p>

        <h2>9. How long we keep it</h2>
        <p>
          We keep order and payment records for as long as we are legally required to (typically five
          years from the end of the financial year in which the transaction occurred), so that we can
          deal with queries, refunds and tax obligations. Account information is kept while your account
          exists. Marketing preferences are kept until you unsubscribe or ask us to delete them.
        </p>

        <h2>10. Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>ask us what personal information we hold about you and request a copy;</li>
          <li>ask us to correct or delete personal information we hold about you;</li>
          <li>object to the processing of your personal information;</li>
          <li>ask us to stop sending you marketing communications;</li>
          <li>withdraw consent at any time, where we rely on consent;</li>
          <li>complain to the Information Regulator of South Africa if you believe your rights have been infringed.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> with the subject line
          &ldquo;POPIA request&rdquo;. We will respond within the timeframes set by POPIA. You also have the
          right to complain to the Information Regulator, whose contact details are published at{' '}
          <a href="https://inforegulator.org.za" rel="noopener noreferrer" target="_blank">
            inforegulator.org.za
          </a>
          .
        </p>

        <h2>11. Children</h2>
        <p>
          Our store is not directed at children under 18 and we do not knowingly collect personal
          information from them. If you believe a child has provided us with personal information, contact
          us and we will delete it.
        </p>

        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy to reflect changes in our practices, our service providers or the law.
          The current version is always available on this page.
        </p>

        <h2>13. Contact us</h2>
        <p>
          If you have any questions about our privacy practices, want to make a complaint, or want to
          exercise any of your rights, contact us at{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> or write to us at{' '}
          {brand.contact.address.full}, {brand.contact.address.country}. See also our{' '}
          <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </main>
    </>
  );
}
