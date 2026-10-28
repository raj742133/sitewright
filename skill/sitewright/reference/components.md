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

## Catalogue expansion (226 components)

Every component in this section is original code written for Sitewright (no animation, 3D or chart library; React, CSS, SVG, Canvas 2D and raw WebGL only). They respect `prefers-reduced-motion`, work with keyboard and touch, fall back to a still or CSS rendering when WebGL is unavailable, and take their colours from the theme tokens. Each passed `tools/component-smoke.mjs` (render, phone width, keyboard focus, reduced motion, no-WebGL, cleanup) in one combined production build; the per-entry record is in `docs/catalog-manifest.json` and `docs/catalog-coverage.md`.

### Text effects (26)

| id | what it does | use it for |
| --- | --- | --- |
| `asciitext` | A word rendered as living ASCII art: characters swell in a travelling wave, the pointer acts as a lens and clicks send ripples. | Hero word or logotype for a developer, terminal or retro-tech landing page (fills its parent). |
| `circular-text` | Text set around a ring that turns slowly; hover can speed it up, slow it, reverse it or pause it, and a centre slot holds an icon or label. | Rotating badge beside a hero heading, a 'scroll down' or 'new' sticker, or a footer seal. |
| `curved-loop` | A marquee that scrolls along an arched line; drag to scrub and flip direction, arrow keys and Space steer it. | Full-width ticker between landing sections, announcement or client-name band. |
| `depth-text` | Big text with a solid shaded extrusion whose direction follows the pointer; arrow keys steer it and touch screens get a slow sway. | Section title or hero word on a landing page where a bold 3D feel is wanted. |
| `echo-text` | Solid text followed by outlined echoes that ripple outwards (or trail away) and fade; hover or tap throws them further. | Hero headline or a single emphasised word on a landing page or announcement band. |
| `falling-text` | A sentence whose words drop under gravity, bounce and pile up on the bottom edge; trigger by click, hover, scroll or button, then Reset. | Playful 404 or empty state, closing statement of a landing page, quote reveal. |
| `fold-text` | Text cut into panels that fold like a 3D accordion: breathes on its own, previews on hover or focus, and click pins it folded. | Hero word or section title that reacts on hover; a toggleable headline. |
| `fuzzy-text` | Canvas text whose scanlines tremble sideways for a furry static edge; the pointer or a touch raises the interference. | 404 or error headings, retro or broadcast-styled hero text. |
| `glitch-text` | Text with a brand-coloured chromatic split and torn slices that jump in short bursts (loop) or on hover; pure CSS. | Hero or error heading, tech or gaming landing pages; can be a real h1/h2 via the as prop. |
| `masked-heading` | A heading whose lines rise out of a clipping mask on scroll, filled with a drifting brand gradient and a pointer-following highlight. | Section and hero headings on landing pages (renders a real h1/h2/h3). |
| `particle-text` | A word built from thousands of canvas particles that gather into place, are pushed away by the pointer and spring back; click or Enter scatters them, touch gets a drifting ripple. | Landing hero word, 404 or empty-state title, brand moment (fills its parent; give it a height). |
| `shuffle` | Letters trade places through several random arrangements of the line, then settle back into reading order; plays on view, hover, tap or Enter. | Playful hero headings, section titles, game or event pages. |
| `split-flap-text` | A departure-board display where each character flips through its drum one flap at a time; cycles a word list or follows the text prop. | Status boards, rotating destinations or product names, countdown-style headers. |
| `stroke-text` | Big outlined type whose gradient stroke draws itself along the glyph contours, then fills in; replays on hover, tap or Enter. | Hero words, section openers and brand statements. |
| `tech-text` | A HUD-style readout with corner brackets, status lamp, scan bar and ruler around monospaced text that decodes out of noise and glitches briefly each pass. | Status lines, developer or security product heroes, system banners. |
| `text-cursor` | Text that types itself, rests, deletes and moves to the next phrase, with a blinking caret you can style as bar, block or underscore. | Hero taglines, terminal mockups, rotating value propositions. |
| `text-loop` | A sentence with one rotating word slot that swaps words by slide, blur or roll while the slot glides to each word's width; pauses on hover, focus or a button. | Hero headlines such as 'Ship faster / safer / together'. |
| `text-pressure` | Letters squash, thicken and warm toward the primary colour under a press that follows the pointer and deepens while held. | Hero words or section titles that should react to touch and hover. |
| `true-focus` | A sentence where one word is sharp inside a bracketed focus frame that glides between words while the others blur. | Hero statements and feature one-liners where words are taken in one at a time. |
| `variable-proximity` | Each letter blends from a light sans to a heavy italic serif by its distance to the pointer, without reflowing the line. | Large display headings that invite the pointer. |
| `warp-text` | Text on a rippling baseline with a fisheye lens that swells, spreads and tilts the letters around the pointer. | Playful hero words, landing-page splashes and 404 headings. |
| `typography-vortex` | Concentric rings of letters whirl around a centre; the pointer pulls letters in and a click sends a shockwave through the rings. | Decorative hero background or empty-state art (fills its parent). |
| `semantic-bloom` | A wordmark that blooms into related words on gooey liquid bridges; choosing a word makes it the new centre. Accepts your own word graph. | Topic or tag explorers, brand-word hero sections (fills its parent). |
| `text-path-studies` | Five Canvas2D studies of text set along paths: a draggable letter globe, a pointer-lifted cloth, ripples through rows, a bouncing spiral ball and a morphing path. | Showcase sections and creative portfolios; pick one study with the variant prop (fills its parent). |
| `gallery-heading` | A heading over a 3D ring of generated print-style tiles (flat, grain, dither, halftone, glitch, noise); it turns by itself, by buttons, keys or drag. | Portfolio or collection intro sections (fills its parent). |
| `article-headings` | Four editorial heading treatments in one component: decode from noise, neon sign power-up, particle assembly and an equaliser backdrop. | Article, blog and campaign headings; choose a treatment with the variant prop. |

### Motion and scroll (14)

| id | what it does | use it for |
| --- | --- | --- |
| `scroll-float` | A headline whose letters float up into place with overshoot, tilt and stagger, scrubbed by scroll position. | Section headings on long landing pages; works inside a scrolling panel or on the page. |
| `scroll-reveal` | A passage that comes into focus word by word as you scroll: dim and blurred, then a brand-coloured reading head, then ink, with a progress rail. | Manifesto or about paragraphs and long intros; works inside a scrolling panel or on the page. |
| `scroll-velocity` | Rows of big type that drift at a calm pace and surge, skew and reverse with scroll speed and direction. | A divider band between landing sections, client or feature tickers; works inside a scrolling panel or on the page. |
| `animated-content` | A reveal wrapper that slides, scales, rotates and un-blurs its content in when it scrolls into view, with per-child stagger, easing presets and a replay-friendly once/repeat switch. | Wrap a section, card group or list to reveal it as the page scrolls (direction, distance, threshold, once, stagger, easing). |
| `cubes` | A field of CSS 3D cubes that flip as the pointer sweeps over them and tilt toward it, with a slow wave and self-flips for touch. | Behind a hero or as a playful empty-state backdrop (first child of a position:relative section; fills its parent). |
| `elastic-mesh` | A grid of spring-linked nodes that stretches toward the pointer, wobbles back, and can be plucked by press or tap. | Behind a hero or playful section (first child of a position:relative section; fills its parent). |
| `electric-border` | Wraps any content in a crackling electric arc that runs around its rounded edge. | Around a featured card, pricing tier or call-to-action (wraps its children; set radius to match). |
| `electric-logo` | Electric arcs and sparks crackle around the outline of a mark; supply your own SVG path or SVG children (a neutral gem mark is the default). | Hero brand mark, loading screen or footer sign-off; pass path="M..." or SVG shapes as children. |
| `fade-content` | An opacity-first reveal wrapper: fade in once, fade in and out as it enters and leaves, or scrub the opacity with scroll position so content dissolves at the edges of its scroll area. | Wrap long lists, gallery cards or article blocks that should dissolve into view or out of it. |
| `gradual-blur` | A progressive edge blur built from stacked backdrop-filter layers with overlapping masks, on any combination of edges, with strength, depth, curve and tint. | Drop inside a position:relative scroll area or panel to soften its top, bottom or side edge. |
| `logo-loop` | A seamless endless row or column of logos with edge fade, pause on hover, focus and button, and a plain scrollable row under reduced motion. | A "trusted by" strip under a hero, or a vertical partner list in a sidebar. |
| `meta-balls` | Gooey blobs drift on looping paths and fuse where they meet, with a lit rim; the pointer carries an extra blob. | Behind a hero or loading state (first child of a position:relative section; fills its parent). |
| `ribbons` | Soft tapered ribbons that trail the pointer on springs, or swim on looping paths when idle or on touch. | Behind a hero or as a cursor-follow accent (first child of a position:relative section; fills its parent). |
| `scroll-expand` | A framed picture that grows to full bleed as you scroll while the headline splits apart, then the page content continues below. | A story or product opener; works as its own scroll area or with page scroll. |

### Pointer and cursor (14)

| id | what it does | use it for |
| --- | --- | --- |
| `blob-cursor` | A gooey blob chases the pointer with droplets that stretch behind it and merge back; it swells over links and buttons, squashes on press and follows keyboard focus. | Over a hero or portfolio section as a playful pointer follower (wraps its content; add global to cover the page). |
| `crosshair` | Full-length guide lines, edge rulers, a reticle and a live x / y readout follow the pointer; keyboard focus moves them onto the focused element. | Design tools, coordinate pickers, blueprint-style or technical product sections (wraps its content). |
| `cursor-grid` | A lattice of dots that swell, warm up and bend away from the pointer, then cool down; taps send a ring through the grid. | Hero backdrops and feature sections that should react to the pointer (wraps its content). |
| `ghost-cursor` | A translucent glowing ghost pointer drifts behind the real one, trailing fading afterimages and a wavering wisp; it wanders and taps by itself when idle. | Atmospheric landing sections and demos that show 'someone else' using the page (wraps its content). |
| `glare-hover` | A glossy band sweeps across the wrapped content away from the edge the pointer entered by; focus and taps replay it, touch plays it on a timer. | Wrap a card, image, button or pricing tier to give it a premium sheen on hover. |
| `image-trail` | Images drop along the pointer path at regular distances, pop in tilted, drift on and fade out; taps drop a burst, idle plays a ghost trail. | Portfolio, agency and gallery hero sections (pass your own image URLs via images). |
| `pixel-trail` | Square pixels light up under the pointer and fade out in crisp steps, leaving a pixel-art trail; taps burst, idle paints by itself. | Retro, game or developer-tool sections as a playful pointer trail (wraps its content). |
| `shape-blur` | A soft shape that chases the pointer on a spring, blurring and stretching with speed, sharpening at rest and drifting on its own when idle. | Behind a hero or empty state (fills its parent; layer content on top via children). |
| `splash-cursor` | The pointer stirs a small live fluid: ink in the theme colours swirls, curls and fades; a press bursts outward; reduced motion shows a still frame. | Hero sections for creative or music products that want a fluid, colourful pointer reaction (wraps its content). |
| `star-border` | A container, button or link whose border is circled by glowing four-point stars with comet tails, speeding up on hover and focus. | Highlight a primary call to action or a featured pricing card. |
| `sticker-peel` | A sticker with a corner that curls with a computed fold line, backing paper and shading: hover near the corner, drag to peel, keyboard arrows to adjust. | A playful decorative sticker on a card, device mock-up or hero collage. |
| `swarm-cursor` | A small flock of agents flies after the pointer, orbiting it at rest and stretching out when it moves; a press scatters them. | Playful landing sections and 404 pages (wraps its content). |
| `target-cursor` | Four corner brackets spin around the pointer and snap onto links and buttons you hover or focus; touch cycles through targets and locks onto taps. | Dashboards, game or sci-fi styled pages where interactive elements should feel 'lockable' (wraps its content; selector chooses the targets). |
| `border-glow` | A surface with a glowing edge that follows the pointer and leaks a soft halo; a slow light circles the border when idle, and focus lights it up. | Wrap pricing cards, feature tiles or call-out panels. |

### 3D and shader scenes (26)

| id | what it does | use it for |
| --- | --- | --- |
| `crystalized-ball` | A faceted crystal sphere of flat voronoi facets with per-facet lighting and glints that turns slowly and leans toward the pointer. | Hero accent or feature visual (centred in its parent, which it fills; sphere fits the smaller side). |
| `laser-flow` | Volumetric laser beams sweeping across a dark stage with pulses running down each beam and a soft haze; beams lean with the pointer. | Dark hero or event/launch section background (first child of a position:relative section; fills its parent). |
| `metallic-paint` | A pool of liquid chrome: a warped height field lit as a mirror reflecting a brand-tinted studio, with a thin-film sheen; the pointer dents it. | Hero panel, brand card or banner background (fills its parent). |
| `ripple-distortion` | A picture seen through water: pointer movement, clicks and taps send rings across it that bend and split the light. | Hero image or feature visual; pass src for your picture (fills its parent), or leave it out for the built-in pattern. |
| `model-viewer` | A tiny 3D viewer for shapes built in code (cube, gem, low-poly rock) with drag-to-orbit, wheel and keyboard orbit and zoom. | Product or brand 3D previews where model files are overkill (fills its parent). |
| `ferrofluid` | Glossy black magnetic liquid puddles drifting about, with a lattice of sharp spikes that rises where a magnet (the pointer) is near. | Behind a bold hero or a product reveal (first child of a position:relative section; fills its parent). Falls back to a static CSS rendering without WebGL. |
| `galaxy` | A spiral galaxy of a couple of thousand stars with a glowing core, tilted in 3D and slowly rotating; the pointer tips the disc. | Behind a landing hero, a launch or space-themed section (first child of a position:relative section; fills its parent). Dark space in dark themes, a pale star chart in light ones. |
| `light-tunnel` | A shader tunnel of square light rings with broken segments racing toward a glowing vanishing point that the pointer steers. | Behind a launch, event or product hero (first child of a position:relative section; fills its parent). |
| `liquid-chrome` | A reflective liquid-metal sheet drawn by a shader: a flowing height field lit as a mirror so dark and light bands slide across it; the pointer dents it. | Behind a bold product or brand hero (first child of a position:relative section; fills its parent). |
| `liquid-ether` | Colour that flows like ink in water from curl-noise currents in the brand colours, swirled by the pointer. | Behind a landing hero or AI/product section (first child of a position:relative section; fills its parent). |
| `molten-metal` | Glowing flowing metal drawn by a shader: a dark cooled crust broken by seams burning primary to signal to white; the pointer heats it. | Behind a bold hero or forge-style feature section (first child of a position:relative section; fills its parent). |
| `liquid-form` | A ray-marched metallic liquid blob of smoothly merging spheres with a reflective sky; the pointer drags a lobe around. | Hero accent or loading visual (centred in its parent, which it fills). |
| `crt-screen` | A curved-glass CRT shader (barrel curvature, scanlines, aperture mask, bloom, flicker) showing a terminal, a test pattern, static or an arcade title screen chosen by the screen prop. | Behind a retro or developer-tools hero, 404 page or terminal-style section (fills its parent). |
| `network-globe` | A dotted globe of nodes and arcs with FBM atmosphere glow; drag to spin with inertia, arrow keys rotate, pulses travel along the arcs. | Hero visual for infrastructure, network or global-reach pages (fills its parent; the globe fits the smaller side). |
| `liquid-metal-button` | A WebGL liquid-chrome button in pill and orb shapes: a bevelled reflective rim with edge dispersion, a flowing dark face, hover bloom and a click ripple, with a CSS chrome fallback. | A premium hero call to action or play button on a dark section. |
| `moss-forest-world` | A procedural mossy forest glade with layered trunks, light shafts, a moss-capped root arch, swaying ferns and drifting pollen; the variant prop turns it into spring blossoms, autumn leaves or winter snow, and the pointer shifts the layers for parallax. | Behind a landing hero, an about page or a nature section (fills its parent, which should be positioned); pick `variant` by season. |
| `night-temple-scene` | A procedural night scene of a tiered pagoda and hall on a mountain under a moon, with layered ridges, drifting mist, rain, flickering lantern glow and ripples on wet ground (invented, generic forms). | Behind a hero, a 404 page or an atmospheric section (fills its parent, which should be positioned). |
| `landscape` | A procedural 3-D terrain rendered by a column-marching heightfield renderer, with sunrise, noon, sunset or night skies and clear, rain, storm (lightning), snow or fog weather; the pointer pans and tilts the camera. | Behind a hero, a weather or travel section (fills its parent, which should be positioned); set `time` and `weather`. |
| `landscape-towers` | A dusk landscape where invented tower forms (tiered pagoda-like, minaret-like, stupa-like, lighthouse-like and stacked spire) build up from their foot; show one with `variant` or all five as an ensemble, mirrored in water. | Hero or section backdrop for travel, culture or architecture pages (fills its parent, which should be positioned). |
| `bookshelf-3d` | A room with a bookshelf whose books stand on a rotating ring: pick one to bring it to the front, then open it and turn its pages with a 3-D flip; covers are generated and keyboard and touch work. | Library, reading list, product or catalogue showcase (fills its parent; pass `books`). |
| `structure-flow` | Six particle studies drawn as projected 3-D points in the host ink with accent tints: geodesic dome, horizon field, nested orbits, funnel vortex, data matrix and rising embers; the pointer turns the view. | Behind a hero or data/AI product section (fills its parent, which should be positioned); choose `variant`. |
| `warp-field` | A warp tunnel of additive light streaks with keycap-like letter tiles flying past in perspective; the pointer steers the vanishing point. | Behind a launch or speed-themed hero, a typing or keyboard product section (fills its parent, which should be positioned). |
| `woven-cloth` | A hanging cloth simulated with Verlet physics and wind, woven from procedural threads (plain, twill or basket) and printed with text; the pointer dents and drags the weave. | Textile, fashion or craft hero, or a banner section (fills its parent, which should be positioned); set `text` and `weave`. |
| `diagnostics-panel` | A diagnostics card with three Canvas 2D illustrations (stacked layer planes, a node cube, a rippling mesh) chosen with an accessible tab list. | System, model or network health screens; a dashboard tile that explains structure with a moving diagram. |
| `laser-field` | Pointer-reactive laser beams in a WebGL shader with three layouts: a fan from the floor, a vanishing-point grid and a prism that splits one beam into a spectrum. | Behind a hero or event page (first child of a position:relative section; fills its parent). |
| `wireframe-forms` | A rotating wireframe cube, three crossing cylinders or a latitude/longitude sphere drawn on a canvas with depth-faded lines; drag to spin, arrow keys nudge. | A technical hero accent or empty-state illustration (fills its parent). |

### Animated backgrounds (58)

| id | what it does | use it for |
| --- | --- | --- |
| `dither-veil` | A drifting noise veil quantised through an ordered 8x8 dither into crisp brand-coloured dots, densest on one edge and thinning around the pointer. | Overlay on a hero or card edge to fade content into texture (transparent canvas; fills its parent, put above the backdrop and below the text). |
| `strands` | A bundle of fine threads that braid and pinch as they flow across the box and part around the pointer. | Behind a hero, divider band or footer (first child of a position:relative section; fills its parent). |
| `acid-squares` | A grid of squares that swell, spin and shift between the brand colours as interference waves roll across it; the pointer swells them. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `aero-shards` | Translucent glass shards at several depths drifting and turning over a soft sky gradient, with bevelled edges and pointer parallax. | Behind a product hero or sign-in panel (first child of a position:relative section; fills its parent). |
| `antigravity` | Weightless specks that drift upward with a slow sway, streak with speed and are shoved aside and lifted by the pointer. | Behind a hero, empty state or footer (first child of a position:relative section; fills its parent). |
| `balatro` | A pixelated, posterised vortex shader: domain-warped spiral folds cut into four flat brand tones with inked contours. | Behind a game, event or bold landing hero (first child of a position:relative section; fills its parent). |
| `ballpit` | A pit of shaded balls with gravity and circle collisions that fall, bounce and heap up; the pointer pushes them around. | Behind a playful hero, 404 or footer (first child of a position:relative section; fills its parent). |
| `color-bends` | Soft diagonal ribbons of brand colour that fold and flow like bent paper; the pointer pushes a bulge through them. | Behind a landing hero or feature section (first child of a position:relative section; fills its parent). |
| `crtwarp` | A glowing signal field seen through barrel-curved CRT glass with scanlines, phosphor mask, colour fringing, a rolling bar and vignette; the pointer tears the picture. | Behind a retro, developer or terminal-themed hero (first child of a position:relative section; fills its parent). |
| `dark-veil` | Hanging curtains of dark, slowly breathing folds lit from below by the signal colour and along their crests by the primary; stays deep in light and dark themes. | Behind a premium or night-mode hero or CTA (first child of a position:relative section; fills its parent). |
| `dither` | An animated wave field quantised with an 8x8 ordered Bayer dither into square pixels in brand tones; the pointer raises a bump. | Behind a retro or technical hero (first child of a position:relative section; fills its parent). |
| `dot-field` | A grid of dots that swell with a diagonal wave; the pointer pushes them aside on springs and tints them. | Behind a hero or section header (first child of a position:relative section; fills its parent). |
| `evil-eye` | A bloodshot slit-pupil eye whose iris and lids follow the pointer, blinking now and then and glancing about on its own on touch. | Behind a spooky hero, a 404 page or a security or monitoring panel (first child of a position:relative section; fills its parent). |
| `faulty-terminal` | A glitching terminal screen: scrolling log lines, tearing bands with RGB split, corrupted characters, scanlines and a blinking prompt; the pointer scrambles the lines under it. | Behind an error page, a developer-tool hero or a system-status section (first child of a position:relative section; fills its parent). |
| `floating-lines` | Many thin gradient lines swaying across the width on slow waves with glowing beads drifting along them; lines bend away from the pointer. | Behind a calm landing hero or a pricing section (first child of a position:relative section; fills its parent). |
| `flux-lines` | Magnetic field lines traced between moving poles with pulses flowing along them; the pointer acts as a pole that bends the field. | Behind a technical or science-flavoured hero, a network or energy product page (first child of a position:relative section; fills its parent). |
| `ghost-fibers` | Pale fibres rising from the bottom edge like optical strands, swaying on slow waves, ending in soft glowing tips; the pointer blows them aside. | Behind a quiet hero, a footer or a network or connectivity section (first child of a position:relative section; fills its parent). |
| `gradient-ascii` | ASCII art shaded by an animated gradient: each character cell picks a glyph by density and is tinted from the primary to the signal colour; the pointer raises a rippling bloom. | Behind a developer-tool, terminal-flavoured or retro hero (first child of a position:relative section; fills its parent). |
| `gradient-blinds` | A row of vertical blinds filled with a drifting brand gradient; slats swing on a travelling wave and the ones near the pointer turn to face it. | Behind a bold hero, a feature banner or a section divider (first child of a position:relative section; fills its parent). |
| `gradient-waves` | Layered filled waves blending the signal colour into the primary, rolling in from the bottom with bright crests; the pointer lifts a swell and slides the layers in parallax. | Behind a landing hero or a footer (first child of a position:relative section; fills its parent). |
| `grainient` | A slow gradient of drifting brand-colour fields with film grain over it; pure CSS, so it costs almost nothing. | Behind a landing hero, pricing band or sign-in panel (first child of a position:relative section; fills its parent). |
| `grid-distortion` | A line grid that bends away from the pointer and springs back; taps send ripples through it and a slow swell keeps it alive when idle. | Behind a hero or feature section where the page should feel responsive to the cursor (first child of a position:relative section). |
| `grid-motion` | A tilted wall of tiles whose rows slide in alternating directions; a slow marquee runs by itself and the pointer shoves the rows sideways. | Behind a hero or a product-gallery teaser (first child of a position:relative section). |
| `grid-scan` | A measuring grid with crosshair marks that a slanted scan line sweeps across, lighting cells that fade out behind it; the pointer lights nearby cells. | Behind a technical or security hero, a dashboard empty state or a loading screen (first child of a position:relative section). |
| `hyperspeed` | A star-warp of streaks flying out of a vanishing point; the pointer steers it and press-and-hold boosts to hyperspeed. | Behind a launch hero, a call to action or a 'getting started' step (first child of a position:relative section). |
| `iridescence` | An oil-slick thin-film surface drawn by a fragment shader, pulled toward the brand colours, with a soft sheen; the pointer presses a dent into it. | Behind a hero, a card or a feature banner (first child of a position:relative section; static CSS gradient without WebGL). |
| `letter-glitch` | A field of monospace characters that keep flipping to new glyphs and blending between ink and brand colours, with occasional row tears. | Behind a developer-tool hero, a 404 page or an error state (first child of a position:relative section). |
| `lightfall` | Comet streaks of light fall in three depths, land on a glowing horizon and ripple out; the pointer leans the fall sideways. | Behind a hero, a footer call to action or a quiet content break (first child of a position:relative section). |
| `lightning` | Branching lightning bolts strike by themselves, flicker and flash the sky; click or tap calls a strike at that point. | Behind a high-energy hero, an outage page or a 'power' feature block (first child of a position:relative section). |
| `light-pillar` | Vertical beams of light rise from a glowing floor with a hot core, slow shimmer and drifting embers; the pillar nearest the pointer swells. | Behind a hero, an award or launch announcement, or a pricing highlight (first child of a position:relative section). |
| `light-rays` | Soft shafts of light fan down from a source above the top edge, swaying and breathing; the pointer slides the source sideways. | Behind a landing hero, pricing or sign-in section (first child of a position:relative section; fills its parent). |
| `line-waves` | A stack of thin horizontal lines rippling like a ridge of waves in a primary-to-signal gradient; the pointer lifts a bump through them. | Behind a hero, footer or data section (first child of a position:relative section; fills its parent). |
| `magic-rings` | Concentric rings of dashed arcs, tick marks and orbiting sparks turning in alternating directions around a glowing core, with a pulse; the pointer shifts the depth. | Behind a feature, loading or hero section (first child of a position:relative section; fills its parent). |
| `magnet-lines` | A field of short lines that all rotate to point at the pointer and glow as they near it; a virtual magnet roams when idle or on touch. | Behind a hero or call-to-action section (first child of a position:relative section; fills its parent). |
| `micro-slats` | Fine vertical slats that tilt and shade toward a light following the pointer, with a glint on the lit edge; a light sweeps across when idle or on touch. | Behind a gallery, hero or footer section (first child of a position:relative section; fills its parent). |
| `pattern-waves` | A repeating pattern of dots, diamonds or crosses bent and resized by travelling waves; the pointer sends a ripple through it. | Behind a hero, pricing or footer section (first child of a position:relative section; fills its parent). |
| `pixel-blast` | Square pixels blast outward in ragged rings with glowing debris behind the front, on a timer and on every click or tap. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `pixel-snow` | Square pixel flakes fall in three depth layers over a dusk gradient and settle into a stair-stepped drift; the pointer pushes them aside. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `plasma` | A classic plasma field of interfering sine waves on a primary-to-signal colour ramp; the pointer adds a rippling source (WebGL, CSS gradient fallback). | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `plasma-wave` | Eight glowing ribbons of plasma undulate across the width with bright cores and soft halos; the pointer height bends them (WebGL, CSS fallback). | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `prism` | A light beam enters a glass prism and leaves as a fan of colour bands from primary to signal; the pointer tilts the incoming beam. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `prismatic-burst` | Rays radiate from the centre with a colour fringe that widens with distance, a pulse ring and a shock ring on each click (WebGL, CSS fallback). | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `radar` | A radar scope with range rings, a tick bezel and a sweeping beam whose trail lights blips that ping and fade until the next pass. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `ripple-grid` | A lattice of lines and nodes heaved by ripples that start by themselves, on clicks and taps, and (smaller) as the pointer moves. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `scanner` | A scan line sweeps down a grid of data cells that flare and burn out behind it; the pointer locks a target bracket onto a cell. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `shape-grid` | A grid of circles, squares, triangles and diamonds that swell, turn and warm in colour near the pointer; an idle hand wanders when there is none. | Behind a landing hero, pricing or campaign section (first child of a position:relative section; fills its parent). |
| `shape-waves` | Rows of triangles, circles, squares or diamonds riding travelling sine waves, turning with the slope and swelling near the pointer. | Behind a landing hero, feature band or empty state (first child of a position:relative section; fills its parent). |
| `side-rays` | Soft shafts of light entering from the left and right edges in the brand colours, breathing and swaying; the left source follows the pointer height. | Behind a hero or pricing section where light from the side frames the content (first child of a position:relative section; fills its parent). |
| `silk` | Soft flowing satin: overlapping translucent ribbons with a sheen band that read as folds of cloth; the pointer gathers them. | Behind a landing hero, sign-in panel or footer (first child of a position:relative section; fills its parent). |
| `sliced-waves` | Three wave bands cut into vertical slabs with thin gaps; slabs near the pointer lift. | Behind a hero, stats band or footer (first child of a position:relative section; fills its parent). |
| `threads` | Flowing hairline threads that pinch together at two waists and fan out again; they bend away from the pointer. | Behind a hero or section divider (first child of a position:relative section; fills its parent). |
| `topography` | An animated contour map: a drifting height field traced into iso-lines with marching squares; the pointer raises a hill. | Behind a hero, docs landing or 404 page (first child of a position:relative section; fills its parent). |
| `web-threads` | A spider-web of spoke and ring threads on spring joints that the pointer plucks; they ring and settle, with an idle ghost pluck. | Behind a hero, error page or contact section (first child of a position:relative section; fills its parent). |
| `predictive-arc` | Five generative Canvas 2D scenes selected by variant: a pixel-grid horizon arch, pulses on a signal network, flowing ribbons, a halftone dot matrix and flow-field trails. | Behind a product or analytics hero (first child of a position:relative section; fills its parent). |
| `spark-badge` | A luminous credential badge assembled from particles that spring home, scatter from the pointer and shed embers on curl-noise currents. | Hero visual for a membership, certificate or sign-up page (fills its positioned parent; the badge is centred). |
| `elemental-fields` | Four generative fields in one component: rippling water, branching lightning, rising fire and beading condensation on glass. | Behind a hero, feature band or empty state (first child of a position:relative section; fills its parent). |
| `constellation-field` | Particle networks in four styles: drifting linked nodes, a parallax star sky, a springy lattice and orbiting hubs; the pointer pulls or pushes the nodes. | Behind a landing hero, footer or sign-in panel (first child of a position:relative section; fills its parent). |
| `portal-field` | Ambient particle fields: a rotating noise-shaped cloud, a resonant plate whose grains settle on nodal lines, and streams converging on a focal portal that follows the pointer. | Behind a hero or call-to-action band (first child of a position:relative section; fills its parent). |

### Media (7)

| id | what it does | use it for |
| --- | --- | --- |
| `halftone-reveal` | A picture shown as a rotated halftone dot screen that a soft circular wipe from the pointer (or the centre on scroll-in) turns into the full-colour image. | Feature images, team portraits or cards that reveal on hover, tap or when scrolled into view. |
| `orbit-images` | Pictures travelling around an elliptical orbit with depth scaling and dimming at the back, pausing on hover; Space pauses and arrows step the ring. | A hero visual or about-page centrepiece around a badge, logo or headline (fills its parent). |
| `pixel-swap` | A picture swap done in tiles: each square squashes over to the next picture on its own beat, in random, diagonal, row or ripple order, with controls and optional autoplay. | A hero or product image that changes between views, with previous/next controls. |
| `pixel-transition` | A hover, focus or tap transition that pixelates one picture into chunky blocks in a few stages and resolves it into another. | A before/after, day/night or team-photo card that switches pictures on interaction. |
| `fluid-glass` | A draggable glass lens that magnifies and refracts the scene behind it, with an edge displacement map and a slight colour split. | Over a hero image, product shot or chart to inspect detail; give it static markup as children. |
| `image-ribbon` | A spiral ribbon of curved artwork panels orbiting in CSS 3D, built from narrow slices; drag or arrow keys turn it and a button pauses it. | A gallery or portfolio hero (fills its parent). |
| `page-curl-book` | A paper sketchbook of invented SVG drawings with a drag-driven page curl, a magnifier lens, arrow-key page turns and prev/next buttons. | Portfolio and lookbook showcases, product catalogues, story pages (fills its parent). |

### Cards and galleries (31)

| id | what it does | use it for |
| --- | --- | --- |
| `accordion-gallery` | A row of image panels where one is open and the rest collapse to slim strips; click, hover or arrow keys switch, and it stacks vertically in narrow containers. | Portfolio or destination showcases (fills its parent; give the parent a height). |
| `animated-list` | A feed whose rows rise in one by one, slide in when added and fold away when dismissed, with arrow-key navigation and Delete to dismiss. | Activity feeds, notifications and inboxes (scrolls inside its parent). |
| `bounce-cards` | A fan of cards that bounces into place on scroll; hover or focus lifts one and nudges the others, click gives a hop and reports the choice. | Hero visuals, gallery teasers and "pick a card" selectors. |
| `card-swap` | A stacked card deck where the front card drops away and returns to the back; buttons, dots, arrow keys and a pausable autoplay switch cards. | Feature walkthroughs and step previews beside hero copy. |
| `carousel` | A plain, accessible slide carousel with previous/next buttons, pagination, arrow/Home/End keys, swipe or drag, optional autoplay that pauses on hover and focus, and one to four slides per view. | Featured content, product or case-study slides, testimonials (give it a height or an aspect ratio). |
| `chroma-grid` | A grid of tinted link/button cards where a pointer or focus spotlight keeps colour while the rest of the grid greys out. | Team pages, partner grids and directory listings. |
| `circular-carousel` | Cards on a wheel of which only the top arc shows; the chosen card sits at the top, larger and brighter. Drag to spin, click a card, buttons and arrow keys. | Picking one of 6 to 16 options visually: destinations, templates, team members. |
| `circular-gallery` | A 3D cylinder of picture panels that turns slowly by itself; drag to spin with inertia and settle on a panel; pauses on hover and focus. | Portfolio or album showcase on a landing page (fills its parent). |
| `decay-card` | A card whose picture frays away like old paper under hover or focus, with a button to let it crumble fully and restore it; an SVG-filter effect. | Editorial, archive or story cards with an artwork area. |
| `depth-carousel` | A deck of cards in 3D: the front card is sharp, the ones behind step back, shrink and soften; swipe, click a card behind or use the buttons and keys. | Featured stories, release notes or case studies where order matters. |
| `dome-gallery` | Pictures on the inside of a dome: look around by dragging (with inertia), move tile to tile with the arrow keys, click a tile to bring it to the centre. | An immersive gallery section or event recap (fills its parent). |
| `drift-wall` | A tilted wall of tiles whose columns drift up and down endlessly at different speeds; stops on hover and focus, has a pause button, still under reduced motion. | Hero backdrop or social-proof wall of work, customers or photos. |
| `flex-carousel` | A row of picture panels where one is open and captioned and the others are slim strips, swapping with flex-grow; stacks vertically in narrow containers. | Compact feature or destination picker (3 to 8 panels). |
| `flying-posters` | Posters fly out of the distance toward you through a 3D tunnel; the pointer steers, hovering freezes it, speed buttons and keys; holds still under reduced motion. | Event, film or launch teaser sections (fills its parent). |
| `folder` | A drawn folder that opens to fan out the papers inside; click, Enter or Space toggles, hover peeks, and paper content is real DOM. | File collections, resource bundles and download groups. |
| `glass-icons` | A row of frosted-glass icon tiles on tilted colour cards; hover or focus fans the card out and shows the label. | Feature shortcuts, app launchers or a compact link row over a colourful backdrop. |
| `infinite-spiral` | Pictures laid along a spiral that winds into the centre and flow outward and grow as they near you, forever; drag, buttons, keys, click to bring one forward. | A playful gallery or archive teaser (fills its parent). |
| `lanyard` | A name badge hanging on a strap with verlet rope physics; drag the badge to swing it or push it with the arrow keys. | Team, speaker or event pages; fills its parent, which should be at least 200px tall. |
| `magic-bento` | A bento grid of cards with a pointer spotlight that lights card borders as it passes and a gentle tilt on the hovered card. | Feature overviews on a landing page; pass your own cells with title, body, icon and size. |
| `masonry` | Tiles of different heights packed into responsive columns by shortest-column placement, with reveal-on-scroll, hover captions and optional selection. | Photo walls, inspiration boards and portfolio grids (scrolls inside its frame). |
| `pixel-card` | A card covered by tiny squares that bloom outward from the pointer or focus point and shimmer, then fold away; drawn on canvas. | Feature cards and call-outs that should wake on interaction. |
| `profile-card` | A person card with banner, generated avatar, status dot, bio, stats and Follow / Message actions, plus a pointer-driven foil sheen; adapts to its container width. | Team, author and community member pages. |
| `reflective-card` | A glass card on a glossy floor with a faded mirrored reflection and a highlight that follows the pointer (drifts on its own otherwise). | Product, ticket or pass showcases on a plain backdrop. |
| `scroll-stack` | Cards that pile up as you scroll: each sticks near the top while the next slides over it and the covered ones shrink and dim; includes a card navigator. | Step-by-step explainers and process sections (scrolls inside its frame). |
| `stack` | A pile of cards: drag, flick or click the top card to send it to the back; arrows and buttons do the same. | Tips, testimonials or onboarding steps in a small space. |
| `flip-card` | A card that turns over to reveal a second face on click, Enter or Space, with an instant swap under reduced motion. | Feature highlights, glossary items and before/after reveals. |
| `folder-float` | A gently bobbing folder that opens its flap and floats its files up into a fan you can pick from. | Project and file pickers, document hubs and empty states. |
| `refine-frame` | A frame holding a soft draft picture that snaps into focus as its corner marks tighten and a focus line sweeps through. | Before/after image treatments, upscale or enhance actions and AI-image previews. |
| `character-carousel` | An editorial profile-card carousel in two layouts, a flat filmstrip and a perspective wave, with invented illustrated characters; drag, wheel, arrows and keyboard, looping. | Team, cast or testimonial profiles on an about page; pass your own `items`. |
| `engraved-certificate` | A certificate drawn in SVG with a woven guilloche border, rosette watermark and seal, lathe-line paper and set type; the lines draw in once and a sheen follows the pointer. | Award, course-completion or membership pages; pass recipient, citation and issuer. |
| `koi-studies` | A tactile stack of three illustrated fish cards with CSS 3D depth and pointer tilt; drag, tap, buttons or keys bring the next card forward. | Portfolio or gallery teasers, feature highlights, onboarding card stacks (fills its parent). |

### Menus and navigation (10)

| id | what it does | use it for |
| --- | --- | --- |
| `bubble-menu` | A round button that fans out tinted pill bubbles with a springy stagger; aria-expanded, Escape closes and returns focus. | Compact site menu in a corner of a hero, card or app frame (fills a position:relative parent). |
| `card-nav` | A top bar with a menu button and call to action that expands downward into a row of link cards. | Marketing site header with grouped links (Product, Learn, Company). |
| `dock` | A magnifying icon dock: icons swell on a spring near the pointer or focus, neighbours slide aside; roving-tabindex toolbar. | App launcher or quick-actions strip at the bottom of an app or demo frame. |
| `flowing-menu` | Large stacked rows; a ribbon of scrolling text slides in from the edge the pointer crossed. | Full-width section index or portfolio menu. |
| `gooey-nav` | A nav bar whose active marker is a liquid blob that stretches between links through an SVG goo filter and sprays droplets. | Header or section switcher with a playful, liquid selection. |
| `infinite-menu` | Menu items orbit on a draggable sphere with inertia; the facing item is described below and arrows step through items. | Collection or category picker where exploring is the point. |
| `line-sidebar` | A slim rail of tick lines that stretch toward the pointer, unfold labels on hover or focus and follow scroll position. | In-page table of contents beside long articles or docs. |
| `pill-nav` | A rounded pill navigation bar with circle-fill hover that folds into a menu button with a contained dropdown when narrow. | Floating site header. |
| `staggered-menu` | A slide-in panel with colour layers sweeping ahead and links rising in sequence; contained unless fullscreen is set. | Site menu for a portfolio or landing page (parent should be position:relative). |
| `animated-top-dock` | A proximity-spring top navigation in three fits (centred glass dock, modern bar, pixel retro bar) chosen by a variant prop. | Site header with a lively hover response. |

### Inputs and controls (19)

| id | what it does | use it for |
| --- | --- | --- |
| `counter` | A rolling-digit counter with plus/minus buttons that repeat while held; it is a keyboard-operable spinbutton (arrows, Page keys, Home/End). | Quantity, seat or stock pickers in a checkout or settings form. |
| `curved-input` | A text field with arched edges whose typed text is echoed along an arc above it; a real labelled input underneath. | A playful name, search or promo-code field in a hero or onboarding step. |
| `elastic-slider` | A slider whose track is a string: dragging pulls it toward the pointer and it springs back with a wobble; full slider semantics. | Volume, intensity or price controls where tactile feedback is welcome. |
| `morph-slider` | A slider whose thumb and large preview morph through circle, square, diamond and star as the value changes. | Shape, roundness or style pickers in a theme or editor panel. |
| `option-wheel` | A rotary selector: drag around the dial, scroll, click a dot or use the arrows; exposed as a radio group. | Picking one of 3-8 modes or presets, such as lighting or a time of day. |
| `stepper` | A multi-step flow with a progress rail, animated panels, validation, Back/Next and a finish state. | Onboarding, checkout or any short wizard. |
| `code-slots` | A one-time-code field of separate slots: characters roll into place, focus advances, Backspace steps back and pasted codes spread across the slots. | Sign-in verification, 2FA and invite-code screens. |
| `comet-dial` | A round slider with a glowing comet head whose tail stretches as it moves; drag the ring or use the keyboard. | Settings panels: volume, brightness, intensity and other bounded values. |
| `dodge-field` | A cloud of toggle chips that slip out of the pointer's way and spring back, while staying plain accessible toggle buttons. | Topic or interest pickers in onboarding and preference screens. |
| `glide-select` | A custom listbox select whose highlight glides between options; full keyboard support, type-ahead and form-field output. | Settings forms and filters that want a friendlier dropdown. |
| `peek-rating` | A star rating that previews the score on hover or focus, lifting neighbouring stars and naming the rating before you commit. | Feedback prompts, review forms and product or article ratings. |
| `rubber-segment` | A segmented control whose highlight stretches like a rubber band: the leading edge overshoots and the trailing edge follows. | View switchers, period pickers and compact filters. |
| `scrub-field` | A number field whose label is a drag handle: scrub sideways to change the value with a ruler, or type, or use the arrow keys. | Design-tool style property inputs, sliders for opacity, radius, size and spacing. |
| `slosh-gauge` | A tank gauge (vertical slider) whose liquid sloshes when the level changes; drag it, use the arrow keys or drive it from props. | Fill levels, quotas, battery or volume controls (inline-block; set height in px). |
| `spring-check` | A native checkbox whose box squashes, springs the tick in with an overshoot and sends out a ring; supports an indeterminate dash. | Preferences, task lists and consent forms (works inside a form, controlled or uncontrolled). |
| `swipe-row` | A list row that slides left to reveal action buttons, a long swipe commits the last action; ArrowLeft/ArrowRight/Delete and tabbable buttons give keyboard equivalents. | Inbox, task and notification lists (block-level; stack several in a list). |
| `thought-line` | A text field with a living underline that ripples while you type, settles flat when you pause and fills as the character budget is used. | Titles, quick notes and prompts with a character limit (block-level, fills its parent up to 340px). |
| `wake-slider` | A slide-to-confirm control where the moon rises into a sun; drag to the end or use the keyboard (arrows, End or Enter, Home or Escape). | Confirm-by-gesture actions such as unlock, resume session or turn on (block-level, up to 320px wide). |
| `skeuomorphic-toggle` | A real switch (role=switch) in four takes: a metal knob in a recessed slot with an LED, a tilting rocker paddle, a flat pill and a flat segmented control. | Settings panels and preference lists; pick tactile for hardware-flavoured products, flat for everything else. |

### Buttons and micro-interactions (13)

| id | what it does | use it for |
| --- | --- | --- |
| `branched-menu` | A menu button whose actions grow out of the trigger along a branching line; arrows, Home/End, type-ahead, Enter/Space and Escape all work. | Toolbars and row actions: put it where a kebab/more-actions menu would go. |
| `call-chip` | A compact pill that places a call: ringing pulses, a live timer once connected, mute and hang-up buttons, then an ended summary. | Contact cards, support widgets and team directories. |
| `flying-button` | A send button whose paper plane takes off with a trail while work runs, then lands as a check; async-aware and announced to screen readers. | Contact forms, invites and any submit that completes asynchronously. |
| `fuse-button` | A press-and-hold confirm button with a burning fuse; releasing early snuffs it out, with a press-twice fallback for reduced motion and assistive tech. | Destructive or irreversible actions: launch, delete, publish. |
| `jelly-radio` | A radio group whose chosen dot squashes and wobbles like jelly; native radios keep arrow keys, forms and screen readers working. | Plan pickers, preference lists and any short single-choice group. |
| `paper-crumple` | A sheet of paper that crumples into a ball when discarded and smooths out again on restore. | Discard or delete actions for notes, drafts and sticky cards. |
| `shredder` | A paper shredder: the document feeds into the slot and drops out as loose strips; one button shreds, then restores. | Permanent delete or secure erase actions, confirmation moments for sensitive documents. |
| `slide-commit` | A slide-to-confirm track: drag the handle across to commit, release early and it springs back; Enter or Space works from the keyboard. | Payments, sends and other irreversible actions that deserve a deliberate gesture. |
| `sling-button` | A button you pull back like a slingshot and release: it stretches, springs back and flings a spark the other way; click, Enter and Space fire a short sling. | Playful primary actions such as send, boost or launch (inline-flex; the button needs about 60px of free space around it for the pull). |
| `voice-pill` | A pill toggle for voice input: the mic swells into a live level meter with a running timer, and start and stop are announced. | Dictation or voice-note buttons in composers and search bars (pass level for a real input meter). |
| `shader-buttons` | Five different live-drawn call-to-action buttons (plasma and holographic fragment shaders, ignition embers, a particle constellation, a tactile brushed plate) chosen with `variant`; hover, focus and press drive the animation. | Primary call to action on a hero or pricing card; pick one variant per page, not all five. |
| `rectangle-buttons` | Ten distinct CSS-only rectangular call-to-action treatments (glass, gradient border, keycap, dotted border, technical outline, arrow pill, halftone bloom, inset arrow chip, hard-shadow stamp, fill sweep) via `variant`; renders a button or a link. | Calls to action, form submits and link buttons; choose one variant to match the page's tone. |
| `circle-buttons` | Circular icon controls (play/pause, plus, mail with a send animation) in three treatments: glass, dotted ring and tactile dome. | Media controls, floating add actions and send buttons; always pass an aria-label. |

### Loaders and status (3)

| id | what it does | use it for |
| --- | --- | --- |
| `lattice-loader` | A grid of linked nodes with a diagonal pulse of light sweeping across it; a static graded frame under reduced motion. | Loading states for syncing, indexing or connecting; inline or centred in a panel. |
| `uplink-loader` | A cinematic secure-connection loader with a stepped segmented bar, telemetry ticks, scanline and grain; determinate progress with live status text. | Sign-in handshakes, app boot or sync screens (pass progress 0-100, or leave it to autoplay as a demo). |
| `status-orbs` | Animated dot-orb status indicators for Thinking, Uploading, Listening and Idle in 20px and 56px sizes with primary, signal, aurora and mono colour styles. | Inline with a status line (small) or as the centrepiece of an assistant or upload state (medium). |

### Feedback and gauges (5)

| id | what it does | use it for |
| --- | --- | --- |
| `pulse-heart` | A like toggle whose heart pops with a ripple and a ring of sparks, then keeps a slow heartbeat while liked. | Like or favourite buttons on posts, products and gallery items. |
| `status-mark` | A compact status indicator that redraws per state (idle, loading, success, warning, error) and announces changes through a live region. | Next to a save, upload or sync action to show its outcome (inline-flex). |
| `swipe-toast` | A toast notification you flick away sideways; Escape, arrow keys and a close button dismiss it, and it auto-dismisses with a timer that pauses on hover and focus. | Save confirmations and errors (render it in a fixed corner container; role=alert for errors). |
| `warm-tooltip` | A tooltip that waits a beat on first hover but opens instantly when moving along a row of controls; opens on focus, closes with Escape and is hoverable. | Icon-only buttons and toolbars (wrap one focusable element; leave room above it). |
| `performance-gauges` | Four layered dashboard instruments (tachometer, speedometer, boost gauge, EV power meter) whose needles ease to the values you pass. | Vehicle or device status panels, diagnostics dashboards, telemetry heroes (fills its parent; pass `values`). |
