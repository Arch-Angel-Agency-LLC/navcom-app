<script lang="ts">
  /**
   * The watch, as a mode of the same app.
   *
   * The hardest problem on this screen is wording rather than mechanism. Everything here
   * looks like a safety monitor — a board, statuses, somebody marked overdue — and it is
   * not one. A phone in a pocket with the screen off observes nothing, and no interface can
   * change that.
   *
   * So the copy states, before anything else and without softening it, that **taking watch
   * is a promise a person makes and keeps by looking.** An operator in the field is told a
   * named human is watching; if that sentence is not true, invariant 4 has failed and
   * somebody went out believing something false.
   */
  import { onMount } from 'svelte';
  import { declineIsValid } from '@navcom/core';
  import { board } from '$lib/terminal/board.svelte';
  import { createWatch, joinWatch, leaveWatch, watchPubkey, WatchKeyError } from '$lib/terminal/watch-key';
  import { loadIdentity } from '$lib/terminal/identity';
  import { loadConfig } from '$lib/terminal/config';

  let address = $state<string | null>(null);
  let callsign = $state<string | null>(null);
  let joining = $state('');
  let error = $state<string | null>(null);
  let answering = $state<string | null>(null);
  let text = $state('');
  let busy = $state(false);
  let confirmLeave = $state(false);

  onMount(() => {
    address = watchPubkey();
    callsign = loadIdentity()?.callsign ?? null;
    board.start();
    return () => board.stop();
  });

  function start() {
    createWatch();
    address = watchPubkey();
    board.start();
  }

  function join() {
    error = null;
    try {
      joinWatch(joining);
      address = watchPubkey();
      joining = '';
      board.start();
    } catch (e) {
      error = e instanceof WatchKeyError ? e.message : 'Could not join that watch.';
    }
  }

  function leave() {
    void board.standDown();
    leaveWatch();
    address = null;
    confirmLeave = false;
  }

  async function send(id: string, declining = false) {
    const item = board.waiting.find((w) => w.id === id);
    if (!item || busy) return;
    busy = true;
    try {
      await board.answer(item, text, declining);
      answering = null;
      text = '';
    } finally {
      busy = false;
    }
  }

  const blocks = $derived(address ? (address.match(/.{1,8}/g) ?? []) : []);
  const configured = $derived(loadConfig() !== null);
</script>

<svelte:head>
  <title>Watch · Field Terminal</title>
  <meta name="description" content="Holding the board." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Watch</h1>
</header>

<section>
  <p>
    Taking watch means <strong>you are the person answering tonight</strong>. Operators who
    sign on will see your callsign and go out believing somebody is reading what they send.
  </p>
  <p class="cost">
    <!--
      4.3, and the reason this screen exists as text before it exists as a board. Everything
      below LOOKS like a monitor and is not one.
    -->
    <strong>This app does not watch anybody. You do.</strong> Nothing here runs in the
    background, nothing wakes you, and a phone in your pocket with the screen dark is not
    reading a board. It shows you what you took on — <strong>keeping it means looking</strong>.
  </p>
  <p class="cost">
    Somebody past their time is <strong>marked, and nothing else happens</strong>. No page,
    no ladder, no contact. People are late for ordinary reasons far more often than
    dangerous ones, and an alarm that cries wolf destroys the one mechanism where failure
    means somebody is hurt.
  </p>
  <p class="cost">
    <!--
      Before the board exists on screen, because it governs how to read the board and
      because somebody deciding whether to take a watch needs to know what it does not tell
      them. Seventh time this session a claim sat behind a conditional the prerendered page
      cannot reach; the manifest caught this one the moment it was written.
    -->
    <strong>An empty board is not the same as nobody being out.</strong> It shows what this
    phone has heard, which after a handover is less than what is true — operators already
    out re-announce themselves a minute or two after their phones notice the watch changed
    hands. Nobody hands you a board, because nobody holds anybody else's picture.
  </p>
  <p class="cost">
    <strong>A <code>Distress</code> is not closed by answering it.</strong> Acknowledging
    tells the operator a person is awake. It stays on this board until a human has actually
    ended it, and there is no button here that clears one.
  </p>
</section>

{#if !callsign}
  <section class="act">
    <p>Pick a callsign first — <a href="/terminal/setup/">it takes one screen</a>.</p>
  </section>
{:else if !address}
  <section class="act">
    <h2>Start a watch</h2>
    <p class="cost">
      This phone becomes the watch. You give the address to the operators who will sign on
      under it, in person — <strong>nothing discovers a watch</strong>, because a list of
      them would be a list of where operators are.
    </p>
    <button onclick={start}>Start a watch on this phone</button>
  </section>

  <section class="act">
    <h2>Or join one</h2>
    <p class="cost">
      A squad shares one watch key, handed over in person like everything else here. Holding
      it means you can answer, and <strong>it does not expire when somebody removes you</strong>
      — a squad-held watch is only for people who already know each other.
    </p>
    <label for="key">Watch key</label>
    <textarea id="key" bind:value={joining} rows="2" autocomplete="off" spellcheck="false"
      placeholder="64 hex characters"></textarea>
    {#if error}<p class="error">{error}</p>{/if}
    <button onclick={join}>Join</button>
  </section>
{:else}
  <section class="act">
    <h2>{board.onStation ? 'On station' : 'Off watch'}</h2>
    {#if board.onStation}
      <p class="cost">
        You are published as the watch, under <strong>{callsign}</strong>. Standing down
        says so — it publishes Dark rather than going quiet, so nobody is left reading a
        stale claim that a human is here.
      </p>
      <button onclick={() => board.standDown()}>Stand down</button>
    {:else}
      <p class="cost">
        Nobody is published as watching. Operators signing on now will read Dark, which is
        a supported state and an honest one.
      </p>
      <button onclick={() => board.takeWatch()}>Take the watch</button>
    {/if}
  </section>

  <section class="act">
    <h2>The address</h2>
    <p class="blocks">{#each blocks as b, i (i)}<span>{b}</span>{/each}</p>
    <p class="cost">
      What operators put in their own setup, along with your relays. Handed over by a
      person; nothing here publishes it.
    </p>
    {#if !configured}
      <p class="cost">
        <strong>Your own terminal is not pointed at any watch.</strong> That is fine — you
        can hold a watch without being under one.
      </p>
    {/if}
  </section>

  <section>
    <h2>Who is out</h2>
    {#if board.entries.length === 0}
      <p class="cost">
        Nobody has signed on <em>that this phone has heard</em>. The board is built from
        signals this device received; it is not a history, and nothing stores one.
      </p>
      <p class="cost">
        If you have just taken over, operators already out re-announce themselves within a
        minute or two of their phones noticing the watch changed hands.
      </p>
    {:else}
      <ul class="board">
        {#each board.entries as e (e.operator)}
          <li class={e.status}>
            <span class="name">{e.callsign}</span>
            <span class="area">{e.area}</span>
            <span class="badge">{e.status}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h2>Waiting on you</h2>
    {#if board.waiting.length === 0}
      <p class="cost">Nothing waiting.</p>
    {:else}
      <ul class="board asks">
        {#each board.waiting as w (w.id)}
          <li class={w.type === 'distress' ? 'distress' : ''}>
            <div class="who">
              <span class="name">{w.callsign}</span>
              <span class="badge">{w.type}</span>
            </div>
            {#if w.text}<p class="said">{w.text}</p>{/if}
            {#if answering === w.id}
              <label for="a-{w.id}">Your answer</label>
              <textarea id="a-{w.id}" bind:value={text} rows="3"></textarea>
              <p class="cost">
                Goes to them and nobody else. It is sent as a person's answer, never as a
                looked-up one — say what you know and say what you do not.
              </p>
              <div class="row">
                <button onclick={() => send(w.id)} disabled={busy}>Send</button>
                <button onclick={() => (answering = null)}>Cancel</button>
              </div>
              {#if declineIsValid(w.type)}
                <!--
                  A separate button, not a phrasing of the answer. "Nobody is coming" has to
                  arrive as a fact the operator's screen can act on, not as text they have to
                  read carefully at 2am.
                -->
                <button class="danger" onclick={() => send(w.id, true)} disabled={busy}>
                  Nobody can come
                </button>
                <p class="cost">
                  Sends <strong>nobody is coming</strong>, plus whatever you wrote. Say it
                  when it is true — somebody who is told plainly can act, and somebody left
                  waiting on an acknowledgement cannot.
                </p>
              {/if}
            {:else}
              <button onclick={() => { answering = w.id; text = ''; }}>
                {w.type === 'distress' ? 'Tell them you are awake' : 'Answer'}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="act">
    <h2>Give up this watch</h2>
    <p class="cost">
      Removes the key from this phone and publishes Dark. <strong>It does not end the
      watch</strong> — anybody else holding the same key still has it, and nothing here can
      reach their devices.
    </p>
    {#if confirmLeave}
      <button class="danger" onclick={leave}>Remove it from this phone</button>
      <button onclick={() => (confirmLeave = false)}>Keep it</button>
    {:else}
      <button onclick={() => (confirmLeave = true)}>Give up this watch</button>
    {/if}
  </section>
{/if}

<style>
  .act { gap: .6rem; }
  textarea { width: 100%; }
  .blocks {
    display: flex; flex-wrap: wrap; gap: .35rem .6rem; margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .95rem;
    color: var(--t-ink);
  }
  .blocks span { background: var(--t-sunk); padding: .2rem .4rem; }
  .board { list-style: none; margin: 0; padding: 0; }
  .board li {
    display: flex; align-items: center; gap: .8rem;
    border-bottom: 1px solid var(--t-line); min-height: 3.2rem;
  }
  .asks li { flex-direction: column; align-items: stretch; gap: .5rem; padding-block: .9rem; }
  .who { display: flex; align-items: center; gap: .7rem; }
  .name { color: var(--t-ink); font-weight: 650; flex: 1; }
  .area { color: var(--t-faint); font-size: .9rem; }
  .said { margin: 0; color: var(--t-ink); font-size: .95rem; }
  .row { display: flex; gap: .6rem; }
  .badge {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .62rem; letter-spacing: .1em; text-transform: uppercase;
    color: var(--t-faint); border: 1px solid var(--t-line); padding: .1rem .3rem;
  }
  .board li.overdue .badge { color: var(--t-station); border-color: var(--t-station); }
  .board li.distress .badge { color: var(--t-alarm); border-color: var(--t-alarm); }
  .danger { border-color: var(--t-alarm); color: var(--t-alarm); }
</style>
