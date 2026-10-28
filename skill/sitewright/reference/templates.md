# Templates

Full-screen dashboards and pages. They are not components: each is a complete responsive screen with working interactions and sample data, rendered under `@/components/fx/tpl`. Choose with `effects.templates` in `site.json` (`"all"` or a list of ids) or `--templates`; change later with `--apply-effects`. Browse at `/effects/templates/`.

Dashboards share one kit (`_dash.tsx` + `tpl-dash.css`): they respond to their own container width, not the viewport, so they work embedded in a page or full screen. Replace the sample data with yours; keep the structure.

## Dashboards

| Id | Name | What it is |
| --- | --- | --- |
| `analytics-dashboard` | Analytics | Web analytics: visitors with period comparison, a live traffic chart with crosshair tooltip, sources, top pages, countries and devices, and a realtime strip. |
| `assistant-dashboard` | AI assistant | A conversation next to the answer: ask in plain words and the panel on the right builds a chart or table with its sources and a short summary. |
| `finance-dashboard` | Finance | A business banking home: total balance with a 30-day line and Send / Request / Transfer, cash in vs out, accounts, a searchable transactions table with a detail drawer and approvals, upcoming bills you can pay, and spend by category. |
| `inbox-dashboard` | Support inbox | A three-pane inbox: conversation list with filters and search, the thread with a composer and canned replies, and a customer panel with history. |
| `operations-dashboard` | Operations | A workshop operations console: KPI strip, a six-station production line with live throughput, a sortable inventory table that builds purchase orders, orders against capacity, supplier lead times and late shipments. |
| `project-dashboard` | Projects | Team work in one place: sprint progress, a kanban board that moves cards by drag or keyboard, a timeline of milestones and workload per person. |
| `sales-dashboard` | Sales pipeline | A CRM view: pipeline value by stage, a deals board with drag and keyboard moves, forecast against target, a leaderboard and recent activity. |

## Pages

| Id | Name | What it is |
| --- | --- | --- |
| `art-marketplace-page` | Art marketplace page | Landing page with nav and cart, layered art-frame hero, filterable artwork grid with likes and hover zoom, artist spotlight, categories, newsletter and footer. |
| `restaurant-landing-page` | Restaurant landing page | Hero with a rotating plate and steam, working menu tabs, validated reservation form with confirmation, opening hours and a reviews carousel. |
| `wind-404-page` | Wind 404 page | An illustrated landscape 404 where the headline letters bend away from the pointer on springs, with gentle automatic gusts on touch, a home button and search suggestions. |
| `lamp-login` | Lamp login | A login form under a hanging lamp: pull the cord button to switch the light on and reveal a light cone; the form with validation and submit state works either way. |

## Brands

| Id | Name | What it is |
| --- | --- | --- |
| `bento-board` | Bento board | A share-ready brand board in a bento grid: statement, key number, logo, type sample, colour swatches, an abstract picture drawn from the brand colours, tone words, a slice of UI and a quote; reflows from four columns to one with its container. |


## Heroes

Five original full-page landing compositions, each with its own invented brand, copy and artwork (none reproduces any third-party page). Responsive by container, light and dark, keyboard operable, reduced-motion aware.

| Id | Name | What it is |
| --- | --- | --- |
| `hero-night-temple` | Night temple hero | Cinematic dark landing page for a lantern-lit mountain retreat: procedural night scene with parallax ridges, a lit pagoda and drifting embers, a lantern toggle, scroll-linked night timeline, room cards with a validated booking dialog, rituals and a letters form. |
| `hero-bookshelf` | Bookshelf studio hero | A studio portfolio whose tools are books on a shelf: CSS 3D cuboid books with drawn spines and covers that swing out on select, a sliding carousel row with keyboard, swipe and pointer tilt, a detail panel with working actions, a catalogue dialog, journal accordion and a validated booking form. |
| `hero-book-showcase` | Book showcase hero | Editorial publisher landing page: oversized serif headline that slides on scroll, a fan of six SVG book covers that works as a keyboard tab list with a detail panel, excerpt dialog and reading list, a canvas-poster media player with seek, speed, captions and a clickable transcript, and a validated newsletter. |
| `hero-living-green` | Living green hero | Organic botanical landing page: a WebGL moss field that drifts and follows the pointer (Canvas 2D fallback), liquid-metal CTA, swaying procedural fern, glass feature cards, a filterable and sortable shelf with a working basket and checkout, a self-drawing vine timeline and a newsletter form. |
| `hero-paper-sketchbook` | Paper sketchbook hero | An illustrator's portfolio built as a paper world: drawn SVG plates on warm paper, a sketchbook whose pages turn by drag or arrow keys with a 3D leaf and travelling shade, a magnifier loupe over the artwork, a filterable commissions index, a rates dialog and a validated contact form. |
