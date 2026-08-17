<script lang="ts">
  import type { FieldDisplay } from '$lib/directory';
  import { labelValue } from '$lib/directory/load';

  let { label, display }: { label: string; display: FieldDisplay } = $props();
</script>

<div class="row">
  <dt>{label}</dt>
  <dd>
    {#if display.kind === 'unknown'}
      <!-- Rule 5. Blank is unknown, never absence of a restriction. -->
      <span class="unknown">unknown</span>
    {:else if display.kind === 'call-first'}
      <!-- Rule 2. The old value is structurally absent here — it cannot be rendered. -->
      <span class="call-first">Call first</span>
      <span class="why">
        {display.confidence === 'suspect'
          ? 'this entry is flagged'
          : 'last check is too old to rely on'}
      </span>
    {:else}
      <span class="value">{labelValue(display.value)}</span>
      {#if display.age}
        <!-- Rule 1. A volatile value is never shown without its age. -->
        <span class="age">{display.age.label}</span>
      {/if}
    {/if}
  </dd>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 10.5rem 1fr;
    gap: 0.25rem 1rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--line);
  }
  .row:last-child { border-bottom: none; }

  dt {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
    padding-top: 0.15rem;
  }

  dd { margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.2rem 0.55rem; }

  .value { font-weight: 500; }

  .unknown {
    color: var(--faint);
    font-style: italic;
  }

  .call-first {
    font-weight: 700;
    color: var(--stop);
    border-bottom: 2px solid var(--stop);
  }

  .why { font-size: 0.85rem; color: var(--muted); }

  .age {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--muted);
    white-space: nowrap;
  }

  @media (max-width: 32rem) {
    .row { grid-template-columns: 1fr; gap: 0.1rem; }
  }
</style>
