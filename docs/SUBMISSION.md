# Devpost submission draft

Working text for the PayPal AI Hackathon submission form. Edit freely; nothing here is submitted
until you paste it in.

## Project name

Tallyho

## Tagline

An AI agent that chases your late PayPal invoices, and never sends a thing without your say-so.

## Inspiration

Freelancers and small merchants are owed money they never chase. Writing the fourth "just following
up" email is awkward, so it doesn't get written, and a 10-day-late invoice becomes a 70-day-late one.
The information needed to fix this is already sitting in PayPal. What's missing is someone to read
it, decide who to chase first, and write the email.

## What it does

Tallyho is a cash-flow agent that sits inside a PayPal dashboard. You ask it where your money is stuck. It queries
your live invoices, ranks what is overdue, and drafts a reminder for each one in a tone that matches
how late it is: a nudge at five days, a request for a payment date at thirty, a firm ask for a reply
at sixty.

Every proposal lands in an approval queue on the dashboard. You can edit the message, dismiss it, or
approve it. Only an approval calls PayPal. The agent has no way to send anything on its own.

It also handles drafts that never went out, cancels invoices on request, and builds its own
dashboard pages: ask for a collections view and it creates the page and fills it with charts.

## How we built it

- **PayPal:** the Invoicing API for reading invoices and for the three actions (remind, send,
  cancel), plus Catalog, Subscriptions, Transaction Search and Balances for the dashboard. Everything
  runs against the sandbox.
- **AG Studio:** the dashboard itself, and the Studio Agent Framework. The cash-flow agent is a
  custom agent registered as the primary agent, alongside Studio's five built-in ones. It reads data
  with Studio's query tools and delegates chart and layout work to Studio's lead agent.
- **Custom tools:** `propose_invoice_actions` queues actions for approval, and `create_page` adds a
  page, which Studio's own agents cannot do because pages belong to the host app.
- **Custom widgets:** the approval queue and the briefing banner are custom AG Studio widgets, so
  they live on the dashboard like any chart, the agent can place them on pages it builds, and the
  briefing's buttons start the agent directly.
- **Theming:** one set of design tokens drives the app shell, AG Studio and AG Grid, so the whole
  product carries its own palette and typeface.
- **Model:** OpenAI's Responses API, called through a server-side proxy so the key never reaches the
  browser.
- **Stack:** Next.js, React, TypeScript, Tailwind. Started from PayPal's AG Grid hackathon boilerplate.

## Challenges

- **Keeping the agent honest.** An agent that drafts emails about money must not invent an invoice.
  Every proposal is validated against the real invoice list, and the amounts and names the approver
  sees are taken from PayPal's data, not from the model's text.
- **Agents that can't add pages.** The first time we asked for a new page, the charts quietly landed
  on an existing one. Studio leaves pages to the host, so we gave our agent a tool that asks the app
  to create one, and told it to say which page it changed.
- **Multiple currencies.** Invoices are not converted, so the agent is instructed never to add
  amounts across currencies, and the charts it builds group by currency.

## What we learned

A human-approval step changes what an agent is useful for. Because nothing sends without a click,
the agent can be direct and specific, and the merchant can trust the queue instead of auditing a chat.

## What's next

- Refunds and subscription recovery (failed renewals) alongside invoices.
- Scheduled runs that fill the queue each morning.
- Learning from edits: when the merchant rewrites a reminder, use that voice next time.

## Built with

PayPal Invoicing API, PayPal REST APIs, AG Studio, AG Studio Agent Framework, AG Grid, OpenAI
Responses API, Next.js, React, TypeScript, Tailwind CSS, Render

## Tools and how they were used (required field)

- **OpenAI (Responses API):** the model behind the cash-flow agent and AG Studio's built-in agents.
- **AG Studio Agent Framework:** agent loop, tool execution and delegation between agents.
- **PayPal REST APIs (sandbox):** all data and all actions.
- **Claude Code:** used during development to write and test the code.

## Testing instructions for judges

- Hosted demo: `<URL>`. The browser will ask for a username and password: any username, password
  `<DEMO_PASSWORD>`.
- Open **Dashboard**. In the briefing at the top, click **Chase overdue invoices**. The AI Assistant
  opens and the queue beside it fills; approve one.
- Tell the agent a customer paid by bank transfer, approve the recorded payment, and watch the
  overdue total drop.
- Click **Build a collections page** to see the agent create a page and delegate the charts.
- To run locally instead, follow the README.

## Demo video script (under 3 minutes)

| Time | On screen | Say |
| --- | --- | --- |
| 0:00 | Receivables page, overdue KPI | "This merchant is owed twenty-three thousand dollars in overdue invoices. Most small businesses never chase money like this, because chasing is awkward." |
| 0:15 | Click Edit, AI Assistant opens | "This is the cash-flow agent. It lives in a PayPal dashboard built with AG Studio." |
| 0:25 | Click "Chase overdue invoices"; steps appear | "It reads the live PayPal invoices, works out who to chase first, and drafts a reminder for each." |
| 0:50 | Scroll the action queue | "Nothing has been sent. Each proposal sits in this queue with its reason. Note the tone: a nudge for the four-day-late invoice, a firm request for the seventy-four-day one." |
| 1:15 | Click Edit on a card, change a line, Save, Approve | "I can edit any message. When I approve, and only then, the app calls PayPal's Invoicing API." |
| 1:35 | Card shows Done | "Sent." |
| 1:40 | Type "I have drafts that never went out" | "It handles other stuck money too: here, two invoices that were written and never sent." |
| 2:00 | Click "Build a collections page"; new page appears | "It also builds its own dashboard. Our agent creates the page, then delegates the charts to AG Studio's built-in agents." |
| 2:30 | Collections page with queue | "Under the hood: a custom agent and a custom widget in AG Studio's agent framework, PayPal's REST APIs, and a rule that the agent can only propose. A person approves every action." |
| 2:50 | Landing page, then repo URL | "Tallyho. Thanks for watching." |

Reminders for the recording:

- Reset the demo report and rerun `npm run seed` beforehand so the queue starts empty.
- No third-party music or logos beyond the app's own UI.
- Upload to YouTube as public and keep it under three minutes.
