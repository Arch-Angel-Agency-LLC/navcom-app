<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const GROUP_NAMES: Record<string, string> = {
    '': 'Start here',
    spec: 'Specifications — normative',
    watch: 'The watch',
    product: 'Product',
    research: 'Research'
  };
</script>

<svelte:head>
  <title>Docs · NavCom</title>
</svelte:head>

<div class="wrap">
  <p class="eyebrow">Documentation</p>
  <h1>How this is built, and why</h1>

  <p class="lead">
    Everything is published, including the parts that are unresolved and the constraints
    that were argued over. If you are deciding whether to trust this with anything, the
    documentation is the surface to audit — there is no other one.
  </p>

  {#each data.groups as { group, pages } (group)}
    <section>
      <h2>{GROUP_NAMES[group] ?? group}</h2>
      <ul>
        {#each pages as page (page.slug)}
          <li>
            <a href="/docs/{page.slug}">{page.title}</a>
            <span class="slug">{page.slug}.md</span>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  h1 { font-size: clamp(1.7rem, 5vw, 2.3rem); line-height: 1.15; margin: 0.5rem 0 1rem; }
  .lead { color: var(--muted); max-width: var(--measure); }

  section { margin-top: 2.25rem; }
  h2 {
    font-size: 0.9rem; font-family: var(--font-body); font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted);
    padding-bottom: 0.5rem; border-bottom: 1px solid var(--line-strong); margin-bottom: 0.3rem;
  }
  ul { display: flex; flex-direction: column; }
  li {
    display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
    padding: 0.6rem 0; border-bottom: 1px solid var(--line);
  }
  li a { font-weight: 500; }
  .slug { font-family: var(--font-mono); font-size: 0.74rem; color: var(--faint); white-space: nowrap; }
</style>
