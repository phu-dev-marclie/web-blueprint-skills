# UX Patterns — [Project Name]

> Standard microcopy. Reused across every page. Keep wording consistent: do not invent a new "Check Availability" variant on a different page.

---

## 1. CTA labels

### 1.1 Primary CTA

The button that drives the conversion goal. Same label everywhere:

- **Default:** `[Primary CTA]`
- **Mobile sticky:** `[Shorter variant for mobile]`

### 1.2 Secondary CTAs (per context)

- **Explore product / villa / app:** `[label]`
- **Gallery:** `See the Gallery`
- **Reviews:** `Read Guest Stories` / `Read Reviews`
- **Pricing / Rates:** `See Rates` / `How Booking Works`
- **Eat & Drink / Menu:** `Browse the Menu`
- **Services:** `Explore Services`
- **Location:** `Explore the Area`
- **FAQ:** `See all FAQs`

### 1.3 Tertiary

- **Email:** `Email Us`
- **Phone:** `Call [number]`
- **WhatsApp:** `Message on WhatsApp`
- **Newsletter:** `Stay in Touch`

### 1.4 Form submits

- **Inquiry form:** `Send Inquiry`
- **Contact form:** `Send Message`
- **Newsletter:** `Subscribe`

---

## 2. Form — Primary conversion form

### 2.1 Field labels (fill in for the project)

| Field | Label | Placeholder | Helper | Required |
|---|---|---|---|---|
| Name | Full name | Jane Doe | — | Yes |
| Email | Email | you@example.com | We'll reply here. | Yes |
| Phone | Phone (optional) | +1 555 0100 | Optional, but helps us reply faster. | No |
| ... | | | | |

### 2.2 Dropdown values

If any field is a dropdown, list options here.

### 2.3 Validation messages

Empathetic, specific, no blame.

| Trigger | Message |
|---|---|
| Empty required (name) | We'd love a name to write back to. |
| Empty required (email) | Email is how we'll reply — please add yours. |
| Invalid email | That email doesn't look right — please check. |
| Generic server error | Something went wrong on our side. Try again, or email [email]. |
| Network error | Looks like the connection dropped. Try again? |

### 2.4 Submit states

| State | Label |
|---|---|
| Default | `Send Inquiry` |
| Loading | `Sending…` |
| Success | (redirect to `/thank-you`) |
| Error | `Try Again` |

### 2.5 Success page hero

```
Thank you, {{first_name}}.
Your inquiry is in good hands.

We'll reply within 24 hours — usually faster.
```

---

## 3. Section headings (reusable)

A list of section labels you can pick from to keep page-to-page consistency:

- *Welcome*
- *About the [Product]*
- *Inside the [Product]*
- *[Feature] highlights*
- *What's included*
- *Add-on services*
- *Around the [location]*
- *Rates & Booking*
- *Guest stories* / *Customer stories*
- *Frequently asked*

---

## 4. Pre-footer CTA block (every page)

```
Heading: [Big closing question, e.g. "Your [city] stay begins with a single question."]
Subtitle: [Specific call to action, e.g. "Tell us your dates — we'll reply within 24 hours."]
Primary CTA: [Primary CTA]
Secondary CTA: Email Us
```

---

## 5. Error / empty / 404 states

### 5.1 404

```
Heading: This page is on holiday.
Subtitle: The link you followed isn't here anymore. Try the homepage, or check the [product list].

CTA primary: Back to Home
CTA secondary: See the [Product]
```

### 5.2 500 / server error

```
Heading: Something's not quite right on our side.
Subtitle: Try again in a moment, or email [email] — we'll help.

CTA: Try Again
```

### 5.3 Empty filter / search

`No [items] in this filter yet — try another.`

### 5.4 Loading

Keep it boring: `Loading…` or skeleton; no quirky copy that gets stale on the tenth load.

---

## 6. Cookie / consent banner

```
We use cookies to make the site work and to understand how it's used.
You can accept all, or choose what's on.

[ Accept all ]   [ Customise ]   [ Reject non-essential ]
```

---

## 7. Trust strip phrases (only use if true)

- *Reply within 24 hours, often within 2*
- *Quote includes everything — no surprise fees*
- *Speak to a real person — not a bot*
- *Hold dates / quote free for 48 hours*
- *Family-run, owner-on-site*
- *Verified on TripAdvisor / Booking.com / G2*

---

## 8. Tone of error messages — 3 principles

1. **Empathy first** (`That email doesn't look right`, not `Invalid input`).
2. **Specific instruction** (tell them what to do).
3. **No blame** (`please double-check`, not `you entered wrong`).

---

## 9. Update protocol

When a new page introduces a microcopy that's not here, add it to this file with a date marker so future pages reuse it:

```
- `New Button Label` *(added YYYY-MM-DD)* → context.
```
