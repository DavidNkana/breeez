import Link from 'next/link';
import { brand } from '@/lib/brand';
import { legal } from '@/lib/legal';

export const metadata = { title: 'Returns Policy — Evasale' };

export default function ReturnsPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Returns &amp; Exchanges Policy</h1>
        <p className="text-sm text-brand-500">Last updated: {legal.lastUpdated}</p>

        <p>
          We want you to be happy with what you bought. This policy explains how to return an item, get a
          refund, or swap it for a different size or colour.
        </p>

        <h2>Your right to inspect on delivery</h2>
        <p>
          You may inspect the goods on delivery. If the parcel is incorrect or an item is damaged, contact
          our customer services team on{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> and we will arrange a return
          and a refund of your payment.
        </p>

        <h2>{legal.returnWindowDays}-day return window</h2>
        <p>
          You have <strong>{legal.returnWindowDays} days from the date of delivery</strong> to return an
          item for a refund or exchange. A return request received after that window may be declined,
          unless the item is defective, damaged, or not what you ordered — in which case our obligations
          under the Consumer Protection Act 68 of 2008 continue to apply.
        </p>

        <h2>Your additional rights under the Consumer Protection Act</h2>
        <p>
          Where a product is defective, faulty, not as described, or not fit for purpose, you have the
          right to return it and choose a refund, replacement or repair, even where our{' '}
          {legal.returnWindowDays}-day window has closed. Where a defect is not reasonably discoverable on
          inspection, you have six months from delivery to claim a refund for a defect, a 30-day period for
          goods that are not fit for purpose, and a six-month period for goods that do not match their
          description or sample. We will always honour these rights.
        </p>

        <h2>Eligibility for a return</h2>
        <p>A return within {legal.returnWindowDays} days is accepted when:</p>
        <ul>
          <li>you provide proof of purchase — your order number or order confirmation email;</li>
          <li>the item has not been worn, used, washed or altered;</li>
          <li>the item is in its original condition and packaging, with all tags attached;</li>
          <li>items sold with a promotional gift are returned together with that gift;</li>
          <li>swimwear has its protective strip still attached; and</li>
          <li>for hygiene reasons, the item is not underwear, boxers, panties, swimwear without its
            protective strip, or body-piercing jewellery such as earrings.</li>
        </ul>
        <p>
          Sale items are returnable unless they are marked as final sale on the product page. A factory
          fault must be reported within 3 days of receiving the parcel.
        </p>

        <h2>How to return</h2>
        <ol>
          <li>
            Email us at <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> with your order
            number and the reason for the return, or WhatsApp us on{' '}
            <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a>.
          </li>
          <li>We will send you a return authorisation and the return address.</li>
          <li>Pack the item securely and send it to us using any courier company — return shipping is at your cost.</li>
          <li>
            Keep your proof of postage and tracking number. Parcels sent without tracking, or that are lost or
            stolen in transit, cannot be refunded.
          </li>
          <li>Once we receive and inspect the item, we will notify you of the refund decision.</li>
        </ol>
        <p>
          To request a return, please send your parcel within 4 working days of receiving our return
          authorisation.
        </p>

        <h2>Who pays for return shipping</h2>
        <p>
          Return shipping is at your cost, except where the item is damaged, faulty, or not what you
          ordered — in that case we cover the return shipping. The original delivery fee is not refundable.
        </p>

        <h2>Refunds</h2>
        <p>
          Refunds are processed within <strong>5 business days</strong> of us receiving and inspecting the
          returned item, to the original payment method. Your bank or payment provider then applies the
          refund, which can take a further few business days to appear.
        </p>
        <p>
          We may offer store credit instead of a refund where you prefer it. Store credit is not
          transferable and does not expire.
        </p>

        <h2>Exchanges</h2>
        <p>
          Need a different size or colour? Email us and we will arrange an exchange, subject to stock
          availability. If the item you want is not available, we will refund you instead.
        </p>

        <h2>Damaged or incorrect items</h2>
        <p>
          If your item arrives damaged, or you received the wrong product, email us with your order number
          and clear photographs within 48 hours of delivery. We will cover the return shipping and send a
          replacement or a full refund.
        </p>

        <h2>Contact</h2>
        <p>
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> · WhatsApp{' '}
          <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a> · {brand.contact.address.full},{' '}
          {brand.contact.address.country}
        </p>
        <p>
          See also our <Link href="/legal/terms">Terms of Service</Link> and{' '}
          <Link href="/legal/shipping">Shipping Policy</Link>.
        </p>
      </main>
    </>
  );
}
