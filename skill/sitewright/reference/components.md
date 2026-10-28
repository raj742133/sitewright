# Components

Small interactive pieces you import by name from `@/components/fx/ui`: buttons, inputs, navigation, hover interactions, cards, loaders, text, backgrounds, motion helpers, charts and whole dashboard / page blocks. Like the effects they are original, dependency-free code (React, CSS and inline SVG only - no animation or chart library), they respect `prefers-reduced-motion`, work with touch and keyboard, and are only copied into a project when chosen. Their ideas come from [Kitchen](https://www.dqnamo.com/kitchen), [Kokonut UI](https://kokonutui.com), [Anime.js](https://animejs.com), [Motion](https://motion.dev) and [Bklit](https://bklit.com); the code is written for this kit and none of it is copied from them.

## Motion

| id | what it does | use it for | idea from |
|---|---|---|---|
| `stagger-grid` | A grid of cells that ripple in from any origin with a distance-based stagger; click a cell to replay from there. | landing hero decoration, empty states, loading reveals | Anime.js |
| `shape-morph` | Morphs between circle, star and heart by interpolating normalised point lists, on click or auto-cycle. | landing hero, success states, icon toggles | Anime.js |
| `motion-path` | An element follows an SVG path with tangent rotation, a fading trail and a scrub slider. | progress journeys, publishing status, landing illustrations | Anime.js |
| `scroll-timeline` | A four-step sequence (title, bar, counter, icon) driven by scroll position inside a scroll container. | landing feature storytelling, stats sections, onboarding | Anime.js |
| `timeline-sequence` | A mini timeline orchestrator with play, pause, restart and scrub controls; accepts custom steps. | animated explainers, onboarding walkthroughs, dashboard intros | Anime.js |
| `receipt-printer` | A checkout success state where a slot prints a paper receipt line by line, ending in a torn edge. | Order or payment confirmation, invoice paid, booking complete. | Kitchen |
| `animated-signature` | An SVG signature that draws itself on mount and replays on click or Enter. | Footers, about pages, letters, agreement and thank-you screens. | Kitchen |
| `spring-playground` | Three sliders (stiffness, damping, mass) drive a live spring on a ball and a plotted response curve, with presets and the settle time. | landing page feature explainer, docs or about page showing how the motion feels | Motion |
| `scroll-linked` | A scroll-progress bar, a parallax layer and a percentage readout that follow the scroll position of a scrollable stage. | long-form landing sections, changelog or terms panel, reading progress inside a card | Motion |
| `presence-list` | A list where added items animate in, removed items animate out before unmounting and the others slide into place; changes are announced. | dashboard task or notification list, publishing queue, settings lists | Motion |
| `drag-reorder` | A vertically reorderable list: drag by a handle while the others spring out of the way, or pick up with Space and move with the arrow keys. | dashboard priorities, publishing list ordering, onboarding checklist | Motion |

## Media

| id | what it does | use it for | idea from |
|---|---|---|---|
| `line-draw` | Draws SVG paths with a stroke-dashoffset animation when scrolled into view, with replay. | landing illustrations, onboarding, empty states | Anime.js |
| `glass-carousel` | A 3D-ish carousel of frosted-glass cards with a larger centre card, drag with momentum snap, arrows, arrow keys, dots and optional autoplay. | landing feature highlights, publishing templates picker, onboarding tips, connect page integrations | code.xr |
| `blinds-reveal` | A picture revealed through vertical blind slats that turn edge-on one after another on hover, focus or tap. | Before/after teasers, hero images, product reveal cards. | Hover Interaction Collection |
| `image-accordion` | A horizontal accordion of pictures where the hovered, focused or tapped panel expands and the others shrink; arrow keys move between panels. | Feature showcases, destination or category pickers on landing pages. | Hover Interaction Collection |
| `cursor-reveal` | A circular mask follows the pointer and uncovers a second layer under the first; arrow keys and taps move it too. | Before/after or day/night image sections on landing pages, product theme previews. | Hover Interaction Collection |
| `peel-reveal` | A sticker corner peels back toward the pointer's nearest corner to reveal content underneath; a corner button toggles it. | Promo codes, coupons, spoiler or reward reveals in cards on landing and dashboard pages. | Hover Interaction Collection |
| `layer-explorer` | An illustration of stacked layers that separate in 3D (exploded view) on hover, focus or tap, with a legend that highlights each layer. | Explaining product anatomy or architecture layers on landing and docs pages. | Hover Interaction Collection |
| `cassette-player` | A compact cassette with turning reels, play/pause, a seek bar and title/artist; visual only, no audio. | Podcast or music teasers on landing pages, a playful media card on a dashboard. | Kitchen |

## Cards

| id | what it does | use it for | idea from |
|---|---|---|---|
| `draggable-spring` | Drag, flick and throw a card with momentum, edge bounce and optional snap grid; arrow keys nudge. | playful dashboard widgets, landing page toys, kanban-style pickers | Anime.js |
| `payment-card` | A card-payment form whose card face updates live, flips to the back on CVC focus, formats and Luhn-checks the number, and plays a fake processing then success sequence (no network). | checkout, billing settings, upgrade plan dialog on a dashboard or landing page | code.xr |
| `chat-thread` | A messaging UI with grouped mine/theirs bubbles, timestamps, delivery ticks, typing indicator, smart auto-scroll with a New messages pill and an Enter-to-send input. | dashboard support chat, client feedback thread, comments on a publishing item | code.xr |
| `spotlight-border` | A card whose border is lit by a radial gradient following the pointer; focus and touch get a steady glow. | Feature cards and pricing tiles on landing pages, dashboard summary cards. | Hover Interaction Collection |
| `image-stack` | A pile of pictures that fans out on hover, keyboard focus or tap, showing a label on each. | Gallery and album teasers, collection cards, trip or project galleries. | Hover Interaction Collection |
| `caption-reveal` | Pictures whose caption slides or wipes in on hover or focus, and stays visible on touch screens. | Gallery, destinations, team or portfolio grids on landing pages. | Hover Interaction Collection |
| `holographic-card` | A card with a rainbow foil sheen and glare that follow the pointer, plus a 3D tilt; safe in light mode, with arrow-key and idle-sweep fallbacks. | Membership, plan or achievement cards on dashboards and landing pages. | Hover Interaction Collection |
| `parallax-card` | A layered landscape whose layers shift by depth with the pointer; arrow keys nudge it and touch screens get a slow drift. | Feature cards, destination teasers and hero tiles on landing pages. | Hover Interaction Collection |
| `orbiting-accents` | Small shapes orbit a badge on two rings and smoothly speed up on hover, focus or tap. | Highlighting a pro/plan badge, integration hub or status badge on landing and dashboard pages. | Hover Interaction Collection |
| `playing-cards` | A composable playing card (rank, suit, face-down) and a fanned hand you thumb through with hover or arrow keys and play with a click. | Playful feature cards, game or loyalty-card landing sections, card-style selection. | Kitchen |
| `perforated-ticket` | A ticket silhouette with notched sides and a perforated divider; header, body and stub sections, with a subtle pointer parallax. | Release notes, invites, order confirmations, event passes. | Kitchen |
| `stamp` | A scalloped postage-stamp frame around any content, with an optional postmark overlay. | Framing an avatar, badge or image; sent/verified states; landing decoration. | Kitchen |
| `scroll-fade-list` | A compact scrollable list whose top and bottom edges fade only while more content lies in that direction. | Activity feeds, notification panels, dashboard side lists. | Kitchen |
| `layout-gallery` | A grid of cards where the clicked card expands into a detail panel with a FLIP shared-element animation; Esc closes and focus returns. | landing page features, portfolio or project list, publishing list with detail view | Motion |
| `gesture-card` | A card with hover lift, press-down scale (pointer or Space/Enter) and drag with momentum that coasts inside its boundary and settles on a spring. | landing page hero decoration, playful dashboard tile, connect page | Motion |

## Charts

| id | what it does | use it for | idea from |
|---|---|---|---|
| `area-chart` | Smooth gradient area chart with axis ticks, a hover and keyboard crosshair with tooltip, and an optional stacked multi-series mode. | Traffic or growth over time on a dashboard or landing page. | Bklit |
| `bar-chart` | Vertical grouped or stacked bars with rounded tops, value labels on focus, and a horizontal option. | Comparing categories: sales by channel, tasks by status (dashboard, report). | Bklit |
| `line-chart` | Multi-series monotone line chart whose legend buttons toggle series, with a crosshair tooltip. | Trends of several metrics side by side on a dashboard. | Bklit |
| `live-line-chart` | Streaming line that appends a point every second in a sliding window, with a pause button; it pauses off-screen and in hidden tabs. | Live status panels: requests per second, queue depth, active visitors. | Bklit |
| `profit-loss-line` | Line around a zero baseline with green fill above and red below, split by a clip path, and signed values in the tooltip. | Finance dashboards: monthly net result, margin, cash flow. | Bklit |
| `composed-chart` | Columns and a line in one chart, each on its own labelled y axis (revenue and conversion rate). | Two metrics with different units: revenue vs conversion, volume vs rate. | Bklit |
| `scatter-chart` | Scatter or bubble chart with group colours and marker shapes, nice axis ticks and a nearest-point tooltip. | Correlations and distributions: usage vs account size, price vs rating. | Bklit |
| `candlestick-chart` | OHLC candles (hollow when up, filled when down) with wicks, optional volume bars and an O/H/L/C tooltip. | Prices over time: markets, stock levels, any open/high/low/close series. | Bklit |
| `pie-chart` | Pie or donut chart whose segments pull out on hover or focus, with a centre label, legend and optional leader-line labels. | dashboard revenue or traffic share, landing-page stats, publishing list breakdowns | Bklit |
| `ring-chart` | Concentric progress rings, one per category, with a centre total that animate in once. | dashboard usage by category, storage or quota overview, connect page limits | Bklit |
| `radar-chart` | Spider chart with up to three series polygons, grid rings and focusable vertices with tooltips. | comparison pages, skill or product profiles, dashboard scorecards | Bklit |
| `funnel-chart` | Conversion funnel of trapezoid stages with step percentages and drop-off between stages. | dashboard conversion analytics, sign-up flow reports, landing-page proof | Bklit |
| `gauge-chart` | Semicircle meter with low/ok/high colour bands, animated needle, target tick and a big readout. | dashboard health or capacity indicators, uptime and quota readouts | Bklit |
| `heatmap-chart` | Calendar or matrix heatmap on a sequential brand-tint scale with legend, tooltip and arrow-key grid navigation. | dashboard activity calendar, busiest hours matrix, publishing cadence | Bklit |
| `sankey-chart` | Flow diagram with proportional link widths between node columns; hovering or focusing a node highlights its flows. | dashboard traffic or funds flow, onboarding paths, order pipelines | Bklit |
| `tile-map-chart` | Tile-grid cartogram of the US states coloured by value, with legend, tooltips and keyboard grid navigation. | dashboard regional breakdowns, store or customer locator summaries | Bklit |
| `activity-rings` | Three concentric progress rings that fill on mount, with a legend of values and a Replay button. | dashboard summary card, goals or usage progress, onboarding checklist | Kokonut UI |
| `activity-terrain` | A small isometric terrain of bars (like a contribution grid) that you drag sideways or arrow-key to rotate, with a tooltip on hover and focus. | Dashboard activity overview, a profile page, or a publishing-frequency panel. | Kokonut UI |
| `liquid-gauge` | A circle or tank gauge filled with two animated waves at the value; drag sideways to slosh the liquid. Exposed as role=meter. | Storage, quota or progress on a dashboard or connect page. | Kokonut UI |

## Inputs

| id | what it does | use it for | idea from |
|---|---|---|---|
| `otp-input` | A one-time-code field with N visual boxes over one real input (SMS autofill friendly): auto-advance, backspace, arrows, paste, pop on fill, shake on error and a check seal on success. | sign-in two-step verification, email confirmation, connect page pairing codes | code.xr |
| `upload-progress` | A file picker and drop target that shows upload progress as a ball arcing into a hoop, with percentage, cancel, retry, error and success states. | asset or document upload on a dashboard, connect page or publishing form | code.xr |
| `ring-rope-upload` | Circular upload ring that unrolls into a straight progress bar, then tosses a file chip to the right end and shows a done check; falls back to a plain progress bar for reduced motion. | file upload field in a dashboard, application form or publishing flow | code.xr |
| `flipping-search-bar` | A search button that flips in 3D to reveal an input, flips back on blur or Escape, and filters a suggestions list with arrow-key selection. | site header search, help centre, dashboard toolbar | code.xr |
| `magic-tree-qr` | A QR code generator: paste a link and get a real, scannable code in leaf-coloured squares; tap it and it becomes an isometric 3D tree standing on a slab whose tiles are the code. Every link grows a different tree. Pick spring, summer, autumn or winter (falling petals, leaves or snow) or your own leaf and trunk colours, and download the code as PNG or SVG. | Share and invite pages, publishing links, the connect page, print and event materials. | Original |
| `magnetic-drop-zone` | A file drop target that leans toward an incoming drag, lists the dropped file names, and falls back to a browse input. | Upload areas on a dashboard, connect page or publishing list (no upload is performed by the component). | Kitchen |
| `model-selector` | A keyboard-navigable grouped listbox with metric bars; the selected item reveals a segmented configuration row. | Plan or tier pickers, settings pages, any choice that carries extra options. | Kitchen |
| `invite-code` | An invite or token field with a scrambling Regenerate button and a Copy button with confirmation. | Team invites, API tokens, share links on dashboard and connect pages. | Kitchen |
| `spring-toggle` | A role=switch whose thumb moves and squishes with spring physics, plus a spring-driven checkbox variant. | dashboard settings, sign-in remember-me, connect page options | Motion |
| `ai-input` | A text field with a slash-command menu (listbox), file drop and attach chips, submitting text, files and command together. | dashboard composer, support or feedback box, publishing notes, search with commands | Kokonut UI |
| `detent-dial` | A rotary dial with detents you can drag, flick (it coasts and snaps with a small overshoot), or set with arrow keys and the wheel. | settings page, level or quality picker, dashboard control | Kokonut UI |
| `wheel-picker` | An iOS-style 3D wheel for choosing one value: drag or flick with inertia, mouse wheel, arrow keys and typeahead, snaps to a row. | Pick a time, day, plan or quantity in a booking form, settings page or dashboard filter. | Kokonut UI |

## Navigation

| id | what it does | use it for | idea from |
|---|---|---|---|
| `nav-tabs` | A tab bar whose pill or underline indicator springs and stretches between tabs, previews on hover, and scrolls with edge fades when crowded. | dashboard sections, settings pages, product detail views, publishing list filters | code.xr |
| `glow-sidebar` | A collapsible icon and label sidebar with a gliding active bar, tooltips in rail mode and a subtle brand glow that follows the pointer. | dashboard shell, admin area, connect page side navigation | code.xr |
| `liquid-glass-nav` | A glass pill indicator that stretches between items with a separate spring on each edge; the active label turns neon. Arrow-key roving tabindex. | landing header, mobile tab bar, dashboard section switcher | code.xr |
| `underline-nav` | Navigation links sharing one underline that glides and stretches to the hovered or focused link, then returns to the active one. | site header, dashboard sub-navigation, settings tabs | Hover Interaction Collection |

## Buttons

| id | what it does | use it for | idea from |
|---|---|---|---|
| `gloss-button` | A glossy dark button with a pointer-following specular band, a slow liquid sheen on hover, a squashed pressed state and a loading spinner; dark and accent variants. | primary call to action on landing pages, sign-in, checkout or publish actions | code.xr |
| `look-pay-button` | A pay button with a pair of eyes that follow the pointer, look at the label on keyboard focus, and close into a confirmed check state when pressed. | checkout, billing, upgrade and connect pages | code.xr |
| `folding-subscribe` | A subscribe button that folds in on itself, becomes a paper plane that flies off, then settles into a Subscribed state with a reset. | newsletter sign-up, landing footer, blog posts | code.xr |
| `hungry-delete` | A mouth-shaped delete button that opens on hover or focus, swallows a file chip when activated and offers a timed undo. | file lists, publishing list, dashboard settings | code.xr |
| `rolling-publish` | A publish button whose cloud icon rolls up into a check while the label rolls slot-machine style from Publish to Published, with a progress fill. | publishing list, dashboard editor toolbar, deploy pages | code.xr |
| `radial-share` | A share button that fans out five targets (link, mail, chat, download, more) in an arc with staggered springs; arrow keys, Escape and menu semantics. | article and product pages, dashboard rows, publishing list | code.xr |
| `liquid-upload-button` | Button that fills with two layered waves of liquid from the bottom as the upload progresses, with a percent label and a done state. | upload actions in a dashboard, publishing flow or media library | code.xr |
| `neon-send-button` | Neon-glow send button whose glow intensifies on hover; on click the paper plane flies out and the button confirms with Sent and a glow pulse. | contact form, chat composer or newsletter sign-up | code.xr |
| `neumorphic-play-button` | Soft embossed play/pause button that presses in, morphs its icon, shows a progress ring and a three-bar equalizer while playing (visual only). | audio or video previews, podcast and music sections on landing pages | code.xr |
| `rippling-download-button` | Download button with a ripple from the click point, an arrow that drops into a tray, a progress ring and a final check. | download links for brochures, menus, invoices and reports | code.xr |
| `magnetic-button` | A button that springs toward the pointer within a radius, with the label moving a little further; inactive on coarse pointers and reduced motion. | landing hero call to action, sign-up, pricing | Hover Interaction Collection |
| `rolling-text-button` | Label letters roll up and are replaced by a duplicate with a per-letter stagger on hover or focus. | landing call to action, navigation links, footer buttons | Hover Interaction Collection |
| `expanding-fill-button` | A button whose fill circle grows from the point where the pointer entered and recedes toward where it left; keyboard focus fills from the centre. | Primary and secondary calls to action on landing pages and sign-in. | Hover Interaction Collection |
| `arrow-relay` | A button where the arrow exits one side as a second arrow enters from the other on hover or focus. | Next, continue and view-more links in landing pages and connect flows. | Hover Interaction Collection |
| `waving-hand-button` | A pill button with a hand glyph that waves on hover, focus or tap while the label changes to a greeting. | Contact, chat and welcome calls to action. | Hover Interaction Collection |
| `tactile-button` | A physical-feeling button with a shaped face on a firm edge that presses down on pointer or Space/Enter and springs back. | Primary and secondary calls to action on landing pages, sign-in and checkout. | Kitchen |
| `hold-to-confirm` | A button that fills while held (pointer or Space/Enter), confirms at 100%, then offers a timed Undo before finalising. | Destructive or irreversible actions: delete a project, revoke a key, unpublish a page. | Kitchen |
| `dynamic-button` | A button whose width animates as its label moves through states (Save, Saving…, Saved) with an inline icon swap. | Save and submit buttons in settings forms, sign-in and publishing flows. | Kitchen |
| `tear-button` | A confirm button with a perforated stub: drag it off or press Space on it to confirm, then Reset. | sign-in confirmation, publish or delete confirmation, checkout, landing call to action | Kokonut UI |
| `bell-button` | A button whose bell icon swings with a damped ring and a badge count when clicked (visual only, no sound). | dashboard header, notifications entry, subscribe or remind-me button | Kokonut UI |
| `pull-cord` | A hanging cord with a handle: drag it down past a threshold and release (or press Enter/Space) to toggle; the cord stretches and swings back. | A theme or lamp switch in a header or landing hero, or any on/off setting with some character. | Kokonut UI |

## Hover interactions

| id | what it does | use it for | idea from |
|---|---|---|---|
| `rotating-button` | A pill button whose arrow rotates 45 degrees while the label slides on hover or keyboard focus. | hero call to action, card links, contact section | Hover Interaction Collection |
| `list-image-preview` | A list of rows where hovering shows a floating picture that trails the pointer; touch and keyboard open the picture inline. | Portfolio or project indexes, publishing lists, menus and case-study lists. | Hover Interaction Collection |
| `squishy-labels` | A row of pill toggles that squash and stretch like soft bodies on hover or focus, pushing neighbours aside; press to select. | Tag or topic filters, preference pickers in onboarding, category chips on a menu or blog page. | Hover Interaction Collection |

## Text

| id | what it does | use it for | idea from |
|---|---|---|---|
| `jelly-text` | Headline letters wobble like jelly as the pointer passes over them, each letter a spring; tap or Enter sends a wave. | Playful hero headlines and 404 or empty-state titles. | Hover Interaction Collection |
| `hover-marquee` | A text ticker that drifts slowly, speeds up and reverses direction on hover, pauses on focus, and is a static list with reduced motion. | Under a landing hero, a perks or press strip, a footer ribbon. | Hover Interaction Collection |
| `dynamic-text-shadow` | A headline whose long shadow always falls away from the pointer; arrow keys turn it when focused and a tap steps it on touch. | Landing hero headline, 404 or empty-state title, section banner. | Hover Interaction Collection |
| `scramble-text` | Text whose changed characters scramble through random glyphs and settle left to right; screen readers get the real text. | Hero taglines, rotating status lines, dashboard headings that change. | Kitchen |
| `plucked-text` | Text with a string under it: hover, drag or press Enter on the string and it vibrates while the letters ripple along. | A playful headline on a landing page, an empty state or a 404 page. | Kokonut UI |

## Backgrounds

| id | what it does | use it for | idea from |
|---|---|---|---|
| `repelling-dots` | A canvas dot grid whose dots are pushed away from the pointer and spring back; a gentle automatic wave on touch, static with reduced motion, paused offscreen. | Behind a landing hero or sign-in panel (put it first inside a position:relative section). | Hover Interaction Collection |
| `magic-tree` | A tree that grows from a seed with SVG branches drawing recursively, leaves and lights blooming, a Season button (spring blossom, summer green, autumn gold with falling leaves, bare winter with snow and glowing lights), sparkles on pointer or tap, and a Regrow button. | Empty state, 404 or thank-you page, seasonal landing hero (inside a position:relative section with a set height). | Original |
| `iridescent-foil` | A holographic foil frame that shifts with scroll and pointer position around an opaque content surface. | Premium plan cards, membership passes, feature callouts on landing pages. | Kitchen |
| `drape-background` | A cloth-like backdrop of soft folds that the pointer sweeps through or you grab and drag, then springs back; static folds on touch and reduced motion. | Behind a landing hero or sign-in panel (put it first inside a position:relative section). | Kokonut UI |

## Dashboards and pages (blocks)

| id | what it does | use it for | idea from |
|---|---|---|---|
| `bento-dashboard` | A bento-grid dashboard with mixed-size tiles: revenue sparkline with count-up and scrubber, radial goal gauge, activity heatmap, task checklist, week strip with events and top-product bars; tiles lift on hover and fly in once. | admin dashboard home, shop overview, analytics landing for a signed-in owner | code.xr |
| `messaging-dashboard` | A customer inbox with open/pending/closed tabs, search, unread badges, a thread where you type and send (auto reply with typing dots), status chips and a customer details panel with plan, tags and orders. | support inbox, customer messages page, contact form replies in a dashboard | code.xr |
| `project-dashboard` | A team project board: project sidebar, avatar stack, three kanban columns where cards move by buttons, keyboard or pointer drag, a live progress ring, milestone gantt and per-person workload bars. | team workspace, build/launch tracker, content calendar planning page | code.xr |
| `erp-dashboard` | Bicycle plant overview with line status, a four-stage production pipeline, sortable parts table with low-stock highlight, weekly orders chart and suppliers. | admin area, operations or inventory dashboard | Original |
| `analytics-dashboard` | Warm white and orange analytics page with KPI cards, area chart, traffic-source donut and top pages, driven by a date-range switch. | dashboard home, site stats page | code.xr |
| `finance-dashboard` | Balance card, income vs expense bars, category-filtered transactions, budget progress and a debit card widget with reveal and freeze. | dashboard, billing or personal finance page | code.xr |
| `ai-dashboard` | Assistant chat with suggestion chips and a typing animation next to an analytics panel (chart, donut or table) that changes with each question. | dashboard, assistant or insights page | code.xr |
| `art-marketplace-page` | Landing page with nav and cart, layered art-frame hero, filterable artwork grid with likes and hover zoom, artist spotlight, categories, newsletter and footer. | shop or portfolio landing page | code.xr |
| `restaurant-landing-page` | Hero with a rotating plate and steam, working menu tabs, validated reservation form with confirmation, opening hours and a reviews carousel. | restaurant, cafe or venue landing page | code.xr |
| `wind-404-page` | An illustrated landscape 404 where the headline letters bend away from the pointer on springs, with gentle automatic gusts on touch, a home button and search suggestions. | 404 / not found page | Original |
| `lamp-login` | A login form under a hanging lamp: pull the cord button to switch the light on and reveal a light cone; the form with validation and submit state works either way. | sign-in page, connect page | code.xr |
| `bento-board` | A share-ready brand board in a bento grid: statement, key number, logo, type sample, colour swatches, an abstract picture drawn from the brand colours, tone words, a slice of UI and a quote; reflows from four columns to one with its container. | Pitch decks, case studies and portfolio shots for the brand the site was generated for; an About or Brand page; a launch post image. | Original |

## Glass

Ten liquid-glass pieces (and eight frosted CSS-only versions of them, `frosted-*`, which take the same props and never use WebGL: pass `variant="frosted"` to any `Glass*` component for the same effect) ported from [Tactile Glass UI](https://github.com/uixninja/tactile-glass-ui) by uixNinja (MIT; the licence ships with them as `src/components/fx/ui/LICENSE-tactile-glass.txt` and must stay). One shared WebGL2 engine draws all of them (a single canvas, however many are on the page); rim light, caustics and ripples use the theme's `--primary` and `--signal`, and everything is scoped under `.ui-glass`. Without WebGL2 (or after a lost context) each falls back to frosted CSS glass; with reduced motion they draw still frames. Pass `optics={{ refraction, frost, sheen, fluidBrightness, ... }}` to tune the glass. Glass shows best over colour or imagery.

| id | what it does | use it for | idea from |
|---|---|---|---|
| `glass-background` | A full-section backdrop of flowing liquid light under a tinted glass panel; the pointer bends the light, a click sends a ripple, and glass placed inside it refracts it. | Behind a hero, feature block or sign-in panel (fills its parent; children are centred). | Tactile Glass UI (uixNinja, MIT) |
| `glass-button` | A pill button of liquid glass: the rim catches light, caustics flow through it and a click sends a ripple. Frosted CSS glass without WebGL. | Primary call to action on a rich or photographic background; round icon buttons. | Tactile Glass UI (uixNinja, MIT) |
| `glass-card` | A payment card in dark liquid glass that tilts toward the pointer while the glass refracts the tilted surface; accent colours come from the theme. | Checkout, wallet or billing screens; a showpiece for fintech landing pages. | Tactile Glass UI (uixNinja, MIT) |
| `glass-fx` | Wraps any element and gives it the glass finish: rim light, caustics and ripples drawn over its content, following its border-radius. | Put glass on your own cards, pills or panels without rebuilding them. | Tactile Glass UI (uixNinja, MIT) |
| `glass-word` | A word whose letter shapes are liquid glass, with rim light and flowing caustics that react to the pointer; click cycles through a list. Real text underneath. | One highlighted word in a hero headline. | Tactile Glass UI (uixNinja, MIT) |
| `glass-heading` | Display heading with one or more words in liquid glass, optional badge and subtitle, and a size that follows its container. | Hero and section headings on landing pages. | Tactile Glass UI (uixNinja, MIT) |
| `glass-prompt-input` | An AI prompt box on a glass pane: auto-growing text area (Enter sends), add-context button, a mode pill that cycles Agent / Plan / Ask, and a send button. | Assistant and chat entry points, command bars. | Tactile Glass UI (uixNinja, MIT) |
| `glass-switch` | An on/off switch: a glass track with a molded glass thumb that refracts what is under it. A real button with role switch. | Settings toggles on rich backgrounds. | Tactile Glass UI (uixNinja, MIT) |
| `glass-tabs` | A segmented control: a glass capsule with a molded indicator that slides to the chosen tab; arrow keys, Home and End move between tabs. | Section switchers, view toggles. | Tactile Glass UI (uixNinja, MIT) |
| `glass-audio-player` | A spatial audio deck in liquid glass with a procedural Web Audio synth (no files): play, previous / next, draggable timeline, live spectrum, repeat. Sound starts only when you press play. | Music or podcast teasers, ambient sound on a landing page. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-button` | The glass button as thick frosted glass: heavy backdrop blur, grain, a lit edge and a sheen that follows the pointer. Pure CSS, no WebGL. | Primary calls to action over photos or gradients. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-card` | The dark payment card as frosted glass under a moving sheen. Pure CSS. | Checkout, wallet and billing screens. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-prompt-input` | The AI prompt box on frosted glass; a real labelled textarea. | Chat and AI products over a hero image. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-switch` | The switch on a frosted track with a light glass thumb; role switch. | Settings over rich backgrounds. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-tabs` | The tab bar as frosted glass with a sliding highlight; arrow keys, Home and End. | Segmented navigation floating over imagery. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-audio-player` | The dark audio deck as frosted glass with the synthesised demo track; never autoplays. | Music, podcast or ambient-sound features. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-panel` | Wraps any content in a frosted glass panel: blur, grain, lit edge, pointer sheen. | Overlays, hero cards, menus and popovers. | Tactile Glass UI (uixNinja, MIT) |
| `frosted-backdrop` | A soft drifting colour field under fine grain, in the brand colours; the stage for frosted panes. | Behind a hero or sign-in panel. | Tactile Glass UI (uixNinja, MIT) |

## Loaders

| id | what it does | use it for | idea from |
|---|---|---|---|
| `logo-trace-loader` | Traces a mark's outline and resolves into the filled mark; loops or runs once. | Page and route loading states, splash screens, empty states. | Kitchen |
| `ai-state-loading` | A list of steps that move from pending to active to done with a spinner and check, driven by props or autoplay. | publishing list, long-running job, connect page, import or build progress | Kokonut UI |

## Feedback

| id | what it does | use it for | idea from |
|---|---|---|---|
| `toast` | Spring-in notifications with icons that draw to match the state (success, error, info, loading), pause on hover, stack and collapse. Call toast('Saved') from anywhere; mount <Toaster /> once. | Copied, saved, signed out, upload failed, published: any confirmation or error in the dashboard, publishing and connect pages. | Sileo |
