---
name: Housing_4_Raajje
description: Verified island housing; a quiet paper ledger under a deep-teal spine.
colors:
  ink: "#154153"
  ink-soft: "#2c5566"
  muted: "#54737e"
  sage: "#b1cdae"
  moss: "#71926e"
  moss-deep: "#4a6847"
  paper: "#f7f6f2"
  sheet: "#ffffff"
  mist: "#f1efe9"
  sage-wash: "rgba(177, 205, 174, 0.35)"
  line: "rgba(21, 65, 83, 0.12)"
  line-soft: "rgba(21, 65, 83, 0.09)"
  line-strong: "rgba(21, 65, 83, 0.2)"
  ink-tint: "rgba(21, 65, 83, 0.08)"
  on-spine-soft: "rgba(177, 205, 174, 0.82)"
  on-spine-faint: "rgba(177, 205, 174, 0.62)"
typography:
  display:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(32px, 4.2vw, 44px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.005em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-row:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  caption:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  field: "8px"
  control: "9px"
  sheet: "14px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "44px"
  "8": "56px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "40px"
  button-moss:
    backgroundColor: "{colors.moss-deep}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "40px"
  button-sm:
    rounded: "{rounded.field}"
    padding: "6px 13px"
    height: "32px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "42px"
  input-focus:
    backgroundColor: "{colors.sheet}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  pill-sage:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  pill-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "26px 28px"
  spine:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sage}"
    width: "248px"
  nav-item:
    textColor: "{colors.on-spine-soft}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
---

# Design System: Housing_4_Raajje

## Overview

**Creative North Star: "The Harbour-Office Ledger"**

Every screen is a sheet of warm paper (#f7f6f2) laid beside a deep-teal spine (#154153). Content is set as ruled rows, not boxes: hairline rules divide records, uppercase 11px column heads sit over tabular figures, and numbers in Space Grotesk carry the hierarchy. The system is calm and dense in the way a well-kept office register is dense. Each line holds one record, and the eye moves down the page rather than across a mosaic.

Colour is spent sparingly. Teal ink does the work: text, primary buttons, the spine, the solid "overdue" pill. Sage is the one light accent. It marks where you are (the active nav item), what is fine (available or paid pills, paid month marks) and where a photo will go (the wave-patterned image well). Moss marks positive money and live controls (toggles, meters, focus rings). The world rejects the SaaS card-grid dashboard: figures are not tiles, sheets carry no resting shadow, and icons never sit in coloured boxes.

**Key Characteristics:**
- Paper ground, teal spine, white sheets with 1px teal-12% borders and 14px corners.
- Ruled lists and ledger tables as the default content form; tabular numerals everywhere numbers align.
- Space Grotesk for headings and figures, IBM Plex Sans for everything else.
- One ruled figure row (2 to 4 numbers) per dashboard, above the primary list.
- Flat surfaces; only overlays and moving thumbs lift.

## Colors

A cool teal ink on warm paper, with a pale sage and a deeper moss as the only accents.

### Primary
- **Harbour Ink** (ink): the spine and public header band, all body text, primary buttons, selected chips, the solid "overdue" pill, range-slider accent. It is the brand's voice; most screens are ink on paper and nothing else.
- **Soft Ink** (ink-soft): primary-button hover, chip text, secondary text inside listing sheets and figure-label links.

### Secondary
- **Lagoon Sage** (sage): fill for the active nav item and active public tab, "available"/"paid" pills, paid month marks, image wells, text selection. On the spine it is the text colour (wordmark hover, nav text at 82%, portal name and identity meta at 62%, sign-out link).
- **Sage Wash** (sage-wash): background of informational notices.

### Tertiary
- **Moss** (moss): display-size positive figures (32px, where its 3:1 contrast is sufficient), switch "on" track, meter fill, listing-sheet hover border, keyboard focus outline.
- **Deep Moss** (moss-deep): text links, the moss button, moss pill text. It carries every small green text because Moss alone is too light under 18px.

### Neutral
- **Paper** (paper): page ground, input background on sheets, text on ink fills.
- **Sheet White** (sheet): sheets, listing sheets, filter sheet, input background when focused or placed on paper.
- **Mist** (mist): skeleton loading base.
- **Harbour Grey** (muted): lede lines, column heads, meta and caption text, field labels, empty states.
- **Rules** (line, line-soft, line-strong): sheet borders and section rules (line), row hairlines (line-soft), table head underline and button outline (line-strong).
- **Ink Tint** (ink-tint): meter track.

### Named Rules
**The Ink Does The Work Rule.** Text, primary actions and the spine are all Harbour Ink. A new emphasis is made with weight, size or Space Grotesk, never with a new hue.

**The Sage Means Here-Or-Fine Rule.** On paper, sage appears only as a fill: the active nav, positive-status pills and month marks, image wells, notices (as wash). It is never body text or a button fill on paper. On the spine it is the text colour.

**The Moss Size Rule.** Moss (#71926e) as text is allowed only at display size (figures at 26px or more). Anything smaller in green uses Deep Moss (#4a6847).

## Typography

**Display Font:** Space Grotesk (with IBM Plex Sans, system-ui)
**Body Font:** IBM Plex Sans (with system-ui)

**Character:** Space Grotesk's squared, slightly mechanical numerals give figures and headings a ledger-stamp authority; Plex Sans keeps the rows plain and legible at 12.5 to 14px.

### Hierarchy
- **Display** (600, clamp(32px, 4.2vw, 44px), 1.1, -0.025em): the public band headline only, max 18ch, paper on ink.
- **Figure** (600, 32px; 26px under 640px, 1.1, -0.02em, tabular): the ruled figure row; also the 28px rent figure on listing detail.
- **Headline** (600, 28px; 24px under 640px, 1.15, -0.02em): page titles in every portal and the sign-in form; listing detail titles at 30px.
- **Title** (600, 15px): section titles, sheet titles, listing names, rent on listing sheets.
- **Body** (400, 14px, 1.5): base. Rows, inputs, notices and kv lists run at 13.5px; ledes at 13.5px muted, max 68ch.
- **Caption** (400, 12.5px, muted): row sub-lines, figure labels, meta cells, footer.
- **Label** (600, 11px, 0.08em, uppercase, muted): ledger column heads and the key labels of key/value blocks only. Field labels and filter legends are 12px sentence case.

### Named Rules
**The Figures Lead Rule.** The largest type on a portal screen is a number. Headings may name the page, but the figure row is where the eye lands.

**The Uppercase Belongs To Columns Rule.** Uppercase tracked 11px text is a column head for the data directly beneath it. It is never placed above a page or section title.

## Layout

Portals are a two-column frame: a sticky 248px ink spine (wordmark, portal name, optional controls, nav, identity and sign-out at the foot) and a main column capped at 1180px with 44px 56px 72px padding. Every portal page opens the same way: headline title, one muted lede line, then the ruled figure row (auto-fit columns of at least 190px, 40px above, 32px below to a 1px rule), then sections spaced 44px apart, each with a 15px title and a right-aligned link or action on the same baseline.

The public site uses a sticky ink header bar, a full-bleed ink band with the display headline and search field, filters on paper ruled off below, and listing sheets in an auto-fill grid (min 270px, 24px gap). Listing detail splits 1.35fr / 1fr with a sticky price sheet.

Spacing follows a 4/8/12/16/24/32/44/56 scale. Two-up content uses a split grid (min 340px, 40px by 32px gaps); forms use a grid of min 220px columns with 18px by 24px gaps and right-aligned actions.

Responsive: at 960px the spine becomes a top bar with a 40px menu toggle that discloses nav and identity; main padding drops to 28px 16px. At 640px figures fall to a two-column grid, sheets pad 22px 20px. At 760px the public header wraps nav into a horizontally scrolling row and the band pads 36px 16px. Wide ledgers scroll horizontally inside their own container.

## Elevation & Depth

The world is flat. Depth comes from tone (paper ground, white sheet) and 1px teal rules, never from shadow on a resting surface. Shadows exist only where something physically sits above the page: a modal dialog over an ink-40% backdrop, the thumb of a switch, the selected segment of a segmented control, and the soft moss focus halo on fields.

### Shadow Vocabulary
- **Dialog lift** (`box-shadow: 0 24px 56px -20px rgba(21, 65, 83, 0.5)`): modal confirmation dialogs only.
- **Thumb** (`box-shadow: 0 1px 2px rgba(21, 65, 83, 0.25)`): switch knob.
- **Segment** (`box-shadow: 0 1px 3px rgba(21, 65, 83, 0.14)`): selected segment of a segmented control.
- **Field halo** (`box-shadow: 0 0 0 3px rgba(113, 146, 110, 0.25)`): focused input, paired with an ink border.

### Named Rules
**The Flat Sheet Rule.** Sheets, listing sheets, figure rows, tables and nav carry no shadow. If a surface needs to read as separate, give it a white fill and a 1px line border.

## Shapes

Soft but not round. Sheets and image wells use 14px corners; buttons 9px; fields, small buttons and nav items 8px; month marks 6px. Pills, chips, switches and meters are fully rounded (999px). Borders are always 1px, in teal at 9 to 20% opacity. Dashed borders carry meaning: a dashed outline marks a pending or due state (pending pill, pending month mark), and a dashed ink border marks an invalid field or an error notice. The image well is sage with a faint 6% ink wave line repeating every 120px; it stands in for photographs until they are uploaded.

## Components

### Buttons
Quiet and outlined by default; ink fill for the one action that matters.
- **Shape:** gently rounded (9px), min height 40px, 600 weight 13px, padding 10px 18px.
- **Primary:** ink fill, paper text; hover shifts to Soft Ink.
- **Secondary:** transparent with a line-strong outline; hover darkens the outline to ink.
- **Moss:** Deep Moss fill, white text, for a single committing submission (an owner submitting a property for verification); hover #3f5a3c.
- **Small:** 32px, 8px radius, 12.5px. **Block:** full width, 46px, 14px.
- **Quiet / link:** borderless muted text that inks on hover; text links in Deep Moss 600 with an underline that fades in on hover.
- **Disabled:** ink at 10% fill, ink at 50% text, no border.
- **On the spine/band:** sage-outlined (45%) transparent buttons with sage text, turning white on hover.

### Chips
- **Style:** filter chips are fully rounded, transparent, 1px ink-20% border, Soft Ink 12.5px text, 32px high.
- **State:** selected (`aria-pressed`) fills ink with paper text and 600 weight. They are filters, not tags.

### Pills
Status labels on ledger rows. Fully rounded, 11.5px 600, padding 4px 10px. Tones: sage (available, approved, active, paid, resolved), ink at 10% (rented, assigned, scheduled, in progress, and the default), moss-tint with Deep Moss text (under maintenance), dashed outline (due, pending, awaiting signature, draft, open), solid ink with paper text (overdue). Status is never coded by colour alone; every pill carries its word.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Sheet White on paper.
- **Shadow Strategy:** none (see The Flat Sheet Rule).
- **Border:** 1px line.
- **Internal Padding:** 26px 28px (22px 20px on mobile).
- **Listing sheet:** an image well (168px) over a body of 18px 20px 20px: name and island on one baseline, address in caption, type/rooms and rent at the foot. Hover turns the border moss and drifts the well's wave 60px.

### Inputs / Fields
- **Style:** 42px, 8px radius, 1px ink-20% border, paper fill (white when placed on paper), 13.5px text, placeholder ink at 50%. Labels sit above in 12px muted sentence case.
- **Focus:** border goes ink, fill goes white, 3px moss halo.
- **Error:** dashed ink border; error text 12.5px 600 ink. **Select:** custom ink chevron. **Range:** ink accent.
- **Public search:** 15px text in a white field, 10px radius, padding 15px 16px; focus is a 2px sage border on the ink band.

### Navigation
- **Spine nav:** 13.5px sage text at 82% on ink, 10px 12px padding, 8px radius. Hover adds sage at 10% and white text. Active fills sage with ink text, 600. Focus outlines are sage on the spine.
- **Public tabs:** the same grammar in a horizontal header bar; the account link is a sage-outlined button.
- **Mobile:** spine collapses to a top bar with a menu toggle; nav, controls and identity open beneath it.

### Ledger
The signature component. Full-width collapsed table, 13.5px tabular numerals. Heads are 11px uppercase muted over a line-strong rule; cells pad 15px top and bottom over line-soft hairlines; numeric columns right-align. A cell title (14.5px 600) with a caption sub-line is the standard first column. Ruled lists (`li` rows of 14px padding) and key/value lists (muted keys, right-aligned values, ruled total) follow the same hairline grammar.

### Figure Row
A single ruled row of 2 to 4 figures: Space Grotesk 32px 600 tabular value, 12.5px muted label beneath (a label may be an underlined link to the list it summarises). Positive money uses Moss. No boxes, no icons, no deltas in coloured chips.

### Switch, Meter, Notice
- **Switch:** 40 by 22px track, ink at 22% off, Moss on; white 16px thumb that slides 18px with the out-expo ease.
- **Meter:** 8px fully rounded track in ink tint, Moss fill (ink for neutral), grows from the left in 0.6s.
- **Notice:** sage-wash panel, 10px radius, 14px 16px padding; error notices are transparent with a dashed ink-45% border.
- **Loading:** shimmer skeletons in mist; all motion collapses under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** set every screen as ink on paper, with content in ruled rows and white sheets bordered at 1px line (rgba(21, 65, 83, 0.12)) with 14px corners.
- **Do** open portal pages with headline, one muted lede line, and one ruled figure row of 2 to 4 numbers in Space Grotesk at 32px.
- **Do** use tabular numerals for every column of figures and right-align numeric columns.
- **Do** use Deep Moss (#4a6847) for green text under 26px; Moss (#71926e) only for display figures, toggles, meters and focus.
- **Do** keep status pills worded and toned by the five pill tones; dashed means pending or due, solid ink means overdue.
- **Do** use the sage wave image well wherever a listing photo is missing.

### Don't:
- **Don't** put figures in tiles, stat cards or coloured boxes; they sit in one ruled row.
- **Don't** add shadows to sheets, cards, tables or nav; lift is reserved for dialogs, switch thumbs, selected segments and the field focus halo.
- **Don't** place icons in tinted squares or circles. Icons come only from Moving Icons (`@jis3r/icons`, animated Lucide) through `Icon.svelte`, at 1.75 stroke, inline beside text: one per sidebar nav item (17px, animates on hover or focus), plus back arrows, checks and the phone menu toggle. Never add icons elsewhere, and never draw a one-off SVG or use a Unicode glyph as an icon.
- **Don't** use sage as a button fill or text colour on paper.
- **Don't** put uppercase tracked labels above headings; uppercase is for column and key labels only.
- **Don't** introduce a third typeface or a new accent hue.
