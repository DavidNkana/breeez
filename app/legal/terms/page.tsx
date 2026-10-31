import Link from 'next/link';
import { brand } from '@/lib/brand';
import { legal, paymentFacts, shippingFacts } from '@/lib/legal';

export const metadata = { title: 'Terms of Service — Evasale' };

export default function TermsPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Terms of Service</h1>
        <p className="text-sm text-brand-500">Last updated: {legal.lastUpdated}</p>

        <h2>Overview</h2>
        <p>
          This website is operated by {legal.entityName}, trading as {legal.tradingName}. Throughout the
          site, the terms &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; refer to {legal.entityName}.{' '}
          {legal.tradingName} offers this website, including all information, tools and services available
          from it to you, the user, conditioned upon your acceptance of all terms, conditions, policies and
          notices stated here.
        </p>
        <p>
          By visiting our site and/or purchasing something from us, you engage in our &ldquo;Service&rdquo; and
          agree to be bound by these terms and conditions, including any additional policies referenced
          here or linked from these pages.
        </p>
        <p>
          Please read these Terms of Service carefully before using the site. If you do not agree with
          them, you may not access the website or use any of our services. We reserve the right to update
          or replace any part of these Terms by posting the change on this page. Your continued use of the
          site after a change is posted constitutes acceptance of that change.
        </p>

        <h2>1. About us</h2>
        <p>
          {legal.tradingName} is an online clothing, footwear, bags and accessories store based in
          Pretoria, South Africa. We sell through our website at {legal.websiteDisplay} and through our
          Evasale mobile apps for Android and iOS. We deliver nationwide in South Africa.
        </p>
        <ul>
          <li>Legal entity: {legal.entityName}</li>
          {legal.registrationNumber && <li>Company registration number: {legal.registrationNumber}</li>}
          {legal.vatNumber && <li>VAT number: {legal.vatNumber}</li>}
          <li>Website: {legal.websiteDisplay}</li>
          <li>Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a></li>
          <li>Telephone and WhatsApp: <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a></li>
          <li>Address: {brand.contact.address.full}, {brand.contact.address.country}</li>
        </ul>

        <h2>2. Online store terms</h2>
        <p>
          By agreeing to these Terms, you represent that you are at least 18 years old, or that you are the
          age of majority in your province and you have our consent to allow any of your dependants to use
          this site.
        </p>
        <p>
          You may not use our products for any illegal or unauthorised purpose, nor may you violate any law
          applicable to you. You must not transmit worms, viruses or any destructive code. A breach of these
          Terms will result in immediate termination of your use of the Service.
        </p>

        <h2>3. General conditions</h2>
        <p>
          We reserve the right to refuse service to anyone for any reason at any time. Where you place an
          order, you agree to provide current, complete and accurate contact and payment information so we
          can complete your transaction and reach you if we need to.
        </p>
        <p>
          You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service
          or the website without our express written permission.
        </p>
        <p>The headings used here are for convenience only and will not affect the interpretation of these Terms.</p>

        <h2>4. Accuracy of information</h2>
        <p>
          We are not responsible if information on this site is not accurate, complete or current. Material
          on this site is provided for general information only and should not be relied on as the sole
          basis for making a decision. We reserve the right to modify the contents of this site at any
          time, and it is your responsibility to check for changes.
        </p>

        <h2>5. Products, prices and availability</h2>
        <p>
          All prices are shown in South African Rand ({paymentFacts.currency}) and include VAT where
          applicable. Prices and product descriptions may change without notice, and we may limit
          quantities per order, per customer and per delivery address where an order appears to be placed
          by a reseller or for commercial resale.
        </p>
        <p>
          Certain products may only be available online. We have made every effort to display colours
          accurately, but your monitor and device settings may differ from ours, and minor variations
          between the product and its photograph are possible. Product images are illustrative; unless
          specifically stated, they do not form part of the product.
        </p>
        <p>
          All orders are subject to product availability. If an item is not in stock when you order, we
          will let you know and refund the affected amount to your original payment method.
        </p>

        <h2>6. Orders and acceptance</h2>
        <p>
          Placing an order is an offer to buy. Your order is accepted only once we have confirmed
          availability and <strong>received and verified your payment</strong>. We may refuse or cancel an
          order, before or after payment, where we reasonably suspect fraud, where the price or stock
          information was incorrect, or where we cannot fulfil the order.
        </p>
        <p>
          We will contact you using the email address or phone number on your order if we need to change
          or cancel it. If your payment has already been taken and we cancel the order, the full amount is
          refunded to your original payment method.
        </p>

        <h2>7. Payment</h2>
        <p>
          We accept payment through {paymentFacts.primary}
          {paymentFacts.secondary && paymentFacts.secondary !== 'PayJustNow' ? ` and ${paymentFacts.secondary}` : ''},
          which lets you choose between {paymentFacts.methods}. Payments are processed on Payfast&apos;s
          secure hosted checkout, so your card details are entered on Payfast&apos;s servers and never
          stored on ours.
        </p>
        <p>
          An order is only marked as paid once Payfast has confirmed the payment to us through a
          server-to-server notification. If you complete payment but see an error, check your account or
          contact us with your order reference before paying again.
        </p>
        <p>
          If a payment is declined or reversed after we have confirmed it, we may cancel the order and
          recover the goods or the value of the goods.
        </p>

        <h2>8. Delivery</h2>
        <p>
          We deliver in South Africa only, nationwide, using {shippingFacts.carrier} door delivery. The
          current delivery price is R{shippingFacts.flatRateZar} and the estimated delivery time is{' '}
          {shippingFacts.etaWorkingDays} working days from dispatch. Delivery times are estimates and
          begin when the parcel is handed to the courier, not when you order.
        </p>
        <p>
          Risk in the goods passes to you on delivery. See our{' '}
          <Link href="/legal/shipping">Shipping Policy</Link> for full details.
        </p>

        <h2>9. Returns and refunds</h2>
        <p>
          You have <strong>{legal.returnWindowDays} days</strong> from the date of delivery to return an
          item for a refund, subject to the conditions in our{' '}
          <Link href="/legal/returns">Returns Policy</Link>. Return shipping is at your cost unless the
          item is damaged, faulty or not what you ordered.
        </p>
        <p>
          Nothing in this section limits your right to return defective goods, or to claim a refund or
          replacement, under the Consumer Protection Act 68 of 2008.
        </p>

        <h2>10. Personal information</h2>
        <p>
          Your personal information is handled in line with the{' '}
          <Link href="/legal/privacy">Privacy Policy</Link> and the Protection of Personal Information
          Act 4 of 2013 (POPIA).
        </p>

        <h2>11. Your account</h2>
        <p>
          You are responsible for keeping your login details confidential and for all activity that
          happens on your account. Tell us immediately if you suspect unauthorised access. We may suspend
          an account we reasonably believe is being used fraudulently or in breach of these Terms.
        </p>

        <h2>12. Acceptable use and prohibited uses</h2>
        <p>You may not use the site or its content:</p>
        <ul>
          <li>for any unlawful purpose, or to solicit others to do anything unlawful;</li>
          <li>to infringe our intellectual property rights or anyone else&apos;s;</li>
          <li>to harass, abuse, discriminate against or defame any person;</li>
          <li>to submit false or misleading information;</li>
          <li>to upload or transmit malware;</li>
          <li>to collect or track the personal information of others;</li>
          <li>to spam, phish, or scrape the site; or</li>
          <li>to interfere with or circumvent any security feature of the site.</li>
        </ul>
        <p>We may terminate your use of the site if you breach these Terms.</p>

        <h2>13. Third-party links and services</h2>
        <p>
          Some content or services on the site are provided by third parties, including Payfast, The
          Courier Guy, Vercel and Supabase. We do not control these third parties and are not responsible
          for their content, accuracy or practices. Read their policies before transacting with them.
        </p>

        <h2>14. Reviews and submissions</h2>
        <p>
          If you send us ideas, suggestions, photographs or other materials, you grant us a
          non-exclusive, royalty-free licence to use them on the site and across our channels. We may
          remove content that is unlawful, offensive or infringes someone else&apos;s rights.
        </p>

        <h2>15. Intellectual property</h2>
        <p>
          All content on this site, including logos, photographs, text, layouts, code and the mobile apps,
          belongs to {legal.entityName} or its licensors. You may not copy, reproduce or distribute it
          without written permission. Our brand name and logo may not be used in a way that suggests
          endorsement.
        </p>

        <h2>16. Errors and corrections</h2>
        <p>
          We may correct typographical errors, inaccuracies and omissions relating to product descriptions,
          pricing, promotions, offers, delivery charges and availability at any time, and we may cancel
          an order where the information on the site was materially incorrect.
        </p>

        <h2>17. Disclaimer and limitation of liability</h2>
        <p>
          The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent permitted
          by law we do not warrant that your use of the service will be uninterrupted, timely, secure or
          error-free, or that the results obtained from it will be accurate or reliable.
        </p>
        <p>
          To the extent permitted by law, {legal.entityName} is not liable for indirect or consequential
          loss arising from your use of the site or a product bought through it. Our total liability in
          respect of any order is limited to the amount you paid for that order.
        </p>
        <p>
          <strong>
            Nothing in these Terms excludes or limits our liability for death or personal injury caused by
            our negligence, for fraud or fraudulent misrepresentation, for any other liability that cannot
            lawfully be excluded, or for your rights under the Consumer Protection Act 68 of 2008.
          </strong>
        </p>

        <h2>18. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless {legal.entityName}, its directors, officers, employees
          and agents against any claim, demand or loss, including reasonable legal fees, arising from your
          breach of these Terms or your violation of any law or the rights of a third party.
        </p>

        <h2>19. Severability</h2>
        <p>
          If any provision of these Terms is found to be unlawful, void or unenforceable, that provision
          is severed from these Terms and the remaining provisions continue to apply.
        </p>

        <h2>20. Termination</h2>
        <p>
          These Terms apply until terminated by you or by us. You may stop using the site at any time. We
          may terminate your use of the site if, in our judgement, you have failed to comply with these
          Terms; you remain liable for amounts outstanding at the point of termination.
        </p>

        <h2>21. Entire agreement</h2>
        <p>
          These Terms, together with the policies they refer to, are the entire agreement between you and
          {legal.entityName} in relation to your use of the site, and supersede any prior agreement or
          communication. Failure by us to enforce a provision is not a waiver of it.
        </p>

        <h2>22. Governing law and jurisdiction</h2>
        <p>
          These Terms and any separate agreements for the supply of products are governed by the laws of
          the Republic of South Africa. Any dispute is subject to the exclusive jurisdiction of the
          competent courts of South Africa, except that you may elect to submit a consumer dispute to the
          Consumer Goods and Services Ombud in terms of the Consumer Protection Act.
        </p>

        <h2>23. Changes to these Terms</h2>
        <p>
          The current version is always available on this page. We may update it at any time, and your
          continued use of the site after a change is posted constitutes acceptance of that change.
        </p>

        <h2>24. Contact information</h2>
        <p>Questions about these Terms should be sent to us:</p>
        <ul>
          <li>
            Email: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          </li>
          <li>
            WhatsApp and telephone: <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a>
          </li>
          <li>Postal address: {brand.contact.address.full}, {brand.contact.address.country}</li>
        </ul>
      </main>
    </>
  );
}
