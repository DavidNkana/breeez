import { brand } from '@/lib/brand';
import { legal, shippingFacts } from '@/lib/legal';

export const metadata = { title: 'Shipping Policy — Evasale' };

export default function ShippingPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Shipping Policy</h1>
        <p className="text-sm text-brand-500">Last updated: {legal.lastUpdated}</p>

        <h2>General information</h2>
        <p>
          All orders are subject to product availability. If an item is not in stock at the time you place
          your order, we will let you know and refund the affected amount to your original payment method.
        </p>

        <h2>Delivery area</h2>
        <p>
          We deliver to physical addresses within South Africa only. We do not currently ship
          internationally.
        </p>
        <p>
          Our physical address is {brand.contact.address.full}, {brand.contact.address.country}. Deliveries
          are made by {shippingFacts.carrier} to the address you enter at checkout — we do not ship to
          post boxes, and we cannot redirect a parcel once it has been collected.
        </p>

        <h2>Delivery option</h2>
        <p>
          We offer one delivery option: <strong>{shippingFacts.service} with {shippingFacts.carrier}</strong>,
          at a flat rate of <strong>R{shippingFacts.flatRateZar}</strong> to anywhere in South Africa. The
          exact price for your order is shown at checkout before you pay.
        </p>
        <p>
          The delivery price shown at checkout is our current charge for door delivery. It is not a live
          courier quotation, and additional charges may apply for remote areas, large or heavy items — if
          that applies, it is shown to you before you pay.
        </p>

        <h2>Delivery times</h2>
        <p>
          Estimated delivery time is <strong>{shippingFacts.etaWorkingDays} working days</strong> once your
          order has been dispatched. Delivery times are estimates and begin on the date the parcel is
          handed to {shippingFacts.carrier}, not the date you placed the order. Working days are Monday
          to Friday, excluding public holidays.
        </p>
        <p>
          Unless there are exceptional circumstances, we make every effort to dispatch within{' '}
          {shippingFacts.dispatchDays} of the order being paid for. We do not dispatch on weekends.
        </p>
        <p>
          The actual delivery date may vary depending on courier routing, the delivery address and the
          items ordered. Products may be delivered in separate parcels, in which case each parcel has its
          own delivery time.
        </p>

        <h2>Delivery instructions</h2>
        <p>
          You can add delivery instructions, such as a preferred delivery time or a safe place, in the
          delivery notes field at checkout. Please note that the courier may not be able to follow
          instructions that require entry to a locked property, and that we cannot guarantee a specific
          delivery date.
        </p>

        <h2>Tracking</h2>
        <p>
          We share dispatch information with you as soon as the parcel is collected. Live courier tracking
          is not currently available from within your Evasale account, so please keep the confirmation
          email we send when your order is dispatched.
        </p>

        <h2>Delayed or lost parcels</h2>
        <p>
          If your order has not arrived within 7 days of the estimated delivery time, email us at{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> with your order number and we
          will investigate with the courier.
        </p>

        <h2>Damaged items in transit</h2>
        <p>
          If there is any damage to the packaging on delivery, please photograph it before opening the
          parcel and contact us immediately at{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>, or WhatsApp us on{' '}
          <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a>. We will arrange a
          replacement or a refund.
        </p>

        <h2>Questions</h2>
        <p>
          If you have any questions about delivery or your order, email{' '}
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> or WhatsApp us on{' '}
          <a href={`tel:${brand.contact.phoneLink}`}>{brand.contact.phone}</a> and quote your order
          number.
        </p>
      </main>
    </>
  );
}
