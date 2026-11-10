// Seeds the PayPal SANDBOX account with sample invoices, so the dashboard and the cash-flow agent
// have something to work on: a spread of overdue, current and draft invoices across a few customers.
//
//   npm run seed            create the invoices
//   npm run seed -- --dry   print what would be created, calling nothing
//
// Reads PAYPAL_CLIENT_ID and PAYPAL_SECRET from .env.local. Only ever talks to the sandbox host.
// Running it twice adds a second set; it never deletes or changes existing invoices.

const BASE_URL = 'https://api-m.sandbox.paypal.com';
const DAY_MS = 86_400_000;
const dry = process.argv.includes('--dry');

const day = (offset) => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);

const CUSTOMERS = {
  harbor: { given: 'Maya', surname: 'Okafor', business: 'Harbor & Pine Studio', email: 'maya@harborpine.example' },
  northwind: { given: 'Daniel', surname: 'Reyes', business: 'Northwind Cycles', email: 'accounts@northwindcycles.example' },
  lumen: { given: 'Priya', surname: 'Nair', business: 'Lumen Labs', email: 'priya.nair@lumenlabs.example' },
  fern: { given: 'Tom', surname: 'Whitaker', business: 'Fern Street Bakery', email: 'tom@fernstreet.example' },
  atlas: { given: 'Sofia', surname: 'Lindqvist', business: 'Atlas Freight Co', email: 'ap@atlasfreight.example' },
  solo: { given: 'Jordan', surname: 'Blake', business: undefined, email: 'jordan.blake@mailbox.example' },
};

// dueIn: days from today the invoice falls due (negative = already overdue). Invoices are issued 30
// days before they fall due. `send: false` leaves the invoice as a draft.
const INVOICES = [
  { customer: 'atlas', item: 'Brand refresh, phase 2', amount: 8400, dueIn: -74 },
  { customer: 'atlas', item: 'Website maintenance, Q3', amount: 1800, dueIn: -41 },
  { customer: 'northwind', item: 'Product photography', amount: 3250, dueIn: -38 },
  { customer: 'lumen', item: 'UX audit', amount: 5600, dueIn: -19 },
  { customer: 'harbor', item: 'Logo and identity', amount: 2400, dueIn: -9 },
  { customer: 'fern', item: 'Menu design', amount: 640, dueIn: -4 },
  { customer: 'solo', item: 'Portfolio site', amount: 1150, dueIn: -2 },
  { customer: 'lumen', item: 'Design system retainer, November', amount: 4200, dueIn: 12 },
  { customer: 'northwind', item: 'Campaign landing page', amount: 2900, dueIn: 21 },
  { customer: 'harbor', item: 'Packaging concepts', amount: 1750, dueIn: 26 },
  { customer: 'fern', item: 'Seasonal signage', amount: 480, dueIn: 30, send: false },
  { customer: 'atlas', item: 'Website maintenance, Q4', amount: 1800, dueIn: 30, send: false },
];

async function accessToken() {
  const { PAYPAL_CLIENT_ID: id, PAYPAL_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set in .env.local');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

async function post(token, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Return the created invoice, not just a link to it.
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} failed (${res.status}): ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : undefined;
}

const run = Date.now().toString(36).toUpperCase();

function draftOf(spec, index) {
  const c = CUSTOMERS[spec.customer];
  return {
    detail: {
      invoice_number: `CF-${run}-${String(index + 1).padStart(2, '0')}`,
      currency_code: 'USD',
      invoice_date: day(spec.dueIn - 30),
      payment_term: { term_type: 'DUE_ON_DATE_SPECIFIED', due_date: day(spec.dueIn) },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { given_name: c.given, surname: c.surname },
          ...(c.business && { business_name: c.business }),
          email_address: c.email,
        },
      },
    ],
    items: [{ name: spec.item, quantity: '1', unit_amount: { currency_code: 'USD', value: spec.amount.toFixed(2) } }],
  };
}

if (dry) {
  INVOICES.forEach((spec, i) => {
    const d = draftOf(spec, i).detail;
    console.log(
      `${d.invoice_number}  ${CUSTOMERS[spec.customer].email.padEnd(36)} $${String(spec.amount).padStart(5)}  due ${d.payment_term.due_date}  ${spec.send === false ? 'draft' : 'sent'}`,
    );
  });
  process.exit(0);
}

const token = await accessToken();
let failed = 0;
for (const [index, spec] of INVOICES.entries()) {
  const body = draftOf(spec, index);
  try {
    const invoice = await post(token, '/v2/invoicing/invoices', body);
    if (spec.send !== false) {
      // Marks the invoice as sent without emailing anyone: the recipients are made-up addresses.
      await post(token, `/v2/invoicing/invoices/${invoice.id}/send`, {
        send_to_invoicer: false,
        send_to_recipient: false,
      });
    }
    console.log(`created ${body.detail.invoice_number} (${spec.send === false ? 'draft' : 'sent'})`);
  } catch (e) {
    failed++;
    console.error(`FAILED ${body.detail.invoice_number}: ${e.message}`);
  }
}
console.log(`\n${INVOICES.length - failed} of ${INVOICES.length} invoices created.`);
process.exit(failed ? 1 : 0);
