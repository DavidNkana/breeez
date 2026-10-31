/**
 * LEGAL + REGULATORY FACTS
 *
 * Every legal/regulatory statement shown on the site comes from here, so the
 * policy pages can never drift apart from each other.
 *
 * IMPORTANT: the registration details below are deliberately left blank until
 * they are filled in with the real values. A policy that states a wrong
 * company registration number, VAT number or Information Officer is worse
 * than one that omits it, so empty fields are NOT rendered on the site.
 * Fill them in here and redeploy — the pages pick them up automatically.
 */
import { brand } from './brand';
import { RETURN_WINDOW_DAYS } from './returns/policy';

export const legal = {
  /** The registered legal entity that contracts with the customer. */
  entityName: 'Evasale (Pty) Ltd',

  /** The trading name customers see on the storefront and on receipts. */
  tradingName: brand.name,

  website: 'https://www.evasale.co.za',
  websiteDisplay: 'www.evasale.co.za',

  /**
   * VAT number (VAT Act 89 of 1991). Blank until confirmed.
   * Rendered only when set.
   */
  vatNumber: '',

  /**
   * CIPC company registration number. Blank until confirmed.
   * Rendered only when set.
   */
  registrationNumber: '',

  /**
   * POPIA Information Officer (Protection of Personal Information Act 4 of
   * 2013, section 55). Blank until confirmed — enquiries are directed to the
   * general support address in the meantime.
   */
  informationOfficer: '',

  /** Date the current version of the policies took effect. */
  lastUpdated: '1 November 2026',

  /** Return window in days — single source of truth, shared with the returns page. */
  returnWindowDays: RETURN_WINDOW_DAYS,
} as const;

/** The delivery facts shown in both the shipping policy and the terms. */
export const shippingFacts = {
  carrier: 'The Courier Guy',
  service: 'Door delivery',
  flatRateZar: 89,
  etaWorkingDays: '2–5',
  dispatchDays: '1 business day',
} as const;

/** The payment facts shown in the terms and the checkout. */
export const paymentFacts = {
  primary: 'PayFast',
  secondary: 'PayJustNow',
  methods: 'credit and debit cards, Instant EFT, SnapScan, Zapper and other payment methods enabled on our PayFast account',
  currency: 'ZAR',
} as const;

/** The laws that apply to this store. */
export const applicableLaws = [
  {
    name: 'Consumer Protection Act 68 of 2008',
    short: 'Consumer Protection Act',
    note: 'Sets the minimum standards we must meet for fair terms, marketing, pricing, delivery and returns, and gives you the right to claim for defective goods even after our returns window has closed.',
  },
  {
    name: 'Protection of Personal Information Act 4 of 2013',
    short: 'POPIA',
    note: 'Governs how we collect, use, store and protect your personal information, and gives you the right to access, correct or delete it.',
  },
  {
    name: 'Electronic Communications and Transactions Act 25 of 2006',
    short: 'ECTA',
    note: 'Governs electronic transactions, including placing an order and paying for it online.',
  },
  {
    name: 'Value-Added Tax Act 89 of 1991',
    short: 'VAT Act',
    note: 'All our displayed prices are in South African Rand and include VAT where applicable.',
  },
] as const;
