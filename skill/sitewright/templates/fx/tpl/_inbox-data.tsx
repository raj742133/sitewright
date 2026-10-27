// Fictional conversations for "Quillbase" (invoicing + time tracking). Reference moment: Sat 24 Oct 2026, 10:42 UTC. `ago` is minutes before that.
import type { Conv, Customer, Msg } from './_inbox';

const thread = (id: string, who: string) => {
  let n = 0;
  const m = (kind: Msg['kind'], by: string, ago: number, text: string, delivery?: Msg['delivery']): Msg => ({ id: `${id}-${++n}`, kind, who: by, ago, text, delivery });
  return {
    c: (ago: number, text: string) => m('customer', who, ago, text),
    a: (by: string, ago: number, text: string, delivery: Msg['delivery'] = 'seen') => m('agent', by, ago, text, delivery),
    n: (by: string, ago: number, text: string) => m('note', by, ago, text),
    e: (by: string, ago: number, text: string) => m('event', by, ago, text),
  };
};
const cust = (c: Customer) => c;

const t1 = thread('c1', 'Maya Okafor');
const t2 = thread('c2', 'Tomás Herrera');
const t3 = thread('c3', 'Aisha Rahman');
const t4 = thread('c4', 'Jonas Weber');
const t5 = thread('c5', 'Priyanka Desai');
const t6 = thread('c6', 'Elliot Brandt');
const t7 = thread('c7', 'Sofia Marchetti');
const t8 = thread('c8', 'Grace Liu');
const t9 = thread('c9', 'Noah Fitzgerald');
const t10 = thread('c10', 'Camille Dubois');
const t11 = thread('c11', 'Rahul Mehta');
const t12 = thread('c12', 'Hannah Kowalski');
const t13 = thread('c13', 'Diego Alvarez');
const t14 = thread('c14', 'Lena Sørensen');

export const CONVERSATIONS: Conv[] = [
  {
    id: 'c1', num: 4821, subject: 'Charged twice for October', channel: 'email', priority: 'urgent', status: 'open', assignee: 'Dana Ortiz', unread: true, slaLeft: 22,
    msgs: [
      t1.c(98, 'Hi, I just noticed we were charged twice for October: two $480.00 charges on 3 Oct, about two minutes apart. Our accountant is asking about it and I can’t find a second invoice in the list. Can you look into it today please?'),
      t1.n('Marcus Lee', 62, 'Checked Stripe: two successful charges of $480.00 on 3 Oct (08:02 and 08:04). The second is a retry after her card update, the webhook fired late. The duplicate is real. Refunds over $250 need Dana’s sign-off.'),
      t1.c(18, 'Following up with the card statement. Both lines show as QUILLBASE*BUSINESS. Sorry to chase, but month-end close is Monday.'),
    ],
    cust: cust({ name: 'Maya Okafor', email: 'maya@brightsidedental.example', company: 'Brightside Dental', plan: 'Business', mrr: 480, location: 'Chicago, US', tz: -5, since: 'Mar 2024', tags: ['billing', 'duplicate-charge', 'vip'], prev: [{ s: 'Add a second location to billing', d: '14 Aug', st: 'Resolved' }, { s: 'Reminder emails going to spam', d: '2 Jun', st: 'Resolved' }], csat: 0.96, ratings: 9 }),
  },
  {
    id: 'c2', num: 4819, subject: 'CSV export times out on large workspaces', channel: 'chat', priority: 'high', status: 'open', assignee: 'Priya Nair', unread: false, slaLeft: 41,
    msgs: [
      t2.c(78, 'Our CSV export of the time entries report just spins and then says “Request timed out”. Workspace has about 140k entries. This worked fine in September.'),
      t2.a('Priya Nair', 72, 'Hi Tomás, thanks for flagging. Which date range are you exporting, and does it fail every time? I’ll look at the export job on our side.'),
      t2.c(49, 'Full year 2026, fails every time (tried four times in the last half hour). Smaller ranges like one month work.'),
      t2.n('Priya Nair', 28, 'Reproduced on staging with 130k rows. The export runs inline and hits the 30s gateway limit. Filed QB-2291. The async export is behind a flag; I can enable it for this workspace as a workaround.'),
    ],
    cust: cust({ name: 'Tomás Herrera', email: 'tomas@cobaltfreight.example', company: 'Cobalt Freight', plan: 'Business', mrr: 620, location: 'São Paulo, BR', tz: -3, since: 'Jan 2025', tags: ['bug', 'exports'], prev: [{ s: 'Rounding on weekly timesheets', d: '9 Sep', st: 'Resolved' }], csat: 0.88, ratings: 5 }),
  },
  {
    id: 'c3', num: 4822, subject: 'Can’t invite a sixth teammate: “seat limit reached”', channel: 'web', priority: 'normal', status: 'open', assignee: 'Dana Ortiz', unread: true, slaLeft: 112,
    msgs: [t3.c(8, 'We upgraded to Team yesterday but I still get “Seat limit reached” when I invite our sixth designer. The billing page says 5 seats. Did the upgrade not go through, or do I have to add seats myself?')],
    cust: cust({ name: 'Aisha Rahman', email: 'aisha@lumenstudio.example', company: 'Lumen Studio', plan: 'Team', mrr: 95, location: 'Toronto, CA', tz: -4, since: 'Oct 2026', tags: ['onboarding', 'seats'], prev: [], csat: null, ratings: 0 }),
  },
  {
    id: 'c4', num: 4790, subject: 'Recurring invoices with a custom interval', channel: 'email', priority: 'low', status: 'pending', assignee: 'Marcus Lee', unread: false, slaLeft: null,
    msgs: [
      t4.c(3100, 'Recurring invoices only offer weekly, monthly, quarterly and yearly. We bill some clients every six weeks (retainer cycles). Any plans for custom intervals?'),
      t4.a('Marcus Lee', 3020, 'Hi Jonas, good question. Custom intervals are on the roadmap but not scheduled yet. I’ve added your vote with the use case. In the meantime, a duplicated invoice template plus a calendar reminder is the closest workaround. Would that cover you for now?'),
      t4.n('Marcus Lee', 3018, 'Logged under “Recurring: custom cadence” in the roadmap tracker, 14 votes now.'),
    ],
    cust: cust({ name: 'Jonas Weber', email: 'jonas@kessler-sohn.example', company: 'Kessler & Sohn', plan: 'Team', mrr: 152, location: 'Hamburg, DE', tz: 2, since: 'Nov 2023', tags: ['feature-request', 'invoicing'], prev: [{ s: 'Export invoices as XRechnung', d: '21 Jul', st: 'Resolved' }, { s: 'Change company address', d: '3 Feb', st: 'Resolved' }], csat: 0.92, ratings: 12 }),
  },
  {
    id: 'c5', num: 4815, subject: 'Refund request: bought annual by mistake', channel: 'email', priority: 'normal', status: 'open', assignee: null, unread: false, slaLeft: -14,
    msgs: [
      t5.c(134, 'Hello, I signed up on Monday and picked the annual plan by accident. I meant to choose monthly. Could I get a refund and switch to monthly? The order total was $144.'),
      t5.c(40, 'Just checking this was received. I’d like to sort it out before my next card statement.'),
    ],
    cust: cust({ name: 'Priyanka Desai', email: 'priyanka@orchardrow.example', company: 'Orchard Row', plan: 'Starter', mrr: 12, location: 'Mumbai, IN', tz: 5.5, since: 'Oct 2026', tags: ['refund', 'new'], prev: [], csat: null, ratings: 0 }),
  },
  {
    id: 'c6', num: 4811, subject: 'SSO with Okta: “Invalid metadata” on upload', channel: 'email', priority: 'high', status: 'open', assignee: 'Priya Nair', unread: false, slaLeft: 12,
    msgs: [
      t6.c(200, 'We’re configuring SAML with Okta and Quillbase returns “Invalid metadata: missing EntityDescriptor” after we upload the XML. We exported it straight from the Okta app. Go-live for 240 users is Tuesday.'),
      t6.a('Priya Nair', 170, 'Hi Elliot, understood on the Tuesday date. Could you send the first 20 lines of the XML (redact the certificate) so I can check the root element?'),
      t6.c(78, 'Here it is. The root element is <md:EntityDescriptor xmlns:md="…">, so it has the md: namespace prefix. Does your parser need it without the prefix?'),
      t6.n('Priya Nair', 70, 'Confirmed: our parser fails on a namespace-prefixed root. Fix is in review (QB-2307) and ships in tomorrow’s patch. Workaround: strip the prefix before upload.'),
    ],
    cust: cust({ name: 'Elliot Brandt', email: 'elliot@fenwicklabs.example', company: 'Fenwick Labs', plan: 'Enterprise', mrr: 2400, location: 'Denver, US', tz: -6, since: 'Jun 2025', tags: ['sso', 'enterprise', 'go-live'], prev: [{ s: 'Security questionnaire', d: '30 Sep', st: 'Resolved' }, { s: 'Audit log retention', d: '12 Aug', st: 'Resolved' }, { s: 'Sandbox workspace request', d: '4 Jul', st: 'Resolved' }], csat: 0.98, ratings: 7 }),
  },
  {
    id: 'c7', num: 4742, subject: 'Importing clients from a spreadsheet', channel: 'email', priority: 'low', status: 'resolved', assignee: 'Dana Ortiz', unread: false, slaLeft: null,
    msgs: [
      t7.c(1900, 'Hi! I’m moving over from spreadsheets. Is there a way to import my client list (about 60 rows)?'),
      t7.a('Dana Ortiz', 1892, 'Welcome, Sofia! Yes: Clients › Import accepts CSV. Download the template on that screen, paste in your columns (name, email and address are the only required ones) and upload. Anything that fails validation is listed so you can fix it and retry. Shout if you get stuck.'),
      t7.c(1700, 'That worked, all 60 imported. Thank you so much!'),
      t7.e('Dana Ortiz', 1695, 'Dana Ortiz resolved this conversation'),
    ],
    cust: cust({ name: 'Sofia Marchetti', email: 'sofia@marchetticeramics.example', company: 'Marchetti Ceramics', plan: 'Starter', mrr: 12, location: 'Bologna, IT', tz: 2, since: 'Oct 2026', tags: ['onboarding'], prev: [], csat: 1, ratings: 1 }),
  },
  {
    id: 'c8', num: 4777, subject: '429s from the webhooks endpoint since Thursday', channel: 'email', priority: 'high', status: 'pending', assignee: 'Priya Nair', unread: false, slaLeft: null,
    msgs: [
      t8.c(2300, 'Since Thursday afternoon we get HTTP 429 from POST /v2/webhooks/test on roughly one in five calls from CI. Nothing changed on our side. The docs say 100 requests per minute.'),
      t8.a('Priya Nair', 2255, 'Hi Grace, I can see the 429s on your key. Your CI shards share one key and bursts of about 40 calls in a few seconds trip the per-second limit (10/s), not the per-minute one. The docs are misleading here and I’ve flagged it. Two options: stagger the calls, or I can raise the burst limit for your workspace. Which do you prefer?'),
      t8.n('Priya Nair', 2250, 'Docs fix filed (DOC-88). Burst limits up to 25/s are fine to grant without sign-off.'),
    ],
    cust: cust({ name: 'Grace Liu', email: 'grace@tidewater.example', company: 'Tidewater Co-op', plan: 'Business', mrr: 240, location: 'Portland, US', tz: -7, since: 'Feb 2025', tags: ['api', 'bug'], prev: [{ s: 'API key rotation', d: '17 Jun', st: 'Resolved' }], csat: 0.9, ratings: 4 }),
  },
  {
    id: 'c9', num: 4823, subject: 'Please cancel my subscription', channel: 'chat', priority: 'normal', status: 'open', assignee: null, unread: true, slaLeft: 10,
    msgs: [
      t9.c(5, 'hi i want to cancel my subscription'),
      t9.c(4, 'we closed the shop last month, dont need the software anymore'),
    ],
    cust: cust({ name: 'Noah Fitzgerald', email: 'noah@fitzdaughters.example', company: 'Fitz & Daughters', plan: 'Starter', mrr: 12, location: 'Melbourne, AU', tz: 11, since: 'Apr 2025', tags: ['churn-risk'], prev: [{ s: 'Receipt for tax year', d: '1 Jul', st: 'Resolved' }], csat: 0.8, ratings: 2 }),
  },
  {
    id: 'c10', num: 4701, subject: 'Is there a dark mode on the mobile app?', channel: 'email', priority: 'low', status: 'resolved', assignee: 'Marcus Lee', unread: false, slaLeft: null,
    msgs: [
      t10.c(4300, 'Bonjour! I use Quillbase on my phone in the evening and the white screen is harsh. Is there a dark mode on the mobile app?'),
      t10.a('Marcus Lee', 4269, 'Hi Camille! Yes, it shipped in iOS 4.18 and Android 4.17. Open Settings › Appearance and pick Dark or Match system. Update the app if you don’t see it.'),
      t10.c(4100, 'Found it. Parfait, merci!'),
      t10.e('Marcus Lee', 4095, 'Marcus Lee resolved this conversation'),
    ],
    cust: cust({ name: 'Camille Dubois', email: 'camille@atelierdubois.example', company: 'Atelier Dubois', plan: 'Starter', mrr: 12, location: 'Lyon, FR', tz: 2, since: 'Aug 2025', tags: ['mobile'], prev: [], csat: 1, ratings: 2 }),
  },
  {
    id: 'c11', num: 4824, subject: 'Invoice PDF shows the wrong VAT number', channel: 'email', priority: 'high', status: 'open', assignee: 'Dana Ortiz', unread: true, slaLeft: 33,
    msgs: [
      t11.c(57, 'The PDF for invoice QB-2026-0412 shows VAT number GB 318 4429 07, but our correct number ends in 08. We’ve already sent it to a client and need a corrected copy.'),
      t11.c(11, 'Also, company settings shows the right number, so I’m not sure why the PDF has the old one. Can this be fixed for future invoices too?'),
    ],
    cust: cust({ name: 'Rahul Mehta', email: 'rahul@mehtalogistics.example', company: 'Mehta Logistics', plan: 'Team', mrr: 190, location: 'Leicester, UK', tz: 1, since: 'May 2024', tags: ['billing', 'vat'], prev: [{ s: 'Switch to quarterly VAT returns', d: '8 Oct', st: 'Resolved' }, { s: 'Late fee on invoices', d: '19 Apr', st: 'Resolved' }], csat: 0.94, ratings: 8 }),
  },
  {
    id: 'c12', num: 4778, subject: 'New here: where do I start?', channel: 'chat', priority: 'normal', status: 'pending', assignee: 'Dana Ortiz', unread: false, slaLeft: null, snooze: 'Mon 26 Oct, 09:00',
    msgs: [
      t12.c(1650, 'hey, just signed up. where do I start?'),
      t12.a('Dana Ortiz', 1645, 'Welcome to Quillbase, Hannah! Quick start: 1) add your first client, 2) create a project with an hourly rate, 3) start the timer. I’ve emailed you a 3-step checklist. Want me to walk you through invoicing too?', 'delivered'),
      t12.e('Dana Ortiz', 1640, 'Dana Ortiz snoozed until Mon 26 Oct, 09:00'),
    ],
    cust: cust({ name: 'Hannah Kowalski', email: 'hannah@pomeroydesign.example', company: 'Pomeroy Design', plan: 'Trial', mrr: 0, location: 'Auckland, NZ', tz: 13, since: 'Oct 2026', tags: ['onboarding', 'trial'], prev: [], csat: null, ratings: 0 }),
  },
  {
    id: 'c13', num: 4730, subject: 'Webhook signature verification docs unclear', channel: 'web', priority: 'low', status: 'resolved', assignee: 'Priya Nair', unread: false, slaLeft: null,
    msgs: [
      t13.c(5700, 'The docs say to “verify the signature” but not what is signed. HMAC of which part of the request?'),
      t13.a('Priya Nair', 5640, 'Hi Diego, it’s HMAC-SHA256 over the raw request body (before any JSON parsing), keyed with the signing secret from Settings › Webhooks, compared against the X-Quill-Signature header. I’ll get the docs page updated with an example.'),
      t13.c(5500, 'Got it working. Raw body was the missing piece. Thanks!'),
      t13.e('Priya Nair', 5495, 'Priya Nair resolved this conversation'),
    ],
    cust: cust({ name: 'Diego Alvarez', email: 'diego@alvarezstudio.example', company: 'Alvarez Studio', plan: 'Team', mrr: 95, location: 'Mexico City, MX', tz: -6, since: 'Sep 2025', tags: ['api', 'docs'], prev: [{ s: 'Sandbox API keys', d: '2 Oct', st: 'Resolved' }], csat: 0.9, ratings: 3 }),
  },
  {
    id: 'c14', num: 4820, subject: 'Pro-rating when upgrading mid-cycle', channel: 'email', priority: 'normal', status: 'open', assignee: 'Marcus Lee', unread: false, slaLeft: 45,
    msgs: [
      t14.c(75, 'We’re on Team with 8 seats (annual) and want to move to Business next week. How is the upgrade pro-rated against what we already paid?'),
      t14.n('Marcus Lee', 40, 'Annual to Business: unused Team time is credited, the difference is charged pro-rata. Rough estimate for 8 seats is $1,326 for the remaining 10.5 months. Verify in the billing tool before quoting.'),
    ],
    cust: cust({ name: 'Lena Sørensen', email: 'lena@nordlys.example', company: 'Nordlys AS', plan: 'Team', mrr: 152, location: 'Oslo, NO', tz: 2, since: 'Jan 2026', tags: ['billing', 'upgrade'], prev: [{ s: 'Invoice in NOK', d: '11 Mar', st: 'Resolved' }], csat: 0.95, ratings: 3 }),
  },
];

export const CANNED = [
  { id: 'ask', label: 'Ask for details', text: 'Thanks for reaching out, {first}. Could you share a screenshot or the steps that led to this, so I can take a closer look?' },
  { id: 'eng', label: 'Escalated to engineering', text: 'I’ve passed this to our engineers and will update you here as soon as there’s news. You don’t need to do anything else for now.' },
  { id: 'refund', label: 'Refund issued', text: 'Hi {first}, I’ve issued the refund. It should reach your statement in 5–10 business days. Sorry for the trouble!' },
  { id: 'billing', label: 'Billing settings', text: 'You can update your card and download invoices any time under Settings › Billing.' },
  { id: 'loop', label: 'Closing the loop', text: 'Just checking in, {first}: did that solve it? If so I’ll mark this as resolved. You can always reply to reopen.' },
];
