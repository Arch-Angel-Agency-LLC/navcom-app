<script lang="ts">
  import { ConfigError, loadConfig, saveConfig } from '$lib/terminal/config';
  import { createIdentity, loadIdentity } from '$lib/terminal/identity';
  import { onMount } from 'svelte';

  let callsign = $state('');
  let pubkey = $state('');
  let relays = $state('wss://relay.damus.io\nwss://nos.lol');
  let error = $state<string | null>(null);
  let identity = $state<ReturnType<typeof loadIdentity>>(null);
  let configured = $state(false);

  onMount(() => {
    identity = loadIdentity();
    const c = loadConfig();
    configured = c !== null;
    if (c) {
      pubkey = c.pubkey;
      relays = c.relays.join('\n');
    }
  });

  function makeIdentity(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    const name = callsign.trim();
    if (!name) {
      error = 'A callsign is needed. It is what the board shows.';
      return;
    }
    identity = createIdentity(name);
  }

  function connect(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    try {
      saveConfig(pubkey, relays);
      configured = true;
    } catch (e) {
      error = e instanceof ConfigError ? e.message : 'Could not save that.';
    }
  }
</script>

<svelte:head>
  <title>Set up · Field Terminal</title>
  <meta name="description" content="Identity and Watchtower, both entered here." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">&larr; Status</a></p>
  <h1>Set up</h1>
</header>

{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

<section>
  <h2>Your callsign — the only step</h2>
  {#if identity}
    <p class="done">
      <strong>{identity.callsign}</strong>
      <span class="key">{identity.pubkey.slice(0, 16)}…</span>
    </p>
    <p class="note">
      Generated here. Never transmitted, never registered — there is no account, so there is
      nothing anyone could revoke. <strong>There is also no recovery.</strong> Lose this
      device and you lose this identity.
    </p>
  {:else}
    <form onsubmit={makeIdentity}>
      <label for="callsign">Callsign</label>
      <p class="note">
        How you are known. Never a legal name. Once this exists the app is ready — the
        section below is optional and most operators will not have one at first.
      </p>
      <input id="callsign" bind:value={callsign} autocomplete="off" spellcheck="false" />
      <button type="submit">Generate keypair</button>
    </form>
  {/if}
</section>

<section class="later">
  <h2>A watch — optional, and only if somebody gave you one</h2>
  <p class="note">
    <strong>Skip this.</strong> You do not need a watch to use NavCom, and having none is
    how most operators work. Come back when somebody hands you one.
  </p>
  <p class="note">
    What it adds: Query, Assist and Distress — the three things that need a person on the
    other end. What it does not change: everything else, which already works.
  </p>
  <p class="note">
    Handed to you in person, on paper or by whatever you already use. <strong>Nothing
    discovers a Watchtower on its own</strong> — a list of them would be a list of where
    operators are.
  </p>
  <form onsubmit={connect}>
    <label for="pubkey">Pubkey</label>
    <input id="pubkey" bind:value={pubkey} autocomplete="off" spellcheck="false" placeholder="64 hex characters" />
    <label for="relays">Relays</label>
    <textarea id="relays" bind:value={relays} rows="3" autocomplete="off" spellcheck="false"></textarea>
    <button type="submit">{configured ? 'Update' : 'Connect'}</button>
  </form>
  {#if configured}<p class="done">Saved. <a href="/terminal/">Back to status</a></p>{/if}
</section>

<style>
  header { display: flex; flex-direction: column; gap: .2rem; }
  .eyebrow {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; margin: 0;
  }
  .eyebrow a { color: var(--t-faint); text-decoration: none; }
  h1 { font-size: 1.7rem; margin: 0; }
  h2 {
    font-size: .78rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--t-faint); margin: 0 0 .5rem;
  }
  section { display: flex; flex-direction: column; }
  form { display: flex; flex-direction: column; gap: .5rem; }
  label { font-size: .9rem; color: var(--t-muted); }
  input, textarea {
    background: var(--t-sunk); border: 2px solid var(--t-line-strong); color: var(--t-ink);
    font: inherit; font-size: 1rem; padding: .8rem; border-radius: 2px; min-height: 3.2rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  textarea { min-height: 5rem; }
  button { margin-top: .4rem; }
  /* Visibly secondary, so nobody reads it as a step they are failing to complete. */
  .later { border-top: 1px solid var(--t-line); padding-top: 1.2rem; opacity: .82; }
  .note { font-size: .9rem; color: var(--t-faint); margin: 0 0 .3rem; line-height: 1.5; }
  .note strong, .done strong { color: var(--t-ink); }
  .done { color: var(--t-muted); display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
  .key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; color: var(--t-faint); }
  .error {
    color: var(--t-dark); border: 2px solid var(--t-dark); padding: .7rem .9rem; margin: 0;
  }
</style>
