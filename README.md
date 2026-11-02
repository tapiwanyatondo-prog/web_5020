# Kamado Car Wash

A five-page website for **Kamado Car Wash**, a hypothetical automated drive-through car wash with two branches in Johannesburg (Sandton and Randburg). Built for the Web Development portfolio of evidence.

- **Live site:** `https://kamado-car-wash.netlify.app` *(replace with your deployed address, see [Deployment](#deployment))*
- **Part 1:** HTML structure, content and planning
- **Part 2:** CSS styling and responsive design
- **Part 3:** JavaScript functionality, forms, SEO and deployment *(this update)*

> **How to use this file:** the Part 3 sections below are complete. Paste your own **Part 1 and Part 2 content** (project proposals summary, earlier references, screenshots, earlier changelog entries) into the marked `[ADD ...]` places so the README covers the whole portfolio.

---

## Contents

1. [Project structure](#project-structure)
2. [Running it locally](#running-it-locally)
3. [Part 3: where each requirement is met](#part-3-where-each-requirement-is-met)
4. [Forms: fields, validation and submission](#forms-fields-validation-and-submission)
5. [SEO documentation](#seo-documentation)
6. [Security and page speed](#security-and-page-speed)
7. [Deployment](#deployment)
8. [Testing](#testing)
9. [Changelog](#changelog)
10. [Known limitations](#known-limitations)
11. [References](#references)

---

## Project structure

```
kamado-car-wash/
├── index.html            Home: hero, animated wash lane, benefits
├── about.html            About: story, stats, image gallery + lightbox, mission, values
├── services.html         Services: searchable / filterable / sortable catalogue
├── enquiry.html          Enquiry: smart form with instant price + availability, FAQ accordion
├── contact.html          Contact: interactive map, nearest-branch finder, contact form
├── 404.html              Custom "page not found" page (utility page, not part of the 5 required)
├── robots.txt            Crawler instructions
├── sitemap.xml           Page list for search engines
├── _headers              Security + caching headers (Netlify)
├── css/
│   ├── style.css         The site stylesheet (Part 2 sections 1-12, Part 3 sections 13-24)
│   └── leaflet-1.9.4.css Map library styles (contact page only)
├── js/
│   ├── common.js         Shared helpers, open/closed badges, lane animation, counters, share links
│   ├── validation.js     Reusable form-validation library + AJAX helper
│   ├── enquiry.js        Enquiry form: conditional fields, price + availability answer
│   ├── contact-form.js   Contact form: validation and email compilation
│   ├── services.js       Dynamic catalogue: load, search, filter, sort
│   ├── services-data.js  Offline copy of data/services.json (fallback)
│   ├── gallery.js        Gallery lightbox (native <dialog>)
│   ├── map.js            Leaflet map, markers, fly-to, nearest branch
│   ├── faq.js            jQuery accordion
│   └── vendor/           jQuery 3.7.1 and Leaflet 1.9.4 (with licences)
├── data/services.json    Every service and price (single source of truth)
├── fonts/                Self-hosted woff2 fonts (Latin subset)
└── images/               Original SVG illustrations, favicon, social-share card
```

**Naming conventions:** lower-case, hyphen-separated, descriptive file names (for example `kamado-car-wash-pre-soak-foam-arch.svg`).

## Running it locally

Use a local web server rather than double-clicking the files, so that `fetch()`, the map and location features behave as they will online.

- **VS Code:** install the *Live Server* extension, right-click `index.html`, choose *Open with Live Server*.
- **Or in a terminal:** `python -m http.server 8000` in the project folder, then open `http://localhost:8000`.

Opening a page directly from disk still works for the pages and forms: the services page falls back to `js/services-data.js` when the browser blocks `fetch()` on `file://`. The map tiles and "nearest branch" button need `http://localhost` or `https://`.

---

## Part 3: where each requirement is met

### 2.1 Interactive elements

| Requirement | Implementation | File |
|---|---|---|
| Accordion (jQuery) | FAQ with six questions on `enquiry.html`. `aria-expanded` / `aria-controls`, one panel open at a time, Up / Down / Home / End keys, jQuery `slideDown` / `slideUp` | `js/faq.js` |
| Modal | Gallery lightbox using the native `<dialog>` element and `showModal()`: focus trap, Esc to close, backdrop click, previous/next, arrow keys, swipe, focus returns to the thumbnail | `js/gallery.js` |
| Gallery with lightbox | Six original illustrations of the wash stages on `about.html`. Thumbnails are ordinary links, so they still work without JavaScript | `js/gallery.js`, `about.html` |
| Interactive map (Leaflet) | OpenStreetMap map on `contact.html` with a marker and popup per branch, "Show on map" buttons that fly to a branch, "Show both branches", and **Find my nearest branch** (browser geolocation + haversine distance). The map is created only when it scrolls near the screen | `js/map.js` |
| Animations and transitions (CSS + JS) | Home page: when the wash lane scrolls into view JavaScript adds `lane-run`; CSS then drives a car through the tunnel at constant speed and fills each stage number as it passes. About page: numbers count up once (`requestAnimationFrame`). Form groups fade in when chosen; lightbox fades and scales; accordion slides. All switched off for `prefers-reduced-motion` | `js/common.js`, `css/style.css` section 15 |
| Advanced DOM manipulation | `<template>` cloning, `DocumentFragment`, `replaceChildren`, event delegation, `IntersectionObserver`, `URLSearchParams`, dynamic `<dialog>` creation, element builder `Kamado.el()`, ARIA state management, search highlighting with `<mark>` nodes. User text is always inserted with `textContent`, never `innerHTML` | all scripts |

### 2.2 Dynamic content

- **Load content with JavaScript:** `services.js` fetches `data/services.json` and builds the nine service cards from a `<template>`.
- **Search, filter and sort:** live text search (name, description, features, keywords), category chips (all / single washes / add-ons / memberships) and sorting (featured, price low-high, price high-low, A-Z). The count is announced to screen readers, matches are highlighted, and there is a friendly empty state.
- **Progressive enhancement:** `services.html` already contains the complete price list as plain HTML. The script swaps it for the interactive version only after the data loads, so search engines and visitors without JavaScript still see every price.
- **Joined-up:** each card links to the enquiry form with the right options pre-selected (for example `enquiry.html?type=quote&package=deluxe`), and the home page links to `services.html?category=membership`.

### 4. Forms

See the next section.

### 5. Deployment

See [Deployment](#deployment).

---

## Forms: fields, validation and submission

Both forms use the same library (`js/validation.js`) in three layers:

1. **HTML5 attributes** on every field (`required`, `type`, `minlength`, `maxlength`, `min`, `max`, `pattern`, `autocomplete`, `inputmode`) describe the rules, so the form is still checked by the browser if the script fails.
2. **JavaScript validation** turns the browser pop-ups off (`novalidate`) and re-checks every rule, adding checks HTML5 cannot do.
3. **Accessible error handling:** a message under each field (`aria-invalid`, `aria-describedby`), an error summary at the top of the form with links to each field (focus moves to it), live re-checking as the person fixes a field, and a character counter on message boxes.

### Validation rules

| Field | Rule |
|---|---|
| Full name | 2-60 characters; letters (any language), spaces, hyphens, apostrophes |
| Email | Standard address format, maximum 254 characters |
| Phone | South African number: `0XX XXX XXXX`, `+27 XX XXX XXXX` or `0027 ...`; spaces, dashes and brackets allowed. Stored as `+27 XX XXX XXXX` |
| Dates | Must be a real calendar date (no 30 February). Planned visit and membership start: today to 60 days ahead. Feedback visit: up to 90 days back, not in the future. "Today" is always **Johannesburg time** |
| Arrival time | 30-minute slots from 07:00 to 16:30. Slots that have already passed today are disabled |
| Numbers | Whole numbers only: washes per month 1-60, fleet size 3-500, washes per vehicle 1-30 |
| Message | 10-500 characters (enquiry, optional unless franchise or feedback) or 10-1000 characters (contact, required) |
| Subject (contact) | 5-80 characters |
| Consent (enquiry) | Must be ticked (POPIA-style consent to reply) |

### `enquiry.html`: enquire about the services

The person chooses what they want to know; only the matching fields appear. After validation the page **answers on the spot** without reloading:

| Enquiry type | Response |
|---|---|
| Price of a single wash | Itemised price (add-ons already included in the package are shown as R0, never charged twice), estimated total, **availability** for the chosen branch/date/time with a typical wait and a quieter suggestion, and a tip if a membership would be cheaper |
| Unlimited membership | Monthly price compared with paying per wash for the expected number of washes, the saving, and the break-even point |
| Fleet account | Reference figures for the same washes pay-per-wash, and next steps |
| Franchise / feedback | Confirmation with a reference number |

Prices come from `data/services.json`, the same file the services page uses, so the two can never disagree. Availability is a **planning estimate** from typical traffic patterns (commuter rush, Saturday mornings), not live data, and the page says so.

### `contact.html`: send a general message

Asks for name, email, optional phone, branch, **type of message**, subject and the **full message**. After validation the message is compiled into an email addressed to the recipient stated in the code, `Kamado.CONTACT_EMAIL` in `js/common.js`. The visitor can open it in their email app (`mailto:` link), copy it, or go back and edit it.

> **Before you submit:** change `Kamado.CONTACT_EMAIL` in `js/common.js` to a mailbox you own, so your lecturer can see the hand-off work. The default `info@kamadocarwash.example` uses a reserved name that can never reach a real person.

### AJAX submission

Both forms have `action="https://jsonplaceholder.typicode.com/posts"` and are sent with `fetch()` as JSON without a page reload (`KamadoForm.postJSON`). It uses an 8-second timeout, omits cookies, and always returns a result instead of throwing: if the server cannot be reached the person still gets their answer (or compiled email) with a clear "not sent yet" warning and an email fallback. The button is disabled with a spinner while sending to prevent double submits.

JSONPlaceholder is a public **demonstration endpoint**: it accepts the request and echoes it back but stores nothing. For a real deployment, change the `action` to your own handler (for example a Netlify Form or Formspree URL) and update the matching address in the Content-Security-Policy.

### Form security

- A hidden **honeypot** field catches spam bots (their submissions are dropped silently).
- Control characters and line breaks are stripped from single-line fields, so header injection into the email subject is not possible.
- Visitor text is rendered with `textContent`, so `<script>` or `<img onerror>` typed into a form is shown as text, not run.
- Query-string values used to pre-fill the enquiry form are checked against the list of valid options.

---

## SEO documentation

### On-page SEO

**Keyword research.** Keywords were chosen around what a Johannesburg driver would type, combining service, place and intent:

| Page | Primary keyword | Supporting keywords |
|---|---|---|
| Home | automated car wash Johannesburg | drive-through car wash, car wash Sandton, car wash Randburg, four minute car wash |
| About | eco-friendly car wash Johannesburg | water recycling car wash, about Kamado Car Wash |
| Services | car wash prices Johannesburg | car wash packages, unlimited car wash membership, tyre shine, fleet car wash |
| Enquiry | car wash quote | fleet car wash Johannesburg, car wash franchise South Africa |
| Contact | Kamado Car Wash Sandton address | car wash Randburg phone, car wash opening hours Johannesburg |

**Title tags and meta descriptions** (every page has its own; titles 53-59 characters, descriptions 136-148 characters so they are not cut off in results):

| Page | Title |
|---|---|
| Home | Kamado Car Wash \| Automated Drive-Through Wash Johannesburg |
| About | About Kamado Car Wash \| Water-Wise Wash in Johannesburg |
| Services | Car Wash Prices & Packages Johannesburg \| Kamado Car Wash |
| Enquiry | Get a Car Wash Quote or Fleet Enquiry \| Kamado Car Wash |
| Contact | Contact Kamado Car Wash \| Sandton & Randburg Branches |

**Header tags.** Each page has exactly one `<h1>`, followed by `<h2>` sections and `<h3>`/`<h4>` sub-sections with no skipped levels. Footer headings are not headings (they would pollute the outline).

**Image optimisation.** Descriptive file names (`kamado-car-wash-high-pressure-rinse.svg`), meaningful `alt` text on every informative image, `width` and `height` set (prevents layout shift), `loading="lazy"` and `decoding="async"` on gallery images. Images are small SVGs (4-11 KB each).

**URL structure.** Short, lower-case, descriptive (`/services.html`, `/contact.html`) with no query clutter. Each page declares a `<link rel="canonical">`. Anchors are meaningful (`contact.html#branches`).

**Internal linking.** Body copy links to related pages with descriptive anchor text ("services and pricing page", "See membership plans", "Send us a fleet enquiry") in addition to the main navigation and footer.

**Mobile-friendliness.** `viewport` meta tag, responsive layout with breakpoints (Part 2), large tap targets on the main buttons, `inputmode`/`autocomplete` on form fields so phones show the right keyboard, click-to-call phone links.

**Structured data (schema.org JSON-LD).** `Organization`, `WebSite` and two `AutoWash` records (address, geo-coordinates, opening hours, telephone) on the home and contact pages; `OfferCatalog` generated from the real prices on the services page; `FAQPage` matching the visible FAQ; `AboutPage`; `ContactPage`.

**Social sharing tags.** Open Graph and Twitter Card tags with a 1200 x 630 share image on every page.

### Off-page SEO *(plan: these actions happen outside the code)*

- **Backlinks:** register the business on directories such as Google Business Profile, Bing Places, Yellow Pages South Africa and Hotfrog; ask the local schools mentioned in the *Community first* value to link to Kamado from their fundraising pages; contact Johannesburg motoring and eco blogs about the water-recycling story.
- **Social media:** profiles on Facebook, Instagram and TikTok showing the wash lane; the footer has "Share this page" links (WhatsApp, Facebook, X) that share the page's canonical address, and the Open Graph tags make shared links show a proper preview.
- **Local SEO:** two `AutoWash` structured-data records, a consistent Name / Address / Phone across the footer, contact page and schema, click-to-call links, opening hours in text and in schema, an interactive map, and "Johannesburg / Sandton / Randburg" in titles, headings and descriptions. Next step after launch: claim the Google Business Profile for each branch using the same Name / Address / Phone.

### Additional SEO files

- **`robots.txt`**: allows all crawlers and points to the sitemap. CSS, JavaScript and data files are deliberately **not** blocked, because search engines need them to render the page.
- **`sitemap.xml`**: lists the five pages with last-modified date. Submit it in Google Search Console after deployment.
- **`404.html`**: custom not-found page, marked `noindex`.

---

## Security and page speed

### Security measures

| Measure | Where |
|---|---|
| **Content-Security-Policy** limiting scripts, styles, images, fonts, connections and form targets to this site (plus the map tile server and the demo form endpoint). The one inline script is allowed by its SHA-256 hash, not by `unsafe-inline` | `<meta>` tag on every page and `_headers` |
| `X-Content-Type-Options`, `X-Frame-Options: DENY` / `frame-ancestors 'none'` (stops clickjacking), `Referrer-Policy`, `Permissions-Policy` (geolocation only for this site), HSTS | `_headers` (Netlify) |
| Output encoding: user text goes in with `textContent`; no `innerHTML` with user data | all scripts |
| Input cleaning and strict validation, honeypot, double-submit prevention | `js/validation.js` |
| External links use `rel="noopener noreferrer"` | all pages |
| Libraries are self-hosted at pinned versions (no third-party script can change under us); no inline event handlers or inline `style` attributes | `js/vendor/` |
| HTTPS | provided by Netlify / GitHub Pages |

*Trade-off documented:* `style-src-attr 'unsafe-inline'` is allowed so the map library can position tiles; scripts remain locked down. GitHub Pages cannot send custom headers, so there the `<meta>` CSP is the protection; Netlify applies the full `_headers` file.

### Page speed measures

- **Fonts self-hosted** as Latin-subset woff2 (84 KB for three families) with `font-display: swap` and `preload` for the two above-the-fold fonts. This replaced a render-blocking Google Fonts `@import`.
- All scripts use `defer`; page-specific scripts load only on the page that needs them (Leaflet only on Contact, jQuery only on Enquiry).
- The map is created only when it scrolls near the viewport.
- Images are tiny SVGs, lazy-loaded below the fold, with dimensions set to avoid layout shift.
- `preconnect` to the map tile server on the contact page.
- Long-lived cache headers for fonts, images, CSS and JS (`_headers`).
- Sticky header, scroll handlers and animations use passive listeners and `requestAnimationFrame`.

*Optional next step:* run `style.css` and the scripts through a minifier before deployment; they are left readable here so they can be marked.

---

## Deployment

### Option A: Netlify (recommended, supports the security headers)

1. Push this folder to a GitHub repository.
2. On [netlify.com](https://www.netlify.com) choose **Add new site, Import an existing project**, pick the repository. Leave the build command empty and set the publish directory to `/` (the repository root).
3. Netlify gives you an address such as `https://your-name.netlify.app`.
4. In VS Code use **Find in Files** (Ctrl+Shift+F) to replace `https://kamado-car-wash.netlify.app` with your real address everywhere (canonical links, Open Graph tags, sitemap, robots.txt, structured data). Commit and push.

### Option B: GitHub Pages

1. Repository **Settings, Pages**, choose the `main` branch and `/ (root)`.
2. Your address is `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`. Replace the placeholder address as in step 4 above, including the sub-folder.
3. Limits: GitHub Pages ignores `_headers`, and `robots.txt` / `sitemap.xml` are only honoured at the root of a domain, so use a custom domain or Netlify for the full SEO set-up.

### After deploying

- Open the live site and test: both forms, the map and the nearest-branch button (needs HTTPS), the gallery, and the services search.
- Add your address to Google Search Console and submit `sitemap.xml`.
- Run Lighthouse (Chrome DevTools, Lighthouse tab) on each page and keep the report as evidence.

---

## Testing

**Automated checks run during development** (not part of the repository): all six pages pass the `html-validate` HTML validator with zero errors; the stylesheet passes CSS validation; every internal link, anchor and asset resolves; each page has one `<h1>` and no skipped heading levels; structured data parses as valid JSON; colour contrast of text pairs meets WCAG AA; and 224 scripted checks drove the forms, catalogue, gallery, accordion and map in a simulated browser (including invalid input, server failure and attempted script/header injection).

**Evidence to add yourself** (the brief asks for screenshots in the README):

- [ADD] Desktop, tablet and mobile screenshots of each page (Chrome DevTools device toolbar)
- [ADD] Screenshot of each form showing validation errors, then the successful response
- [ADD] Screenshot of the lightbox open and of the map with both markers
- [ADD] Lighthouse scores for the deployed site
- [ADD] Browsers tested (for example Chrome, Edge, Firefox) and results

**Try it yourself:**

1. Enquiry page: submit empty, then choose *The price of a single wash*, pick Deluxe plus tyre shine and interior vacuum, and note the tyre shine is not charged twice.
2. Enquiry page: choose *Unlimited membership*, enter 3 washes, then 6, and compare the answers.
3. Services page: search "wax", filter to add-ons, sort by price.
4. About page: open a gallery image and use the arrow keys.
5. Contact page: press *Find my nearest branch*, then send a message and open the compiled email.

---

## Changelog

> The brief requires every edit to be recorded here with enough detail for the lecturer. Add the lecturer's Part 2 feedback points in the first table, then keep my entries below.

### Feedback from Part 2

| Feedback received | What I changed | Files |
|---|---|---|
| [ADD feedback point 1] | [ADD what you did] | |
| [ADD feedback point 2] | [ADD what you did] | |

### Part 3: self-review corrections to earlier parts

| Change | Reason | Files |
|---|---|---|
| Footer paragraph text changed from dark grey to light | The global paragraph colour made footer text nearly invisible on the dark footer (failed contrast) | `css/style.css` |
| Removed the Google Fonts `@import`; fonts now self-hosted | The `@import` blocks rendering and sends visitors' data to a third party | `css/style.css`, `fonts/` |
| Stage-number colour darkened (`--color-coral-deep`) | Original coral failed WCAG AA contrast at small size | `css/style.css` |
| Removed every inline `style=""` attribute; replaced with utility classes | Needed for a strict Content-Security-Policy and cleaner separation | all pages, `css/style.css` |
| Removed leftover SplashLine wording (enquiry intro, contact meta description) and the "embedded map" comment | Leftover from the original template | `enquiry.html`, `contact.html` |
| Branch names made consistent: "Kamado Car Wash Sandton / Randburg" | Needed for consistent Name / Address / Phone (local SEO) | `contact.html` |
| Footer now lists **both** branch phone numbers as click-to-call links | Footer showed different numbers on different pages | all pages |
| Text fixes: "recycledand", stray "&mdash; .", "Kamado a opened", "water conscious  car wash", "known for ... as for our shine" | Typos and grammar | `index.html`, `about.html` |
| Home page membership claim changed from "pays for itself after your third visit" to "from about your fifth wash in a month" | The maths did not match the prices: Unlimited Express (R270) beats R65 washes from the 5th wash, Unlimited Deluxe (R395) beats R100 washes from the 4th | `index.html` |
| Added a hidden `<h2>` before the three benefit cards | Heading levels jumped from h2 to h3 | `index.html` |
| Footer headings changed from `<h3>` to styled paragraphs | Footer headings should not appear in the page outline | all pages |
| Added "Skip to main content" link and `id="main"` | Keyboard accessibility | all pages |
| Pricing plan names in the static list changed to `<h4>` | Correct heading order under the group `<h3>` | `services.html` |
| Phone numbers use non-breaking spaces | Stops a number wrapping across two lines | all pages |
| Removed dead `<script src="js/script.js">` lines | File no longer existed (404 in DevTools) | four pages |
| Placeholder text colour darkened | Default grey failed contrast on the pale background | `css/style.css` |

### Part 3: new features

| Feature | Details | Files |
|---|---|---|
| Services catalogue | Loads `data/services.json` with `fetch()`, search / filter / sort, highlight, empty state, state kept in `sessionStorage`, offline fallback, links pre-filling the enquiry form | `services.html`, `js/services.js`, `data/services.json`, `js/services-data.js` |
| Enquiry form | Conditional fields by enquiry type, validation, AJAX submit, instant cost + availability answer, fallback email | `enquiry.html`, `js/enquiry.js`, `js/validation.js` |
| Contact form | Validation, AJAX submit, compiled email with `mailto:` and copy | `contact.html`, `js/contact-form.js` |
| FAQ accordion (jQuery) | Six questions, accessible, keyboard support | `enquiry.html`, `js/faq.js`, `js/vendor/jquery-3.7.1.min.js` |
| Gallery + lightbox | Six original illustrations, `<dialog>` modal | `about.html`, `js/gallery.js`, `images/` |
| Interactive map | Leaflet + OpenStreetMap, two branches, fly-to, nearest-branch finder | `contact.html`, `js/map.js`, `js/vendor/leaflet-1.9.4.js`, `css/leaflet-1.9.4.css` |
| Animated wash lane, counters, header shadow, back-to-top, open/closed badges, share links | See `js/common.js`; badges use Johannesburg time regardless of the visitor's location | `js/common.js`, `css/style.css` |
| SEO | Unique titles and descriptions, canonical, Open Graph, Twitter cards, JSON-LD, `robots.txt`, `sitemap.xml`, `404.html` | all pages |
| Security + speed | CSP, `_headers`, honeypot, self-hosted fonts and libraries, deferred scripts, lazy loading | see sections above |
| Responsive + accessibility additions | New components styled for tablet and mobile; reduced-motion support; focus styles | `css/style.css` sections 13-24 |

---

## Known limitations

- The business, its addresses, phone numbers and the staff are **fictional**. Map pin positions are approximate, and "92 Lenovo Street" is not a real address.
- Availability estimates on the enquiry page are modelled, not live. Prices and hours come from the site's own data.
- The form endpoint is a demo service that stores nothing. Real delivery of a contact message happens through the compiled email.
- The mobile menu button in the header markup is hidden by CSS: the navigation simply wraps on small screens instead of collapsing.
- Map tiles are loaded from the public OpenStreetMap server, which is fine for coursework but not for high-traffic sites.

---

## References

*Add the references you already have for Parts 1 and 2 above this list, and add the date you accessed each source.*

**Libraries and assets used in Part 3**

- Agafonkin, V. (2023) *Leaflet 1.9.4: an open-source JavaScript library for mobile-friendly interactive maps*. Available at: https://leafletjs.com (BSD-2-Clause licence, copy in `js/vendor/`). [accessed: add date]
- OpenStreetMap contributors (n.d.) *OpenStreetMap*. Map data (c) OpenStreetMap contributors, ODbL. Available at: https://www.openstreetmap.org/copyright [accessed: add date]
- OpenJS Foundation (2023) *jQuery 3.7.1*. Available at: https://jquery.com (MIT licence, copy in `js/vendor/`). [accessed: add date]
- Bebas Neue (Dharma Type), Work Sans (Wei Huang) and JetBrains Mono (JetBrains): SIL Open Font Licence 1.1, from the Google Fonts repository. Available at: https://github.com/google/fonts [accessed: add date]
- JSONPlaceholder (n.d.) *Free fake API for testing and prototyping*. Available at: https://jsonplaceholder.typicode.com [accessed: add date]
- All illustrations, the favicon and the social-share image were **created for this project** as SVG/PNG; there are no third-party images.

**Guidance followed**

- MDN Web Docs (n.d.) *`<dialog>`: the dialog element*; *Using the Fetch API*; *IntersectionObserver*; *Constraint validation*; *Content-Security-Policy*; *prefers-reduced-motion*. Mozilla. Available at: https://developer.mozilla.org [accessed: add date]
- W3C (2023) *Web Content Accessibility Guidelines (WCAG) 2.2*. Available at: https://www.w3.org/TR/WCAG22/ [accessed: add date]
- W3C (n.d.) *WAI-ARIA Authoring Practices Guide: Accordion pattern*. Available at: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ [accessed: add date]
- Google (n.d.) *Search Central: SEO starter guide*; *Intro to structured data*; *Local business structured data*. Available at: https://developers.google.com/search [accessed: add date]
- Schema.org (n.d.) *AutoWash*; *FAQPage*; *OfferCatalog*. Available at: https://schema.org [accessed: add date]
- Open Graph protocol (n.d.). Available at: https://ogp.me [accessed: add date]
- Protection of Personal Information Act 4 of 2013 (South Africa), informing the consent wording on the enquiry form.

**Part 1 and Part 2 references:** [ADD YOUR EXISTING REFERENCES HERE]
