# Design system

Everything here is read from `site/tokens.css` and `site/styles.css`. If the two disagree, the CSS wins.

## The idea

HEY shows evidence rather than pitch, so the pages should look like evidence: paper, ink, mono numbers, and the source of every figure written next to it. One accent, taken from HEY's own icon. Rows with hairlines instead of cards. The momentum score is the product, so it comes first on a profile.

## Colour

The accent is `#C0F800`, the lime in HEY's icon. It is used as a fill with black text on it (14.7:1), for the focus ring, and for the one rule in the footer. On paper, accent-coloured text uses `#4F6B00` (5.5:1). In dark mode the lime itself is the text accent (14.7:1 on `#141410`). Lighter uses come from alpha steps of the same hue (55, 32, 12 and 6 percent), never from a second colour.

Light surfaces: paper `#F4F3ED`, raised `#FBFAF6`, raised more `#FDFDFA`, sunken `#ECEBE3`. Ink `#141410`, secondary text `#52514A` (7.2:1), muted text `#66655C` (5.3:1), hairline `#E0DFD5`, border `#CFCDC2`.

Dark surfaces are a warm ramp, not an inversion: `#141410`, `#1C1C17`, `#24241E`, sunken `#0F0F0C`. Text `#F0F0E8`, secondary `#B5B5A8` (8.9:1), muted `#85857A` (5.0:1), hairline `#2A2A24`, border `#3D3D34`.

Activity status has four steps and always carries a glyph and the word, never colour alone: shipping green `#1F7A3A` (dark `#5BD37A`), active is the same green mixed 55 percent into grey, quiet amber `#8F5A10` (dark `#F0B950`), dormant grey. Red `#B8352C` (dark `#F07A70`) is reserved for market signals such as "liquidity no longer detected". Evidence grades are ink only: ○ self reported, ◐ source linked, ● source verified.

## Type

Three faces, each with one job. Newsreader (serif, optical sizes) for display headlines and the momentum figure, plus one italic word of emphasis per page. Schibsted Grotesk for everything a person reads in the interface. Fragment Mono for numbers, addresses, field labels and source lines. All three are self-hosted WOFF2 files in `site/fonts/`, one variable file per family, 260 KB in total.

Sizes step by 1.125: 11, 13, 14, 16, 18, 22, 32. Display sizes are fluid: `clamp(40px, 3.2vw + 24px, 64px)` and `clamp(48px, 5vw + 16px, 88px)`. Numbers have their own ramp, 18, 28 and 40, and a display size of `clamp(56px, 6vw + 16px, 112px)` for the momentum figure. Any number of three or more digits is set in the mono face with tabular figures.

Uppercase mono captions are kept to a few per screen and only ever name a data field.

## Space, radius, elevation

Spacing is a 4 px scale from 4 to 96. Content is capped at 1280 px with a gutter of `clamp(16px, 4vw, 40px)`. The header is 64 px and sticky.

Radius by role: controls 6, cards 10, overlays 14, pills full. Nothing else.

Elevation is a soft shadow ladder (xs, sm, md, lg), always downward and neutral, at 0.04 to 0.10 alpha on paper and 0.35 to 0.55 in dark. A raised surface pairs a lighter background with a shadow and a one-pixel inset highlight along its top edge. A border never stands in for elevation. The sticky header blurs what scrolls beneath it and carries the same inset highlight.

Ledger rows are deliberately not cards. They are separated by hairlines and lift by one pixel with a shadow on hover.

## Motion

Durations are 100, 150, 200 and 300 ms with ease-out curves. Colour changes take 150 ms, lifts 200 ms. Charts grow once on first paint over 600 ms and never on update. The live dot beside "RH / 4663" is the only ambient animation on any page. The theme toggle does not animate. `prefers-reduced-motion` collapses every duration.

## Primitives

`site/styles.css` defines the following classes. Each reads tokens only; there are no colour or radius literals in the file.

- Layout: `.container`, `.prose` (66 characters wide), `.section`, `.ground-dots` (the dotted texture on the hero and footer).
- Type: `.display-lg`, `.display`, `.h1`, `.h2`, `.h3`, `.caption`, `.num-xl`, `.num-lg`, `.num-md`, `.num-display`, `.source-line`, `.cell-num`.
- Controls: `.btn` with `--primary`, `--secondary`, `--ghost`, `--sm`; `.input`, `.field`, `.field__label`; `.chip`; `.theme-toggle`.
- Surfaces: `.card`, `.card--raised`, `.disclosure`.
- Data: `.ledger`, `.ledger-head`, `.ledger-row`, `.cell-*`, `.ledger__logo`; `.kv`; `.status` with its status modifiers; `.evidence`; `.link-label`; `.momentum`, `.momentum-figure`, `.momentum-part`; `.bars`; `.daygrid`; `.counters`, `.counter`; `.ships14`; `.timeline`.
- States: `.skeleton`, `.empty`, `.error-line`.
- Chrome: `.site-header`, `.site-nav`, `.live`, `.site-menu`, `.site-footer`, `.hero`.

Every interactive element has a 44 px hit area, a designed two-ring focus style, and a hover state that changes transform or shadow rather than colour alone.

## Data and interaction

The static pages are hand-written from HEY's own copy. `site/app.js` (plain ES2020, no dependencies) drives Explore against the public API, which allows browser requests from any origin. It accepts `q`, `status`, `kind`, `narrative`, `launchpad`, `maxMarketCap`, `tab`, `has`, `sort`, `limit` (max 48) and `offset`. Filters the API does not support are applied to the loaded page only and labelled as such. If the API does not answer within six seconds, `site/data/projects.json` takes over and the result line says so. Every filter is written to the URL. Rows are built with `createElement` and `textContent`, never `innerHTML`.

Project marks come from the API's `logoUrl`, rendered at 28 px with a hairline ring; a missing or blocked image falls back to two mono initials.

## Porting

Map `:root` custom properties to a Tailwind `@theme` block, the dark block to `.dark` or a media query, and each class above to a component-layer utility. `brand.json` holds the colours, fonts and radii for anything downstream.
