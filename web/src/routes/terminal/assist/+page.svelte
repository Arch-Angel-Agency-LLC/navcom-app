<script lang="ts">
  /**
   * Assist — I need someone. Not an emergency, and not nothing.
   *
   * Urgency is a required choice rather than a free-text hint, because "soon" and "now" ask
   * the watch for different things and a sentence has to be read before it can be acted on.
   */
  import { onMount } from 'svelte';
  import { watch } from '$lib/terminal/watch.svelte';
  import { operator } from '$lib/terminal/session.svelte';

  let urgency = $state<'soon' | 'now'>('soon');
  let text = $state('');
  let sent = $state(false);

  onMount(() => {
    watch.start();
    return () => watch.stop();
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    sent = false;
    await operator.assist(urgency, text.trim());
    if (operator.lastResponse) sent = true;
  }
</script>

<svelte:head>
  <title>Assist · Field Terminal</title>
  <meta name="description" content="Ask for someone." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Assist</h1>
</header>

<section>
  <p>
    You need a person, and it is not an emergency. If it is,
    <a class="to-distress" href="/terminal/distress/">use Distress</a> — it wakes people up
    and this does not.
  </p>
</section>

<form onsubmit={submit}>
  <fieldset>
    <legend>How long do they have</legend>
    <div class="choices">
      <label class="choice" class:on={urgency === 'soon'}>
        <input type="radio" bind:group={urgency} value="soon" />
        <span>Soon</span>
      </label>
      <label class="choice" class:on={urgency === 'now'}>
        <input type="radio" bind:group={urgency} value="now" />
        <span>Now</span>
      </label>
    </div>
  </fieldset>

  <label for="a">What for <span class="opt">optional</span></label>
  <textarea id="a" bind:value={text} placeholder="second pair of hands, corner of 4th"></textarea>
  <p class="note">
    Leave it blank if typing costs you time. <strong>An assist with no words still means
    you need someone</strong>, and the watch can ask.
  </p>

  {#if watch.state.state === 'dark'}
    <p class="error">No watch. This will send, and nobody will see it until one is up.</p>
  {/if}
  {#if operator.error}
    <p class="error">{operator.error}</p>
  {/if}
  {#if sent}
    <p class="ok" data-acked>Acknowledged by the watch.</p>
  {/if}

  <button type="submit" disabled={operator.busy}>
    {operator.busy ? 'Sending…' : urgency === 'now' ? 'Assist — now' : 'Assist — soon'}
  </button>
</form>

<style>
  fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
  legend { font-size: .9rem; color: var(--t-muted); padding: 0; }
  .choices { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .choice {
    display: flex; align-items: center; justify-content: center;
    min-height: 3.5rem; border: 2px solid var(--t-line-strong); background: var(--t-raised);
    color: var(--t-muted); font-size: 1.05rem; font-weight: 600; cursor: pointer;
  }
  .choice.on { border-color: var(--t-oncall); color: var(--t-ink); }
  /* Kept in the accessibility tree and focusable — the border carries the state visually. */
  .choice input { position: absolute; opacity: 0; width: 0; height: 0; }
  .choice:focus-within { outline: 3px solid var(--t-ink); outline-offset: 3px; }
  .opt { color: var(--t-faint); font-size: .8rem; }
  .to-distress { color: var(--t-dark); }
  .ok { color: var(--t-station); margin: 0; }
</style>
