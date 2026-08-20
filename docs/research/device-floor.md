# The device floor, measured

Every other document here states the device floor as *"a prepaid Android 8 with ~400MB
free"* [H6] and derives the bundle budget from it. That number was never measured. This is
the measurement, and it says the budget is protecting the wrong axis.

Measured 2026-08-20 against the built terminal. Reproducible: throttled Chromium via
Playwright CDP, `Emulation.setCPUThrottlingRate` and `Network.emulateNetworkConditions`.

---

## What the app actually costs

**First visit, nothing cached.** *Paint* is when the operator can read the screen;
*interactive* is when controls respond.

| Profile | CPU | Bandwidth | Paint | Interactive |
|---|---|---|---|---|
| Desktop, wifi | 1× | unthrottled | 211 ms | **237 ms** |
| Mid phone, good 4G | 4× | 9 Mbps | 203 ms | **1.0 s** |
| Cheap phone, slow 4G | 6× | 1.6 Mbps | 364 ms | **1.7 s** |
| Cheap phone, 300 ms RTT | 6× | 1.6 Mbps | 485 ms | **2.8 s** |
| Cheap phone, "slow 3G" | 6× | 400 kbps | 617 ms | **5.0 s** |
| Very old phone, "slow 3G" | 12× | 400 kbps | 804 ms | **5.2 s** |
| Throttled prepaid | 6× | 128 kbps | 716 ms | **10.9 s** |

**Repeat visit, service worker warm** — the case that happens on patrol:

| Profile | Paint | Interactive |
|---|---|---|
| Cheap phone, slow 3G | 333 ms | **344 ms** |
| Cheap phone, throttled 128 kbps | 491 ms | **509 ms** |
| Cheap phone, **fully offline** | 265 ms | **278 ms** |

**CPU alone, no network throttling:**

| Slowdown | 1× | 4× | 6× | 10× | 20× |
|---|---|---|---|---|---|
| Interactive | 216 ms | 335 ms | 485 ms | 858 ms | 1.97 s |

## Three things the numbers say

**1. It is a bandwidth problem, not a device problem.**

Doubling the CPU penalty from 6× to 12× at the same bandwidth cost **250 ms**. Dropping
from slow 4G to 400 kbps at the same CPU cost **3.3 seconds**. Bandwidth dominates by more
than an order of magnitude. Even at a 20× CPU penalty — far worse than any phone that can
still connect to a US network — the app is interactive in under two seconds.

**The bundle budget is justified in the docs by a slow *device*. The device is not what
makes it slow.**

**2. Paint is fast everywhere, because the terminal is prerendered.**

200–800 ms to readable content across every profile, including the throttled one. An
operator sees the screen and the watch state before any JavaScript runs. The "interactive"
figure is when buttons start working, which is a different and less urgent thing.

**3. The cost is once per install, not once per use.**

Repeat visits are 280–510 ms whatever the network, and **identical offline**. Someone on
patrol has already loaded it. The 10.9-second figure is a first-run cost on the worst
realistic connection, paid at a table rather than on the street.

## What the market says

**Android 8 is 3.1% of devices, worldwide.** Google's own distribution data
([composables.com](https://composables.com/android-distribution-chart), 1 Dec 2025): Android
8.0 is 0.8%, Android 8.1 is 2.3%. Android 8 *or older* is roughly 4.8%. The US skews newer
than the global figure.

**A new phone is now cheaper than the floor.** US prepaid, August 2026: Moto G Play (2024)
at **$29.88**, Samsung Galaxy A15 5G at **$39.88**, Galaxy A16 5G at **$49.88** with 4 GB
RAM and 128 GB storage. The floor describes a 2017 device; in 2026 a *new* phone with eight
times the memory costs thirty dollars.

**3G no longer exists in the United States.** AT&T shut down February 2022, T-Mobile July
2022, Verizon December 2022. Every profile above labelled "3G" is a proxy for *bad signal on
LTE* — a basement, a parking garage, a congested cell at a protest — not a network anybody
is actually attached to. A phone too old for VoLTE stopped working in 2022 and is not in the
population at all.

**US median mobile download speed is 159–275 Mbps** (Ookla, H1 2026: T-Mobile 275.55,
Verizon ~219, AT&T 159.3). The "good 4G" profile above, at 9 Mbps, is already about thirty
times more pessimistic than the median connection.

## The 400MB is about storage, and it is a different argument

139 kB of JavaScript is **0.03%** of 400MB. Storage pressure is a real constraint and it
argues for something real — that NavCom is a PWA with nothing to install, so a phone with no
room can still run it. That decision is already made. It has no bearing on bundle size, and
using it to justify a JS budget conflates two unrelated things.

## What another 100 kB actually costs

Measured rather than extrapolated: the terminal was padded with ~100 kB of un-tree-shakeable
JavaScript, rebuilt, and run against the same profiles.

| Bundle | 1.6 Mbps | 0.8 Mbps | 128 kbps |
|---|---|---|---|
| 139 kB | 1.81 s | 3.00 s | 10.6 s |
| 240 kB | 2.41 s | 4.05 s | 17.3 s |
| **per +100 kB** | **+0.60 s** | **+1.05 s** | **+6.6 s** |

Fitting those gives ~1540 ms of fixed cost plus ~1050 ms per 100 kB at 0.8 Mbps, which is
what the budget is now derived from. The relationship is close to linear, so the derivation
holds for a bundle two or three times this size and should be re-measured beyond that.

## What this means for the budget

The budget is doing something genuinely useful, and it is not the thing it claims. It works
as a **ratchet**: every increase forces a decision, which is why post-quantum sealing got
measured instead of assumed. That value is real and is independent of the number.

What it does not do is model a device. Nobody has ever loaded this on an Android 8 phone,
and the numbers above suggest that if somebody did, it would be fine.

**Re-based on 2026-08-20.** The axis is first-load time on a degraded connection: hard limit
**220 kB** (4 s to interactive at 0.8 Mbps), ratchet at **160 kB** that warns without failing.
The build prints the derived time alongside the size, so the number carries its own reason.

## The gap this measurement actually found

Worth more than the budget itself: **the Distress screen has no working control before its
JavaScript arrives.**

The prerendered HTML contains one button wired to nothing, and zero `sms:` or `tel:` links —
the operator's own person is rendered from `localStorage`, so it needs script like everything
else. On a congested cell that is a three-second window, and on a throttled plan ten, during
which the screen says *"Hold to send"* and holding does nothing.

That is the thing the bundle budget was standing in for, and it is better fixed directly than
by shaving kilobytes off an unrelated screen.

## The part the data does not decide

[`principles.md`](../principles.md) says *"some of the most valuable operators have the
least."* [`archetypes.md`](archetypes.md) makes that concrete in the Convert: formerly
unhoused, working the same blocks, and the person most likely to be carrying whatever phone
she could get.

**Market share does not answer that.** Three percent is small, and serving it is a choice
this project made on purpose rather than a conclusion the data supports or refutes. What
measurement changes is the *price* of the choice — and the price turns out to be low, because
the constraint that would have made it expensive was the CPU, and the CPU is not the
constraint.

The one place the tail genuinely pays is first load on a throttled plan. That is worth
holding a line on. It is not worth holding it in the name of a 2017 processor.
