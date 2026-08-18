<svelte:head>
  <title>NavCom</title>
  <meta
    name="description"
    content="A public directory of who will actually take someone tonight — hours, intake rules, and how recently anyone checked."
  />
</svelte:head>

<div class="wrap">
  <p class="eyebrow">The Watchtower</p>
  <h1>Who will actually take someone tonight.</h1>

  <p class="lead">
    Official listings rot. Hours are wrong, and the rules that decide whether a person gets
    a bed — pets, ID, sobriety, curfew, couples — are usually missing entirely. This
    directory carries those rules, and it always shows how recently anyone checked.
  </p>

  <div class="actions">
    <a class="cta" href="/directory/">Open the directory</a>
  </div>

  <section>
    <h2>How to read it</h2>
    <ul class="rules">
      <li><strong>Every perishable fact shows its age.</strong> "Open until 10pm, verified 3 days ago" — never just "open until 10pm".</li>
      <li><strong>When a check is too old, it says <em>call first</em></strong> rather than showing you a stale answer. That is an honest response, not a missing one.</li>
      <li><strong>Blank means unknown</strong> — never "no restriction". If we do not know whether they take dogs, we say so.</li>
      <li><strong>Unverified public listings look different</strong> from entries a person actually checked, because low-confidence data that looks authoritative is worse than none.</li>
    </ul>
  </section>

  <section>
    <h2>What this is part of</h2>
    <p>
      NavCom is non-institutional dispatch for volunteer patrol networks — someone holds a
      watch while operators are out, and answers questions from the street so nobody has to
      search a database one-handed in the cold.
    </p>
    <p>
      This directory is the part that is useful to anyone facing the same night, so it is
      public and needs no app. Outreach workers, street medics and mutual aid crews are
      welcome to it on their own terms.
    </p>
  </section>
</div>

<style>
  h1 {
    font-size: clamp(2rem, 6vw, 2.9rem);
    line-height: 1.08;
    letter-spacing: -0.02em;
    margin: 0.6rem 0 1rem;
    max-width: 18ch;
  }

  .lead { font-size: 1.1rem; color: var(--muted); max-width: var(--measure); }

  .actions { margin: 1.75rem 0 0; }

  .cta {
    display: inline-block;
    background: var(--ink);
    color: var(--ground);
    padding: 0.75rem 1.4rem;
    font-weight: 600;
    text-decoration: none;
    border: 2px solid var(--ink);
  }
  .cta:hover { background: transparent; color: var(--ink); }

  section { margin-top: 3rem; display: flex; flex-direction: column; gap: 0.9rem; }
  h2 {
    font-size: 1.4rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--line-strong);
  }
  section p { max-width: var(--measure); color: var(--muted); }

  .rules { display: flex; flex-direction: column; gap: 0.75rem; max-width: var(--measure); }
  .rules li {
    padding-left: 1rem;
    border-left: 2px solid var(--line-strong);
    color: var(--muted);
  }
  .rules strong { color: var(--ink); }
</style>
