<script lang="ts">
  import { onMount } from 'svelte';
  import { capabilitySentence } from '@navcom/core';
  import { watch } from '$lib/terminal/watch.svelte';
  import { operator } from '$lib/terminal/session.svelte';
  import { loadConfig } from '$lib/terminal/config';
  import { loadIdentity } from '$lib/terminal/identity';

  const s = $derived(watch.state);
  let configured = $state(false);
  let identity = $state<ReturnType<typeof loadIdentity>>(null);

  onMount(() => {
    configured = loadConfig() !== null;
    identity = loadIdentity();
    watch.start();
    return () => watch.stop();
  });

  const session = $derived(operator.session);

  /** Whole minutes remaining. Negative reads as over, not as a smaller number. */
  const remaining = $derived.by(() => {
    if (!session) return null;
    return Math.round((session.expectedUntil - Date.now() / 1000) / 60);
  });

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

{#if watch.alarms.length > 0}
  <!--
    Above the watch state, because it changes what the state MEANS. Everything below this
    is the watch's account of itself, and this says that account has contradicted itself.
  -->
  <section class="alarm" data-root-alarm={watch.alarms.at(-1)?.kind}>
    <h2>This watch contradicted itself</h2>
    {#each watch.alarms.slice(-3) as a, i (i)}
      <p>
        {#if a.kind === 'diverged'}
          It published two different accounts of its own log at the same length
          (<span class="mono">{a.was.size}</span> entries). <strong>Nothing legitimate does
          that.</strong> History was rewritten after it had been committed to.
        {:else if a.kind === 'shrank'}
          Its log went from <span class="mono">{a.was.size}</span> entries to
          <span class="mono">{a.now.size}</span>. Retention does this on a schedule; so does
          deletion.
        {:else}
          It was committing to a log and has stopped.
        {/if}
      </p>
    {/each}
    <p class="cost">
      This device recorded it, and keeps it. Signing on under this watch is a decision you
      are allowed to make either way — but you get to make it knowing.
    </p>
  </section>
{/if}

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

{#if session}
  <!-- On station. What the board believes about you, so a wrong entry is visible here. -->
  <section class="station" data-station>
    <h2>On station</h2>
    <p class="area">{session.area}</p>
    <p class="until">
      {#if remaining !== null && remaining > 0}
        {remaining} min left of what you declared
      {:else}
        <strong>Past your declared time.</strong> The watch will nudge, and nothing more.
      {/if}
    </p>
    <p class="told">
      Told at sign-on: <span>{session.toldAtSignOn}</span>
    </p>
  </section>

  <nav class="actions">
    <a class="action" href="/terminal/query/">Query</a>
    <a class="action" href="/terminal/assist/">Assist</a>
    <button onclick={() => operator.routine()} disabled={operator.busy}>
      {operator.busy ? '…' : 'Check in'}
    </button>
    <button onclick={() => operator.standDown()} disabled={operator.busy}>Stand down</button>
  </nav>
  <a class="action distress" href="/terminal/distress/">Distress</a>
{:else if configured && identity}
  <nav class="actions single">
    <a class="action primary" href="/terminal/sign-on/">Sign on</a>
  </nav>
  <!-- Distress does not require being on station. Needing help does not wait for paperwork. -->
  <a class="action distress" href="/terminal/distress/">Distress</a>
{/if}

{#if operator.error}
  <p class="error">{operator.error}</p>
{/if}

<!-- The consequence, not the label. A word like "Automated" is not enough on its own. -->
<section class="consequence" data-capability>
  <p>{capabilitySentence(s)}</p>
</section>

{#if s.state === 'dark'}
  <section class="offline">
    <h2>Dark is not an error</h2>
    <p>
      Nothing is watching. That is a state, not a failure to connect — this screen and your
      identity work with no watch and no signal, and Distress will keep trying regardless.
    </p>
    <p class="cost">
      It leaves you less capable, and there is no way around that. <strong>Query needs a
      watch</strong> — there is nobody to ask.
      <!--
        This paragraph used to promise a cached directory, playbooks and a personal log.
        None of the three exist yet. Claiming a capability on the one screen that must be
        honest is the same failure as claiming a watch that isn't there, and it is worse
        here because an operator plans around it. Restore the sentence when they ship.
      -->
    </p>
  </section>
{/if}

{#if !configured}
  <section class="notyet">
    <h2>Not configured</h2>
    <p>
      This terminal has no Watchtower yet. Someone hands you a pubkey and a relay list in
      person — nothing discovers a Watchtower on its own, because a list of Watchtowers is a
      list of where operators are.
    </p>
    <p><a class="action" href="/terminal/setup/">Set up</a></p>
  </section>
{:else if watch.read.reason === 'stale'}
  <section class="notyet">
    <h2>Last word was {watch.read.ageSeconds ?? '?'}s ago</h2>
    <p>
      A Watchtower is configured and the relay is still serving its last message, but that
      message is old enough that the daemon may be gone. <strong>Old is treated as Dark</strong>
      — a stale event says what was true, not what is.
    </p>
  </section>
{:else if !identity}
  <section class="notyet">
    <h2>No identity yet</h2>
    <p>Your keypair is generated here and never leaves. <a href="/terminal/setup/">Create one</a>.</p>
  </section>
{/if}

{#if configured || identity}
  <!-- Two taps from anywhere in the terminal. Not buried, and not a button large enough to
       hit while putting the phone in a pocket. -->
  <nav class="quiet">
    <a href="/terminal/log/">Your record</a>
    <a href="/terminal/wipe/">Wipe this device</a>
    <a href="/terminal/setup/">Setup</a>
  </nav>
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

  .station { border: 2px solid var(--t-station); background: var(--t-raised); padding: 1rem 1.1rem; }
  .station h2 { color: var(--t-station); }
  .area { color: var(--t-ink); font-size: 1.25rem; font-weight: 650; margin: 0 0 .25rem; }
  .until { font-size: .95rem; margin: 0 0 .5rem; }
  .told { font-size: .82rem; color: var(--t-faint); margin: 0; }
  .told span { font-style: italic; }

  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .actions.single { grid-template-columns: 1fr; }
  .actions :global(.action), .actions button { width: 100%; }
  .primary { border-color: var(--t-station); color: var(--t-station); }

  .alarm { border: 2px solid var(--t-dark); background: var(--t-sunk); padding: 1rem 1.1rem; gap: .5rem; }
  .alarm h2 { color: var(--t-dark); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

  .quiet { display: flex; gap: 1.2rem; }
  .quiet a { color: var(--t-faint); font-size: .9rem; text-decoration: none; border-bottom: 1px solid var(--t-line); }

  /* Always its own row, always last, never adjacent to an ordinary action. */
  .distress {
    border-color: var(--t-dark); color: var(--t-dark); background: var(--t-sunk);
    text-transform: uppercase; letter-spacing: .04em;
  }
</style>
