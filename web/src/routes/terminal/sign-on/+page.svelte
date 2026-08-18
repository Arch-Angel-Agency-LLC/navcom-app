<script lang="ts">
  /**
   * Signing on.
   *
   * Deliberate, never automatic. It is also the moment the operator is told what the watch
   * can actually do — before committing, not after — because invariant 4 is about belief at
   * this exact instant.
   */
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { capabilitySentence } from '@navcom/core';
  import { watch } from '$lib/terminal/watch.svelte';
  import { operator } from '$lib/terminal/session.svelte';

  let area = $state('');
  let hours = $state(2);
  let routine = $state<number | null>(60);

  onMount(() => {
    watch.start();
    return () => watch.stop();
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!area.trim()) return;
    await operator.signOn(area.trim(), hours, routine);
    if (operator.session) goto('/terminal/');
  }
</script>

<svelte:head>
  <title>Sign on · Field Terminal</title>
  <meta name="description" content="Go on station." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Sign on</h1>
</header>

<!-- What you are signing on to, said before you sign on, not after. -->
<section class="told" data-told>
  <h2>What is behind you</h2>
  <p>{capabilitySentence(watch.state)}</p>
</section>

{#if watch.state.state === 'dark'}
  <section>
    <p class="error">
      Nothing is watching. You can still sign on — the signal will keep trying — but
      <strong>nobody will see it</strong> until a watch comes back up.
    </p>
  </section>
{/if}

<form onsubmit={submit}>
  <label for="area">Area</label>
  <input
    id="area" bind:value={area} required autocomplete="off"
    placeholder="Downtown, Riverfront" />
  <p class="note">
    Coarse. A district, never an address — this goes on the board and travels with a
    Distress.
  </p>

  <label for="hours">Out for</label>
  <select id="hours" bind:value={hours}>
    <option value={1}>1 hour</option>
    <option value={2}>2 hours</option>
    <option value={4}>4 hours</option>
    <option value={8}>8 hours</option>
  </select>

  <label for="routine">Check in every</label>
  <select id="routine" bind:value={routine}>
    <option value={30}>30 minutes</option>
    <option value={60}>1 hour</option>
    <option value={120}>2 hours</option>
    <option value={null}>Never</option>
  </select>
  <p class="note">
    A missed check-in gets you a nudge, and <strong>nothing else</strong>. It never
    escalates, never pages anyone, and never counts as distress.
  </p>

  {#if operator.error}
    <p class="error">{operator.error}</p>
  {/if}

  <button type="submit" disabled={operator.busy || !area.trim()}>
    {operator.busy ? 'Sending…' : 'Sign on'}
  </button>
</form>

<style>
  .told { border-left: 3px solid var(--t-line-strong); padding-left: .9rem; }
  .told p { font-size: 1.05rem; color: var(--t-ink); }
</style>
