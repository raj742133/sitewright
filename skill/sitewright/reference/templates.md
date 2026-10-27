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

