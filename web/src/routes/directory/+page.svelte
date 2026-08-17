<script lang="ts">
  import RecordSummary from '$lib/components/RecordSummary.svelte';
  import { labelValue } from '$lib/directory/load';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const now = $derived(new Date(data.builtAt));
  const publishedOn = $derived(data.builtAt.slice(0, 10));

  const realCount = $derived(data.records.filter((r) => !r.id.startsWith('EXAMPLE')).length);

  const byType = $derived(
    Object.entries(
      data.records.reduce<Record<string, typeof data.records>>((acc, r) => {
        (acc[r.type] ??= []).push(r);
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b))
  );
</script>

<svelte:head>
  <title>Directory · NavCom</title>
</svelte:head>

<div class="wrap">
  <p class="eyebrow">Resource directory</p>
  <h1>What is open, and who they will take</h1>

  {#if realCount === 0}
    <div class="notice notice--warn">
      <p class="notice__label">No real entries yet</p>
      <p>
        This directory has not been seeded for any city. The entries below are examples
        that exist to demonstrate how records are displayed — <strong>they are not real
        places and the addresses are not real.</strong>
      </p>
    </div>
  {/if}

  <div class="notice">
    <p>
      <strong>Reporting that something is wrong is not possible here yet.</strong> This page
      is read-only. Corrections come from operators using the field terminal, where they
      queue up even with no signal.
    </p>
  </div>

  {#each byType as [type, records] (type)}
    <section>
      <h2>{labelValue(type)}</h2>
      <ul class="cards">
        {#each records as record (record.id)}
          <li><RecordSummary {record} {now} /></li>
        {/each}
      </ul>
    </section>
  {/each}

  <p class="built">
    Ages on this page are counted from <time datetime={publishedOn}>{publishedOn}</time>,
    when it was published.
  </p>
</div>

<style>
  h1 {
    font-size: clamp(1.7rem, 5vw, 2.3rem);
    line-height: 1.15;
    letter-spacing: -0.015em;
    margin: 0.5rem 0 1.25rem;
  }

  .notice { margin-bottom: 1rem; }

  section { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 1rem; }

  h2 {
    font-size: 1.05rem;
    font-family: var(--font-body);
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--line-strong);
  }

  .cards { display: flex; flex-direction: column; gap: 1rem; }

  .built {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--faint);
  }
</style>
