<script lang="ts">
  /**
   * What people who have worked with you have said, and what you have said about them.
   *
   * Nothing here is published, indexed or looked up. It is a folder of signed statements you
   * hold and choose what to show — which is why no map of who-knows-whom exists anywhere in
   * this system.
   */
  import { onMount } from 'svelte';
  import { revoke, SCOPES, writeCredential, type Endorsement, type Scope } from '@navcom/core';
  import { claim, drop, held, presentable, StandingError } from '$lib/terminal/standing';
  import { loadIdentity } from '$lib/terminal/identity';

  let mine = $state<Endorsement[]>([]);
  let callsign = $state<string | null>(null);
  let pasted = $state('');
  let error = $state<string | null>(null);

  let writingScope = $state<Scope | null>(null);
  let written = $state<string | null>(null);
  let copied = $state(false);

  onMount(() => {
    callsign = loadIdentity()?.callsign ?? null;
    mine = held();
  });

  function take() {
    error = null;
    try {
      claim(pasted);
      mine = held();
      pasted = '';
    } catch (e) {
      error = e instanceof StandingError ? e.message : 'Could not take that up.';
    }
  }

  function write(scope: Scope) {
    const identity = loadIdentity();
    if (!identity?.callsign) return;
    const credential = writeCredential(
      identity.secretKey,
      { scope, endorser: identity.callsign, at: new Date().toISOString().slice(0, 10) },
      Math.floor(Date.now() / 1000)
    );
    written = JSON.stringify(credential);
    writingScope = scope;
    copied = false;
  }

  async function copy() {
    if (!written) return;
    try {
      await navigator.clipboard.writeText(written);
      copied = true;
    } catch {
      copied = false;
    }
  }

  function put(e: Endorsement) {
    drop(e.id);
    mine = held();
  }

  const label = (s: string) => s.replace(/-/g, ' ');
  const days = (iso: string) =>
    Math.max(0, Math.round((Date.now() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000));
</script>

<svelte:head>
  <title>Standing · Field Terminal</title>
  <meta name="description" content="What people who have worked with you have said." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Standing</h1>
</header>

<section>
  <p>
    Signed statements from people who have worked beside you. You hold them, you choose what
    to show, and <strong>nothing here is published or looked up</strong>.
  </p>
  <p class="cost">
    <!--
      The property everything else follows from, stated first because it is what makes the
      rest safe rather than a feature of it.
    -->
    <strong>A credential names nobody.</strong> It says <em>"I vouch for the holder of
    this"</em> — a scope and a date, and no subject at all. So you can vouch for somebody who
    has never opened this app, and <strong>no map of who knows whom exists anywhere</strong>,
    including here.
  </p>
  <p class="cost">
    The cost of that is real: <strong>whoever holds the bytes can take it up.</strong> Hand
    one over in person, or the way you already talk to that person. Nothing here can deliver
    it for you, because this app holds nobody's contact details.
  </p>
  <p class="cost">
    <!--
      Eleventh time a claim landed behind a conditional the prerendered page cannot reach,
      and it belongs here regardless: no-free-text is a property of the whole model, not of
      the form where somebody happens to meet it.
    -->
    <strong>There is no free text</strong>, only a scope tag — explaining <em>why</em>
    somebody is credible is how their history leaks, and the person with the most valuable
    knowledge usually has the most to lose from having it described.
  </p>
  <p class="cost">
    <!-- 7.8, and it is the same trade the setup screen states about the callsign itself. -->
    Standing attaches to a key, which means <strong>it is pseudonymous, not anonymous</strong>
    — it links everything you sign. Contributing without a persistent identity is a real
    choice, and it is the other one.
  </p>
</section>

{#if !callsign}
  <section class="act">
    <p>Pick a callsign first — <a href="/terminal/setup/">it takes one screen</a>.</p>
  </section>
{:else}
  <section class="act">
    <h2>What you hold</h2>
    {#if mine.length === 0}
      <p class="cost">
        Nothing yet, and that is the ordinary starting point. Standing also accrues through
        contribution alone — <a href="/terminal/directory/">correcting the directory</a>
        needs nobody's permission and shows up under your callsign.
      </p>
    {:else}
      <ul class="held">
        {#each mine as e (e.id)}
          <li data-endorsement={e.scope}>
            <span class="scope">{label(e.scope)}</span>
            <span class="from">from {e.endorser}, {days(e.at)} days ago</span>
            <button class="drop" onclick={() => put(e)}>Put down</button>
          </li>
        {/each}
      </ul>
      <p class="cost">
        Ages are shown because they matter — somebody vouched for five years ago is a fact
        about five years ago. Nothing expires on a timer; whoever wrote one can withdraw it.
      </p>
    {/if}
  </section>

  <section class="act">
    <h2>Take one up</h2>
    <p class="cost">
      Somebody handed you a credential. Reading it needs no network and takes nobody's
      approval, and whoever wrote it will never know whether you did.
    </p>
    <label for="cred">Paste it</label>
    <textarea id="cred" bind:value={pasted} rows="3" autocomplete="off" spellcheck="false"></textarea>
    {#if error}<p class="error">{error}</p>{/if}
    <button onclick={take} disabled={!pasted.trim()}>Take it up</button>
  </section>

  <section class="act">
    <h2>Vouch for somebody</h2>
    <p class="cost">
      Pick what you can honestly say.
    </p>
    <div class="row">
      {#each SCOPES as scope (scope)}
        <button class="drop" onclick={() => write(scope)}>{label(scope)}</button>
      {/each}
    </div>
    {#if written}
      <p class="cost">
        <strong>{label(writingScope ?? '')}</strong> — give this to them however you already
        talk. It names nobody, so it is theirs the moment they take it up, and you will not
        be told when they do.
      </p>
      <pre class="blob">{written}</pre>
      <button onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    {/if}
  </section>
{/if}

<style>
  .act { gap: .6rem; }
  textarea { width: 100%; }
  .row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .held { list-style: none; margin: 0; padding: 0; }
  .held li {
    display: flex; align-items: center; gap: .8rem;
    border-bottom: 1px solid var(--t-line); min-height: 3.2rem; flex-wrap: wrap;
  }
  .scope { color: var(--t-ink); font-weight: 650; }
  .from { color: var(--t-faint); font-size: .88rem; flex: 1; }
  .blob {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem;
    background: var(--t-sunk); border: 1px solid var(--t-line); padding: .6rem;
    overflow-x: auto; margin: 0; color: var(--t-muted); max-height: 9rem;
  }
  .drop { min-height: 2.4rem; font-size: .85rem; padding: 0 .8rem;
          border-color: var(--t-line); color: var(--t-faint); }
</style>
