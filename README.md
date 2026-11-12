# Tallyho

The cash-flow agent that chases what you are owed: an AI agent that finds money stuck in a PayPal account and
gets it moving, with a person approving every action. Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com) on PayPal's
REST APIs and AG Studio's agent framework.

Small merchants and freelancers lose hours chasing late invoices, and often don't chase at all. Tallyho's
agent reads the account's invoices, works out who is worth chasing first, drafts a message
that fits how late each invoice is, and queues the actions. Nothing reaches PayPal until the merchant
clicks Approve.

## What it does

- **Opens with a briefing.** The dashboard leads with what matters today: how much is overdue, who
  owes it, what never went out, and one-click requests to the agent.
- **Finds the problem.** Ask "where is my cash stuck?" and the agent queries live PayPal data for
  overdue invoices, aging and unsent drafts, and reports each currency separately.
- **Proposes actions.** Reminders for overdue invoices, sends for forgotten drafts, cancellations on
  request, and recording payments that arrived outside PayPal. Each proposal carries the drafted
  email, a tone (nudge, direct or firm) and the reason for it.
- **Closes the loop.** When an approved action lands, the dashboard reloads from PayPal, so the
  overdue total, the charts and the briefing move straight away.
- **Waits for approval.** Proposals land in an action queue on the dashboard, where the merchant can
  edit the message, approve or dismiss each one. Approve calls PayPal's Invoicing API.
- **Builds its own dashboard.** Ask for a collections page and the agent creates the page, then hands
  the charts and grids to AG Studio's built-in agents.

## How PayPal and AI are used

| Piece | Where | What it does |
| --- | --- | --- |
| PayPal Invoicing API | `lib/paypal.ts` | Reads invoices; sends reminders, sends drafts, cancels invoices and records payments |
| PayPal Catalog and Subscriptions APIs | `lib/paypal.ts` | Reads products and billing plans for the dashboard |
| PayPal Transaction Search and Balances | `lib/paypal.ts` | Optional; feeds the Cash & payouts page |
| AG Studio | `app/dashboard/` | The dashboard: grids, charts, filters, saved reports |
| AG Studio Agent Framework | `app/dashboard/studio/ai.ts` | Our custom agent, running alongside Studio's five built-in agents |
| Custom AG Studio widgets | `app/dashboard/studio/action-queue-widget.tsx`, `briefing-widget.tsx` | The approval queue, and the briefing whose buttons start the agent |
| OpenAI Responses API | `app/api/ai/responses/route.ts` | The model behind every agent, called through a server-side proxy |

### The agent

The cash-flow agent is a custom agent registered with AG Studio's harness as the one every
conversation starts with. It has four kinds of tool:

- Studio's own read tools (`view_schema`, `execute_query`, `view_page`) to get real figures.
- `delegate_to`, to hand dashboard-building to Studio's lead agent.
- `create_page`, our tool, because Studio leaves pages to the host app and its agents cannot add one.
- `propose_invoice_actions`, our tool, which queues actions for approval.

### Guard rails

- The agent has no tool that calls PayPal. It can only propose; `app/api/paypal/actions` runs when a
  person clicks Approve.
- Every proposal is checked against the real invoice list. An invented invoice id, a reminder for a
  paid invoice or a send for a non-draft is rejected back to the model to correct.
- The customer, invoice number and amount shown to the approver come from PayPal's data, not from
  the model's output.
- `lib/paypal.ts` only talks to the PayPal sandbox host.

## Run it locally

Requires Node.js 20.9 or later, a PayPal sandbox REST app
([developer.paypal.com](https://developer.paypal.com)), an AG Studio trial licence and an OpenAI API key.

```bash
npm install
cp env.example .env.local   # then fill in the values
npm run seed                # optional: creates 12 sample invoices in the sandbox
npm run dev
```

Open http://localhost:3000/dashboard and click **Chase overdue invoices** in the briefing, or
**Ask the agent** to open the AI Assistant.

`.env.local` is git-ignored, so credentials stay out of the repo.

| Variable | Needed | Purpose |
| --- | --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | Yes | Sandbox REST app credentials |
| `AG_STUDIO` | Yes | AG Studio licence key (a free trial key works) |
| `AG_STUDIO_OPENAI_API_KEY` | Yes | OpenAI key for the agents; `OPENAI_API_KEY` is used if this is unset |
| `OPENAI_MODELS` | No | Comma-separated model ids; the first is the default |
| `DEMO_PASSWORD` | Hosted only | Gates every page and API route behind HTTP Basic auth |

Notes:

- `npm run seed` only writes to the sandbox, marks invoices as sent without emailing anyone, and
  adds a new set each time it runs. `npm run seed -- --dry` prints what it would create.
- The Cash & payouts page needs the REST app's **Transaction search** feature. Without it the app
  still runs; that page is empty.
- Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Deploy

`render.yaml` describes a Render web service. Create a Blueprint from the repo, fill in the
environment variables above, and set `DEMO_PASSWORD`.

Set `DEMO_PASSWORD` on any public deployment. The API routes spend your model key and act on your
PayPal sandbox, and `proxy.ts` is the only thing standing in front of them.

## Layout

```
lib/paypal.ts                                  Every PayPal call, reads and writes
lib/dashboard-data.ts                          PayPal responses -> the dashboard's related tables
lib/actions.ts                                 Action types shared by browser and server
app/api/paypal/actions/route.ts                Runs one approved action against PayPal
app/api/ai/responses/route.ts                  Server-side proxy to the model
app/dashboard/studio/ai.ts                     The cash-flow agent and its tools
app/dashboard/studio/action-queue-widget.tsx   The approval queue widget
app/dashboard/studio/briefing-widget.tsx       The briefing widget
app/dashboard/facts-store.ts                   Latest PayPal data, for the agent's tools and the briefing
app/dashboard/actions-store.ts                 The queue's state, kept in localStorage
app/dashboard/studio/                          AG Studio data sources, theme and default report
app/page.tsx                                   Landing page
app/components/brand.tsx                       Product name and logo, in one place
app/globals.css                                Colour palette and fonts for the shell, AG Studio and AG Grid
app/(endpoints)/                               One AG Grid page per PayPal endpoint
scripts/seed-invoices.mjs                      Sample sandbox invoices
proxy.ts                                       Access gate for hosted demos
```

## Credits

Built on PayPal's
[hackathon-paypal-ag-grid-boilerplate](https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate),
which provided the PayPal REST client, the endpoint pages and the AG Studio dashboard shell. The
cash-flow agent, its tools, the approval queue, the invoice actions, the seed script and the access
gate were added for this hackathon.

## Licence

MIT. See [LICENSE](LICENSE).
