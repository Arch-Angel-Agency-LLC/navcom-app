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
  import encodeQR from '@paulmillr/qr';
  import { canScan, pubkeyFrom, scan, ScanError, type Scanner } from '$lib/terminal/scan';

  let mine = $state<Peer[]>([]);
  let myPubkey = $state<string | null>(null);
  let code = $state('');
  let callsign = $state('');
  let error = $state<string | null>(null);
  let copied = $state(false);
  let using = $state<string[]>([]);
  let defaults = $state(false);
  let scannable = $state(false);
  let scanning = $state(false);
  let camera = $state<HTMLVideoElement | null>(null);
  let scanner: Scanner | null = null;

  onMount(() => {
    using = relays();
    defaults = usingDefaults();
    scannable = canScan();
    mine = peers();
    myPubkey = loadIdentity()?.pubkey ?? null;
    // A pairing link opens straight into the form with the code already there. The person
    // still has to name them and accept, because pairing must be something you did.
    const fromLink = page.url.hash.replace(/^#/, '');
    if (fromLink) code = fromLink;
  });

  const link = $derived(myPubkey ? `https://navcom.app/terminal/peers/#${myPubkey}` : '');

  /**
   * The code as a QR, drawn as SVG.
   *
   * `@paulmillr/qr` is by the same author as the elliptic-curve and hashing libraries
   * nostr-tools already depends on — same ecosystem, no new supply chain, and no
   * dependencies of its own. The alternative was hand-rolling Reed-Solomon on a screen
   * whose whole job is exchanging keys, which is not a place to be inventive.
   *
   * SVG rather than canvas: it scales to whatever the phone is, prints, and needs no
   * pixel-density arithmetic.
   */
  const qr = $derived(myPubkey ? encodeQR(link, 'svg', { ecc: 'medium', border: 2 }) : '');
  /** Broken into blocks. Sixty-four unbroken characters is unreadable and unspeakable. */
  const blocks = $derived(myPubkey ? (myPubkey.match(/.{1,8}/g) ?? []) : []);

  async function startScan() {
    if (!camera) return;
    error = null;
    scanning = true;
    try {
      scanner = await scan(camera);
      const raw = await scanner.found;
      const key = pubkeyFrom(raw);
      if (!key) throw new ScanError('That code is not a NavCom code.');
      code = key;
    } catch (err) {
      error = err instanceof ScanError ? err.message : 'Could not scan.';
    } finally {
      scanning = false;
      scanner = null;
    }
  }

  function stopScan() {
    scanner?.stop();
    scanner = null;
    scanning = false;
  }

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
    <!-- Held up to their camera. This is the in-person path the design prefers, and it is
         the only one that does not travel through somebody else's servers. -->
    <div class="qr" data-qr>{@html qr}</div>
    <details>
      <summary>Or read it out</summary>
      <p class="blocks">{#each blocks as b, i (i)}<span>{b}</span>{/each}</p>
    </details>
    <button onclick={copy}>{copied ? 'Copied' : 'Copy your link'}</button>
    <p class="cost">
      Hold it up to their camera. Nothing happens until they accept, and nothing about you
      is published by having a code.
    </p>
  {:else}
    <p>Pick a callsign first — <a href="/terminal/setup/">it takes one screen</a>.</p>
  {/if}
</section>

<section class="act">
  <h2>Add somebody</h2>
  <!-- Camera first where the browser has one, because holding a phone up beats reading
       hex aloud. Where it does not, this is absent rather than broken. -->
  {#if scannable}
    <button type="button" onclick={scanning ? stopScan : startScan}>
      {scanning ? 'Stop' : 'Scan their code'}
    </button>
    <video
      bind:this={camera}
      class="camera"
      class:live={scanning}
      playsinline
      muted
      aria-label="Camera, looking for a pairing code"
    ></video>
  {/if}

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
  .qr {
    background: #fff; padding: .7rem; align-self: flex-start; line-height: 0;
    /* White ground regardless of theme: a scanner needs the contrast the format assumes. */
  }
  .qr :global(svg) { width: min(62vw, 15rem); height: auto; display: block; }
  .camera { width: 100%; max-height: 0; border-radius: 2px; background: var(--t-sunk); }
  .camera.live { max-height: 16rem; object-fit: cover; margin-top: .5rem; }

  details summary { color: var(--t-faint); font-size: .88rem; min-height: 2.4rem; cursor: pointer; }

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
