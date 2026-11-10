// The actions the cash-flow agent may propose, shared by the browser (the approval queue) and the
// server (app/api/paypal/actions). The agent only ever proposes; a person approves each one.

export const ACTION_TYPES = ['remind', 'send', 'cancel'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_LABEL: Record<ActionType, string> = {
  remind: 'Send reminder',
  send: 'Send invoice',
  cancel: 'Cancel invoice',
};

/** What the server needs to carry out one action. */
export type ActionRequest = {
  type: ActionType;
  invoiceId: string;
  /** Subject line of the email PayPal sends to the customer. */
  subject: string;
  /** Body of that email. */
  note: string;
};

export const MAX_SUBJECT = 200;
export const MAX_NOTE = 2000;
