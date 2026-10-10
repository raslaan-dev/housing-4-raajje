---
version: 1
slug: "apps-web-src-routes"
primary_target: "apps/web/src/routes"
related_targets: []
---

# Surface brief: public site + client, owner and staff portals

Scope: every route in apps/web — public browse/detail, sign-in, /client, /owner, /staff. Mode: Operate (the public browse is a search tool, also Operate). Approved comps: the user's Claude Design files in C:\Users\mohamed.raslaan\Downloads\portal (Home, Sign In, Client Portal, Owner Portal, Staff Portal; Dashboard/Earnings/My Properties/Availability are earlier owner cuts). Data comes from the Express API, never hard-coded.

User constraints: keep the comps' colour scheme and design, improve on them; dashboards (owner dashboard, staff overview) stay minimal — only the figures and lists a person acts on.

## Direction contract

THESIS: A quiet harbour-office ledger. Every screen is a paper sheet of ruled rows under a deep-teal spine; numbers in Space Grotesk carry the hierarchy. It refuses the SaaS card-grid dashboard: no tiles, no shadows, no icon boxes.

OWN-WORLD: Paper #F7F6F2 ground, ink teal #154153 for text, primary buttons and the sidebar; sage #B1CDAE for the active nav item, "available/paid" pills and image wells; moss #71926E for links, toggles and positive figures. White sheets with 1px teal-12% borders, 14px radius. Hairline-ruled lists with uppercase 11px column heads. Pills 999px. Space Grotesk for figures and headings, IBM Plex Sans for everything else.

STORY: Renters see verified homes by island and act (apply/view); owners see what their units earn and why viewers walk; staff clear their branch queue. Each portal opens on the one thing to do next.

FIRST VIEWPORT: Portals: 248px teal sidebar (wordmark, portal name, nav, identity + sign out at the foot), main column with a 28px Space Grotesk title, one muted line, then a single ruled figure row (2–4 numbers at 32px) above the primary list. Public: full-bleed teal band with a 44px headline and the search field; filters on paper below; listing sheets in a fill grid.

FORM: The supplied comps are the approved form (comp-led by the user's own files; no generated comps, no seed roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
