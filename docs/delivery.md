# Delivery

How NavCom reaches the people who use it. The documents around this one describe what the
system *is*; this one describes how it arrives on a device, and what that constrains.

---

## navcom.app — three surfaces

| Surface | For | Notes |
|---|---|---|
| **The Field Terminal** | Operators | Runs at the URL. Installing is optional, not an upgrade |
| **The public directory** | Anyone | No app, no account. Outreach, medics, mutual aid |
| **Docs and status page** | The Skeptic, the Journalist | The auditable surface the design promised |

The site is not a download page for the app. **The app runs there.**

## Progressive commitment, not capability tiers

An operator can try NavCom instantly by opening the URL, operate from the browser
permanently, or install it. The web surface is **complete** — nothing is withheld to
create pressure.

This serves specific people rather than being a fallback. The Skeptic won't commit
anything to his phone before inspecting it. The Ghost refuses installs on principle. The
Convert has 400MB free and one more installed app is a real cost. All three are full
operators [C1, principle 6].

**Installing and not installing run the same application.** An installed PWA and the same
site in a browser tab share one origin storage — installing adds a launcher and removes
browser chrome. It does not move keys, add features, or change what the app can see.

### The two things a PWA cannot do

Native Android/iOS is deferred to Mk1, and it exists for exactly two reasons:

- **`Distress` from a locked screen.** [`spec/signals.spec.md`](spec/signals.spec.md) makes
  this a MUST. A PWA cannot — categorically on iOS, and on Android only after unlocking,
  which is not a mechanism in the situation that matters
- **SMS duress fallback when Dark.** A PWA can only open the SMS composer and hope
  someone taps send

Nothing else justifies a native build. In particular, *"it feels more like a real app"*
does not.

### The install prompt is the hazard

A try-then-install path is precisely where banners, nudges, and withheld features re-enter
a product whose strongest rules forbid all three [C5, principle 13].

**The only permitted pitch is the true one, stated once, where it is relevant:** installing
adds lock-screen `Distress` and SMS fallback. No banner, no interstitial, no repeat, and
nothing degraded on the web to manufacture a reason.

Priced honestly at that moment, two things genuinely are better installed: the home-screen
entry can carry a discreet name and icon, and browsers may evict a non-installed site's
cached storage under pressure. On a phone with 400MB free, that second one is the
difference between the directory being there at 2am and not.

## Holding watch is a mode of the app, not a second application

**Reversed on 2026-08-19.** This page previously said the Console must be served from the
box and never from `navcom.app`. The reasoning was: signals are encrypted to a key that
lives on the box and never leaves it, so a Console served from a public origin could never
decrypt anything.

That reasoning was sound and its premise was not. **It assumed there is a box.** A squad of
four RLSH has no box, no spare machine and nobody who wants to run one — and requiring one
meant those squads could not have a watch at all. Remove the box and the rule dissolves with
it: the field app already generates a private key in the browser and never transmits it, and
a watch view does exactly the same thing.

So there is **one application**, and holding watch is something you take up in it. The
person at home on the sofa with a phone is the watch that night; somebody else is the watch
tomorrow. See [`spec/bootstrap.spec.md`](spec/bootstrap.spec.md) for where the key lives in
each arrangement.

**The box does not go away — it becomes optional.** Run one and the watch is up all night.
Don't, and the watch is up while somebody is awake and holding it. Same app, same protocol,
same wire format.

### What this costs, said plainly

- **Everyone in a squad can read every signal**, on watch or off, because the payload must
  be readable by whoever picks up the watch next. Acceptable inside a squad that already
  knows who is out. Not acceptable for a wider network, and the box arrangement remains the
  answer there
- **Dark becomes the common case.** A phone-held watch is asleep most of the night. That
  puts the weight on the offline directory and on what a lone operator can do without a
  watch, which is where it belongs anyway
- **The field view must not drift into a dispatch console.** Two applications enforced that
  by accident of architecture; one application enforces it by discipline. There is still no
  verb that assigns anyone to anything

### What does not change

Nothing is served from `navcom.app` that was not already: it delivers code, never keys. An
operator's key and a phone-held Watchtower key are both made in the browser and stay there,
so there is still nothing at the hosting provider to subpoena.

## One shared core

Signal, crypto and board logic live in **one library**, with thin shells over it — web,
Android, iOS. A payload change is then one edit rather than three.

Decide and build this before the first client, not after the second. Retrofitting it means
rewriting every client that already exists.

## Static hosting has a clock problem, and it is handled explicitly

A static site computes staleness **once, at build time, and freezes it into HTML.** Left
alone, a page built today will still say a fact was checked recently long after it wasn't —
and it will keep showing a value whose window has closed. That is the confident wrong
answer [principle 9] arriving by a side door, and it is worse than usual because the page
is wrong *about its own freshness*.

Three things together make it honest:

- **Absolute dates are the primary rendering.** *"checked 14 Aug 2026"* is true whenever it
  is read. *"3 days ago"* is only true while the build is fresh, so it appears as a
  secondary hint and never alone
- **A staleness margin.** Confidence is computed against `now + STALENESS_MARGIN_DAYS`, so
  a field reads **call first** a day early rather than a day late. Erring toward call-first
  is the safe direction, and it makes a stale build fail safe instead of fail confident
- **A daily rebuild**, in `.github/workflows/web.yml`

**The scheduled rebuild is load-bearing, not housekeeping.** The margin is sized for a
daily cadence; it will not save a build that is three months old. Any deployment must run
on the schedule, not only on push.

**The Field Terminal escapes this problem, and does.** It is a running application, so it
recomputes every verdict against the operator's real clock on hydration — a cached directory
page opened three weeks later does not still claim three-week-old confidence. It also shows
how old the cached copy itself is, which is the age no record carries and no rebuild fixes.

## Deploying from a workspace

`vercel.json` at the repo root carries the build settings, so they are diffable rather than
living only in a dashboard. **Vercel's Root Directory must be the repository root, not
`web/`** — the site imports `@navcom/core`, which npm resolves through the workspace, and an
install scoped to `web/` cannot see it.

The build command is `npm run verify --workspace navcom-web`, so a deploy that breaks a
display rule or the bundle budget fails instead of shipping.

## Budgets

The device floor is a prepaid Android 8 with ~400MB free [C6], and it is a target rather
than an aspiration — so it gets numbers:

- **Initial JS under 100KB gzipped**
- **The public directory prerenders and works with JavaScript disabled.** Not purity: it is
  the fastest option on a slow phone, the most auditable one for the Skeptic, and the most
  reliable on one bar of signal for the Outpost
- No third-party scripts, no analytics, no fonts from a CDN. Every network call must be
  explainable to someone pointing a proxy at it [H8]

## What the site must never become

A public web presence grows these by default. None of them ship:

- **A directory of Watchtowers.** [`spec/bootstrap.spec.md`](spec/bootstrap.spec.md) is
  explicit — *"a list of Watchtowers is a list of where operators are."* Any "find your
  local watch" feature is forbidden
- **A credential delivery service.** Endorsements are passed operator to operator; the
  system never holds or delivers them [`product/identity.md`](product/identity.md)
- Accounts, signup, waitlists, contact capture
- Analytics, engagement telemetry, or behavioural tracking [H8]

## Known gap: flagging on the public site

Display rule 4 in [`product/directory-schema.md`](product/directory-schema.md) says anyone
can flag a wrong entry in one tap. A static site with no backend has nowhere to put that
write, and every workaround is worse than the gap — `mailto:` leaks an address, a form
service adds a third-party dependency, a code-host issue needs an account.

**Resolution: the public directory is read-only, and flagging lives in the app**, where
corrections already queue offline [C17]. The site says so plainly rather than implying the
rule is met.
