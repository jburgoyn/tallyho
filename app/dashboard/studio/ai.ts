// The dashboard's AI: AG Studio's five built-in agents plus one of our own, the cash-flow agent,
// which fronts every conversation. It reads the PayPal data through Studio's query tools, hands
// dashboard-building to Studio's lead agent, and proposes PayPal actions for a person to approve.
//
// The adapter calls `${endpoint}/responses`, i.e. this app's proxy at app/api/ai/responses, which
// holds the model key, so nothing secret is sent from the browser.

import {
  createAiHarness,
  directLlmRunner,
  type AgAiHarnessSetup,
  type AgAiPromptStarter,
  type AgAiTool,
  type AgBaseAiToolDisplay,
  type AgBuiltInAgentId,
  type AgStudioApi,
} from 'ag-studio';
import type { DashboardData } from '@/lib/dashboard-data';
import { ACTION_LABEL, ACTION_TYPES, MAX_NOTE, MAX_SUBJECT, type ActionType } from '@/lib/actions';
import { propose } from '../actions-store';
import { ACTION_QUEUE_WIDGET } from './action-queue-widget';
import { openaiAdapter } from './openai-adapter';

const CASHFLOW_AGENT = 'cashflow';
const PROPOSE_TOOL = 'propose_invoice_actions';
const CREATE_PAGE_TOOL = 'create_page';

/** What the agent can ask of the app around Studio. Returns undefined when the app cannot do it yet. */
export type AiHost = {
  /** Add a page with this title, select it, and return its id. */
  createPage: (title: string) => string | undefined;
};

// The dashboard registers itself here once mounted; the agent's tools look it up when they run,
// which is long after the harness was built.
let host: AiHost | undefined;
export function registerAiHost(next: AiHost) {
  host = next;
  return () => {
    if (host === next) host = undefined;
  };
}

// How our tool's calls read in the chat transcript; without this the row shows the raw tool name.
export const AI_TOOL_DISPLAY: Record<string, AgBaseAiToolDisplay> = {
  [CREATE_PAGE_TOOL]: {
    label: ({ args }) => ({
      text: 'Created a page',
      ...(typeof args.title === 'string' && { pill: args.title }),
    }),
  },
  [PROPOSE_TOOL]: {
    label: ({ args, result }) => {
      const count = Array.isArray(args.actions) ? args.actions.length : 0;
      return {
        text: result?.success === false ? 'Proposal rejected, correcting it' : 'Queued actions for your approval',
        ...(count > 0 && { pill: `${count} ${count === 1 ? 'action' : 'actions'}` }),
      };
    },
  },
};
const BUILT_IN: AgBuiltInAgentId[] = ['lead', 'data', 'page', 'planning', 'widget'];

// Suggestions shown in a new AI conversation, before anything has been typed.
const PROMPT_STARTERS: AgAiPromptStarter[] = [
  {
    label: 'Chase overdue invoices',
    prompt:
      'Find every overdue invoice, work out who is worth chasing first, and propose a reminder for each with a message that fits how late it is.',
  },
  {
    label: 'Where is my cash stuck?',
    prompt: 'Where is my money stuck right now? Give me the three biggest problems and what you would do about each.',
  },
  {
    label: 'Build a collections page',
    prompt:
      'Build a new page for collections: overdue amount by customer, aging by bucket, and the action queue alongside.',
  },
];

const INSTRUCTIONS = `You are the cash-flow agent for a merchant who gets paid through PayPal invoices and subscriptions.
Your job is to find money that is stuck and get it moving.

How you work:
- Read before you speak. Use view_schema and execute_query to get real figures; never estimate or invent an invoice.
- Invoices are in several currencies and are not converted. Never add amounts across currencies; report each currency separately.
- To build or change charts, grids or filters, delegate to the lead agent with delegate_to and tell it exactly what you want and on which page. Do not describe a dashboard you have not built.
- The lead agent cannot add pages. When the merchant asks for a new page, call ${CREATE_PAGE_TOOL} first; it creates the page and selects it. Then delegate, telling the lead agent to build on the selected page and to leave other pages alone.
- When you report back, say which page was changed. If the lead agent built somewhere other than where the merchant asked, say so.
- To act on PayPal, call ${PROPOSE_TOOL}. It does not send anything: it places each action in the approval queue, where the merchant reads, edits and approves it. Say so plainly, and never claim an email was sent.
- Before proposing, make sure the current page has an "${ACTION_QUEUE_WIDGET}" widget (view_page); add one with add_widget if it is missing, so the merchant can see the queue.

Writing reminders:
- Write as the merchant, to the customer, by name. Plain, warm and specific: invoice number, amount, due date, days late.
- Match the tone to the lateness. A few days late is a nudge. Over 30 days is direct and asks for a payment date. Over 60 days is firm and asks for a reply this week. Never threaten.
- One proposal per invoice. If a customer has several overdue invoices, mention the others in the message.

Which action:
- remind: a sent invoice that is unpaid or partially paid.
- send: a draft invoice that should have gone out.
- cancel: only when the merchant asks for it, or an open invoice is clearly a duplicate. Explain why in the reason.

Finish with a short summary: what you found, what you proposed, and what the merchant should look at first.`;

type InvoiceRow = DashboardData['invoices'][number];

// Which invoices each action may be proposed for; anything else is rejected back to the model.
const ALLOWED: Record<ActionType, (invoice: InvoiceRow) => string | undefined> = {
  remind: (i) => (i.isReceivable ? undefined : `is ${i.status.toLowerCase()}, so there is nothing to remind about`),
  send: (i) => (i.statusGroup === 'Draft' ? undefined : `is ${i.status.toLowerCase()}, not a draft`),
  cancel: (i) => (i.isReceivable ? undefined : `is ${i.status.toLowerCase()}, so it cannot be cancelled`),
};

function createPageTool(api: AgStudioApi): AgAiTool {
  return api.defineAiTool({
    name: CREATE_PAGE_TOOL,
    description:
      'Add a new, empty page to the report and select it, so that widgets added next land on it. ' +
      'Use this when the merchant asks for a new page; the lead agent cannot create pages itself.',
    params: (s) => s.object({ title: s.string({ description: 'Short page title shown in the sidebar, e.g. "Collections".' }) }),
    execute: ({ title }, ctx) => {
      const name = title.trim().slice(0, 40);
      if (!name) return ctx.error('title must not be empty.');
      const pageId = host?.createPage(name);
      if (!pageId) return ctx.error('The page could not be created. Build on the current page instead and say so.');
      return ctx.success(`Created the empty page "${name}" (id ${pageId}) and selected it. It is now the current page.`, { pageId });
    },
  });
}

function proposeTool(api: AgStudioApi, data: DashboardData): AgAiTool {
  const invoices = new Map(data.invoices.map((i) => [i.id, i]));
  const customers = new Map(data.customers.map((c) => [c.id, c]));

  return api.defineAiTool({
    name: PROPOSE_TOOL,
    description:
      'Propose PayPal invoice actions for the merchant to approve. Nothing is sent: each action is added to the ' +
      'approval queue widget, where the merchant can edit the message, approve or dismiss it. ' +
      'Use the Invoice ID field (invoices.id) from execute_query, not the invoice number.',
    params: (s) =>
      s.object({
        actions: s.array(
          s.object({
            type: s.enum(ACTION_TYPES, {
              description: 'remind: unpaid sent invoice. send: draft invoice. cancel: open invoice to withdraw.',
            }),
            invoiceId: s.string({ description: 'invoices.id of the invoice to act on.' }),
            subject: s.string({ description: `Subject of the email PayPal sends the customer. Max ${MAX_SUBJECT} characters.` }),
            note: s.string({ description: `Body of that email, written as the merchant. Max ${MAX_NOTE} characters.` }),
            reason: s.string({ description: 'One short phrase for the merchant on why, e.g. "42 days overdue, second-largest balance".' }),
          }),
        ),
      }),
    execute: ({ actions }, ctx) => {
      const problems: string[] = [];
      const valid = actions.flatMap((action, index) => {
        const invoice = invoices.get(action.invoiceId);
        const where = `actions[${index}]`;
        if (!invoice) {
          problems.push(`${where}: no invoice has id "${action.invoiceId}". Query invoices.id and use that value.`);
          return [];
        }
        const refusal = ALLOWED[action.type](invoice);
        if (refusal) {
          problems.push(`${where}: invoice ${invoice.number} ${refusal}.`);
          return [];
        }
        if (!action.subject.trim() || action.subject.length > MAX_SUBJECT) {
          problems.push(`${where}: subject must be 1-${MAX_SUBJECT} characters.`);
          return [];
        }
        if (!action.note.trim() || action.note.length > MAX_NOTE) {
          problems.push(`${where}: note must be 1-${MAX_NOTE} characters.`);
          return [];
        }
        // Everything the approver sees about the invoice comes from PayPal's data, not the model.
        return [
          {
            type: action.type,
            invoiceId: invoice.id,
            subject: action.subject.trim(),
            note: action.note.trim(),
            reason: action.reason.trim(),
            invoiceNumber: invoice.number,
            customer: customers.get(invoice.customerId)?.name ?? invoice.customerId,
            amount: action.type === 'send' ? invoice.total : invoice.outstanding,
            currency: invoice.currency,
          },
        ];
      });

      // All or nothing, so the model can correct the list and resubmit without duplicating the rest.
      if (problems.length > 0) return ctx.error(problems);
      if (valid.length === 0) return ctx.error('actions is empty: propose at least one action.');

      const queued = propose(valid);
      return ctx.success(
        `${queued.length} action(s) are now in the approval queue, awaiting the merchant. Nothing has been sent to PayPal yet.`,
        queued.map((a) => ({ action: ACTION_LABEL[a.type], invoice: a.invoiceNumber, customer: a.customer })),
      );
    },
  });
}

// `models` are the ids allowed by OPENAI_MODELS on the server; the first is the default, and the
// picker only shows for two or more.
export function buildAi(models: string[], data: DashboardData): AgAiHarnessSetup {
  const adapter = openaiAdapter({ endpoint: '/api/ai', model: models[0] });

  return ({ api }) => {
    const proposeActions = proposeTool(api, data);
    const createPage = createPageTool(api);

    return createAiHarness(api, ({ tools, builtIn }) => ({
      agents: [
        directLlmRunner({
          id: CASHFLOW_AGENT,
          name: 'Cash-flow agent',
          description:
            'Finds stuck money in the PayPal data and proposes invoice reminders, sends and cancellations for approval.',
          adapter,
          instructions: () => INSTRUCTIONS,
          // Listed per run: Studio's tools read live dashboard state, and delegate_to resolves its targets lazily.
          tools: () => [
            tools.studio.viewSchema(),
            tools.studio.executeQuery(),
            tools.studio.viewPage(),
            tools.studio.addWidget(),
            proposeActions,
            createPage,
            tools.delegateTo(['lead']),
            tools.renameThread(),
          ],
          maxTurns: 40,
        }),
        // AG's own agents, unchanged, on the same model. The lead builds dashboards when ours asks.
        ...BUILT_IN.map((id) => directLlmRunner({ ...builtIn[id], adapter })),
      ],
      primary: CASHFLOW_AGENT,
      promptStarters: PROMPT_STARTERS,
      models: models.length > 1 ? models.map((id) => ({ id, label: id })) : undefined,
    }));
  };
}
