<script lang="ts">
  import { capabilitySentence } from '@navcom/core';
  import { watch } from '$lib/terminal/watch.svelte';

  const s = $derived(watch.state);

  const LABEL = {
    station: 'On station',
    'automated-oncall': 'Automated · on-call',
    automated: 'Automated',
    dark: 'Dark'
  } as const;

  // Each state gets its own colour. Sharing one would make two different situations look
  // the same at a glance, which is the only glance an operator gets.
  const TONE = {
    station: 'var(--t-station)',
    'automated-oncall': 'var(--t-oncall)',
    automated: 'var(--t-auto)',
    dark: 'var(--t-dark)'
  } as const;
</script>

<svelte:head>
  <title>Status · Field Terminal</title>
  <meta name="description" content="What is actually behind you before you go out." />
</svelte:head>

<header>
  <p class="eyebrow">Field Terminal</p>
  <h1>Status</h1>
</header>

<!-- The one screen that must work when everything else is down. -->
<section class="state" style="--tone: {TONE[s.state]}" data-state={s.state}>
  <span class="dot" aria-hidden="true"></span>
  <p class="label">{LABEL[s.state]}</p>
  {#if s.holder}
    <p class="holder">
      {s.holder}
      <!-- An agent is never published as a human, and never presented as one. -->
      {#if s.holder_kind === 'agent'}<span class="kind">agent</span>{/if}
    </p>
  {/if}
</section>

<!-- The consequence, not the label. A word like "Automated" is not enough on its own. -->
<section class="consequence" data-capability>
  <p>{capabilitySentence(s)}</p>
</section>

{#if s.state === 'dark'}
  <section class="offline">
    <h2>Dark is not an error</h2>
    <p>
      Nothing is watching. That is a state, not a failure to connect — and the terminal is
      built to be useful in it: the cached directory, the playbooks and your own log all work
      with no watch and no signal.
    </p>
    <p class="cost">
      It does leave you less capable. <strong>Query needs a watch</strong>, and without one
      you are searching a cached list one-handed in the cold — which is the problem the watch
      exists to solve.
    </p>
  </section>
{/if}

{#if watch.seenAt === null}
  <section class="notyet">
    <h2>Not configured</h2>
    <p>
      This terminal has no Watchtower yet. Someone hands you a pubkey and a relay list in
      person — nothing discovers a Watchtower on its own, because a list of Watchtowers is a
      list of where operators are.
    </p>
  </section>
{/if}

<section class="install">
  <h2>Before you install</h2>
  <p>
    You can rename this when you add it to your home screen, and you should think about
    whether you want to. <strong>A phone that is borrowed, searched or taken shows whatever
    name is on the icon.</strong>
  </p>
  <p class="cost">
    Installing adds two things the browser cannot do: Distress from a locked screen, and an
    SMS fallback when there is no watch. Neither exists yet. Staying in the browser costs you
    nothing else.
  </p>
</section>

<style>
  header { display: flex; flex-direction: column; gap: .2rem; }
  .eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .72rem; letter-spacing: .16em; text-transform: uppercase;
    color: var(--t-faint); margin: 0;
  }
  h1 { font-size: 1.7rem; margin: 0; letter-spacing: -.01em; }

  .state {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: .3rem .8rem;
    border: 2px solid var(--tone);
    background: var(--t-raised);
    padding: 1.1rem 1.2rem;
  }
  .dot {
    width: .85rem; height: .85rem; border-radius: 50%;
    background: var(--tone); grid-row: 1 / span 1;
  }
  .label { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--tone); }
  .holder {
    grid-column: 2; margin: 0; color: var(--t-muted); font-size: 1rem;
    display: flex; align-items: baseline; gap: .5rem;
  }
  .kind {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .68rem; letter-spacing: .1em; text-transform: uppercase;
    border: 1px solid var(--t-line-strong); padding: .1rem .35rem; color: var(--t-faint);
  }

  .consequence {
    border-left: 3px solid var(--t-line-strong);
    padding-left: .9rem;
  }
  .consequence p { margin: 0; font-size: 1.08rem; line-height: 1.5; }

  section h2 {
    font-size: .78rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--t-faint); margin: 0 0 .5rem;
  }
  section p { margin: 0 0 .6rem; color: var(--t-muted); line-height: 1.55; }
  section p:last-child { margin-bottom: 0; }
  .cost { color: var(--t-faint); font-size: .93rem; }
  strong { color: var(--t-ink); font-weight: 650; }
</style>
