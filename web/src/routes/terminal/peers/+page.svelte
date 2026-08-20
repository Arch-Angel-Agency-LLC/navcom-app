<script lang="ts">
  /**
   * Pairing, and who you are paired with.
   *
   * Nothing here discovers anybody. No suggestions, no ranking, no list of operators who
   * might know each other — that list is the thing this design refuses to build, and its
   * absence is the feature.
   */
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { PairError, pair, peers, unpair, type Peer } from '$lib/terminal/peers';
  import { loadIdentity } from '$lib/terminal/identity';
  import { relays, usingDefaults } from '$lib/terminal/relays';

  let mine = $state<Peer[]>([]);
  let myPubkey = $state<string | null>(null);
  let code = $state('');
  let callsign = $state('');
  let error = $state<string | null>(null);
  let copied = $state(false);
  let using = $state<string[]>([]);
  let defaults = $state(false);

  onMount(() => {
    using = relays();
    defaults = usingDefaults();
    mine = peers();
    myPubkey = loadIdentity()?.pubkey ?? null;
    // A pairing link opens straight into the form with the code already there. The person
    // still has to name them and accept, because pairing must be something you did.
    const fromLink = page.url.hash.replace(/^#/, '');
    if (fromLink) code = fromLink;
  });

  const link = $derived(myPubkey ? `https://navcom.app/terminal/peers/#${myPubkey}` : '');
  /** Broken into blocks. Sixty-four unbroken characters is unreadable and unspeakable. */
  const blocks = $derived(myPubkey ? (myPubkey.match(/.{1,8}/g) ?? []) : []);

  function accept(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    try {
      pair(code, callsign);
      mine = peers();
      code = '';
      callsign = '';
    } catch (err) {
      error = err instanceof PairError ? err.message : 'Could not pair.';
    }
  }

  function drop(peer: Peer) {
    unpair(peer.pubkey);
    mine = peers();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch {
      copied = false;
    }
  }
</script>

<svelte:head>
  <title>Peers · Field Terminal</title>
  <meta name="description" content="Who you have paired with." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Peers</h1>
</header>

<section>
  <p>
    Somebody you paired with sees when you are out, and you see when they are. No watch is
    involved, no server holds it, and either of you can end it without telling the other.
  </p>
  <p class="cost">
    <strong>Best done face to face.</strong> A code sent through a messaging app travels
    through whatever carried it — which is fine between people who already talk that way,
    and worth knowing either way.
  </p>
  <p class="cost">
    <!-- Stated before pairing rather than after. Somebody deciding whether to pair should
         already know how ending it works. -->
    Ending it is one tap, immediate, and <strong>they are not told</strong>. It stops what
    you send them from then on; it cannot recall what they already have.
  </p>
</section>

<!--
  Said plainly because every network call this app makes has to be explainable to somebody
  pointing a proxy at it. Relays carry sealed envelopes they cannot read, and using one
  reveals no Watchtower -- but an operator should still know which strangers' machines
  their presence travels through.
-->
<section class="relays">
  <h2>Where this goes</h2>
  <p class="cost">
    Presence travels through {defaults ? 'these public relays, which ship as defaults' : 'the relays you configured'}.
    They carry sealed messages they cannot read, and none of them learns who your peers are.
  </p>
  <p class="blocks">{#each using as r (r)}<span>{r}</span>{/each}</p>
</section>

<section class="act">
  <h2>Your code</h2>
  {#if myPubkey}
    <p class="blocks">{#each blocks as b, i (i)}<span>{b}</span>{/each}</p>
    <button onclick={copy}>{copied ? 'Copied' : 'Copy your link'}</button>
    <p class="cost">
      Show them this, or send the link. Nothing happens until they accept, and nothing about
      you is published by having a code.
    </p>
  {:else}
    <p>Pick a callsign first — <a href="/terminal/setup/">it takes one screen</a>.</p>
  {/if}
</section>

<section class="act">
  <h2>Add somebody</h2>
  <form onsubmit={accept}>
    <label for="code">Their code</label>
    <textarea id="code" bind:value={code} rows="2" autocomplete="off" spellcheck="false"
      placeholder="paste their code or link"></textarea>
    <label for="name">What you call them</label>
    <input id="name" bind:value={callsign} autocomplete="off" placeholder="Raven" />
    <p class="cost">
      Your name for them, kept on this phone and never sent anywhere. They will never see it.
    </p>
    {#if error}<p class="error">{error}</p>{/if}
    <button type="submit">Pair</button>
  </form>
</section>

{#if mine.length > 0}
  <section>
    <h2>Paired</h2>
    <ul class="paired">
      {#each mine as p (p.pubkey)}
        <li>
          <span class="name">{p.callsign}</span>
          <span class="key">{p.pubkey.slice(0, 12)}…</span>
          <button class="drop" onclick={() => drop(p)}>Remove</button>
        </li>
      {/each}
    </ul>
    <p class="cost">
      Immediate, and they are not told.
    </p>
  </section>
{/if}

<style>
  .act { gap: .6rem; }
  .blocks {
    display: flex; flex-wrap: wrap; gap: .35rem .6rem; margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .95rem;
    color: var(--t-ink);
  }
  .blocks span { background: var(--t-sunk); padding: .2rem .4rem; }

  .paired { list-style: none; margin: 0 0 .6rem; padding: 0; }
  .paired li {
    display: flex; align-items: center; gap: .8rem;
    border-bottom: 1px solid var(--t-line); min-height: 3.2rem;
  }
  .name { color: var(--t-ink); font-weight: 650; flex: 1; }
  .key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74rem; color: var(--t-faint); }
  .drop { min-height: 2.2rem; font-size: .8rem; padding: 0 .7rem; border-color: var(--t-line); color: var(--t-faint); }
</style>
