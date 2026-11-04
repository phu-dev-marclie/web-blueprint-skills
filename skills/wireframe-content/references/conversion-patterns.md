# Conversion patterns

Patterns that move a visitor through a website to the conversion goal. Read when designing the sitemap or when a page isn't pulling its weight in the funnel.

---

## 1. The "trail of CTAs" rule

Every page above the conversion page must have a primary CTA that points to the conversion page. No exceptions.

The visitor's path through the site should feel like: every time they scroll, there's a way to convert. They might click in section 1, 4, or 8 — but the button is always visible.

Practical rules:

- **Hero CTA** — primary CTA above the fold.
- **Section CTAs** — one CTA at the end of each meaningful section (rooms, services, location).
- **Pre-footer CTA** — full conversion block before footer on every page except the conversion page and `/thank-you`.
- **Sticky CTA on mobile** — fixed at the bottom of the viewport.

---

## 2. The primary CTA label problem

Two common mistakes:

1. **Generic CTAs** — "Submit", "Click here", "Learn more". These don't tell the visitor what happens next.
2. **Different wording per page** — "Check Dates" on one page, "Request a Quote" on another, "Book Now" on a third. Visitors lose the thread.

Pick one primary CTA label. Use it everywhere. Acceptable variations:

- `Check Availability` (default, on most pages)
- `Check Dates` (mobile sticky, short)
- `Request a Quote` (on the rates page, where the implicit promise is different)

If you find yourself writing a fourth variant, stop and pick one of the existing three.

---

## 3. Secondary CTA: where attention should go if not primary

The secondary CTA is the "I'm not ready yet" path. Common patterns:

- On Home: primary = `Check Availability`, secondary = `Tour the Villa` (deeper learn)
- On a product page: primary = `Check Availability`, secondary = `See the Gallery` (build desire)
- On About: primary = `Check Availability`, secondary = `Tour the Villa`
- On FAQ: primary = `Check Availability`, no secondary (already in research mode)

Don't put two equally-weighted primary buttons. The visitor needs hierarchy.

---

## 4. Friction-reduction microcopy near CTAs

The CTA itself is the door; the line above or below is the handle. Reassure away the fear that's keeping them from clicking:

- *"No portals, no surprise fees."*
- *"Reply within 24 hours, often within two."*
- *"Hold dates free for 48 hours."*
- *"30-day money back, no questions."*
- *"Speak to a real person — not a bot."*

One line is enough. More than three feels defensive.

---

## 5. Pricing presentation

Three strategies; pick one for the project and apply consistently:

### 5.1 Public rates

Show the rate table on `/rates`. Primary CTA = `Check Availability` (book at the price you see).

### 5.2 By-quote ("inquire only")

No prices shown anywhere. Rates page becomes "Why personalised pricing", "What every quote includes", "Minimum commitments by season", "How booking works", "Cancellation". Primary CTA = `Request a Quote`.

This works when:
- The product genuinely varies cost by inputs (length, group, add-ons).
- The brand wants to qualify leads via conversation.
- Avoiding a "from $X" anchor is strategic.

### 5.3 Hybrid (tiers + custom)

A Starter / Pro / Enterprise pattern. Show starter and pro prices; Enterprise is "Contact sales". Common in SaaS.

---

## 6. Forms — what to ask

Three goals when designing a form:

1. **Don't lose them at the wall** — minimum required fields. Each required field is a chance to abandon.
2. **Capture enough to qualify and reply well** — name, contact, intent, scale.
3. **Show "we read this" with optional fields** — interests, add-ons, message.

Recommended field count for inquiry forms: **3–5 required, 4–8 optional.** More than 10 fields total → conversion drops.

### Required (almost always)

- Full name
- Email
- One date or one scale variable (check-in, group size, plan tier)
- Consent checkbox

### Recommended optional

- Phone (helps reply faster, not required)
- Purpose / intent (helps prepare)
- Add-on interests (multi-checkbox; reads "we offer these")
- Message (free text; reads "we're listening")

### Helper text patterns

- Reassure required fields: *"We'll reply here within 24 hours."*
- Soften optional: *"Optional, but helps us reply faster."*
- Anchor expectations: *"Earliest stay date you'd like."*

---

## 7. The thank-you page — under-rated

After form submit, the visitor lands on `/thank-you`. Goals:

- **Absorb anxiety** — confirm receipt, restate SLA.
- **Park time** — give them 2–4 things to do while they wait (gallery, reviews, location).
- **Open loop** — calendar add, social follow.
- **Reduce "did it go through?" emails** — bottom note about checking spam.

Do not put a pre-footer CTA on `/thank-you`. The conversion has happened.

---

## 8. Persona hooks per page (recipe)

When designing a page, ask:

1. **Which persona is primary?** (from `_foundations/personas.md`)
2. **What's their main objection?** Address it within the first 30% of the page.
3. **What hook resonates with them?** Use it in the hero subtitle or first body paragraph.

Example: page targeted at family persona. Main objection: "is it really kid-friendly?". Hook: ensuite bathrooms for every bedroom. Address: in the hero subtitle, mention "six ensuite bedrooms, no morning queue".

---

## 9. Trust signals — when and where

Sprinkle through the site, don't pile in one place:

- **Above the fold on Home** — thin trust strip (review count, response time, channels listed).
- **About page** — owner photo, story, principles. The trust comes from specificity.
- **Reviews page** — quotes, names, dates, types of stay. External proof links.
- **Pre-footer** — a quick reassurance line under the CTA.

A pile of badges at the bottom of every page reads as desperate. Surgical placement reads as confident.

---

## 10. Page-by-page conversion check

After generating each page, ask:

- Does this page contain a primary CTA above the fold?
- Does the primary CTA point to the conversion page?
- Is the secondary CTA softer (deeper learn) than the primary (commit)?
- Is the pre-footer CTA block present (except on conversion page and thank-you)?
- Is there at least one piece of trust copy (review, USP, specific) within the first half of the page?
- Are the CTA labels consistent with `_foundations/ux-patterns.md`?

A page that fails 2+ of these is leaking visitors.
