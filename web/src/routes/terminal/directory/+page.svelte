<script lang="ts">
  /**
   * Pick an area to carry offline.
   *
   * Opening one caches it, which is the whole mechanism -- there is no "download" button
   * and no progress bar, because visiting the page IS the download.
   */
  let { data } = $props();

  const byCountry = $derived(
    Object.entries(
      data.areas.reduce<Record<string, typeof data.areas>>((acc, a) => {
        (acc[a.region.country] ??= []).push(a);
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b))
  );
</script>

<svelte:head>
  <title>Areas · Field Terminal</title>
  <meta name="description" content="Which area to carry offline." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/">← Status</a></p>
  <h1>Areas</h1>
</header>

<section>
  <p>
    Open the one you work in. <strong>Opening it is what saves it</strong> — after that it
    is on this phone and works with no signal at all.
  </p>
  <p class="cost">
    Only what you open is kept. Carrying every area would fill a cheap phone with places you
    will never go.
  </p>
</section>

{#each byCountry as [country, areas] (country)}
  <section class="country">
    <h2>{country}</h2>
    <ul>
      {#each areas as { region, records } (region.slug)}
        <li>
          <a class="area" href="/terminal/directory/{region.slug}/">
            <span class="name">{region.name}</span>
            <span class="n">{records}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<style>
  ul { list-style: none; margin: 0; padding: 0; }
  li { border-bottom: 1px solid var(--t-line); }
  .area {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    min-height: 3.4rem; text-decoration: none; color: var(--t-ink);
  }
  .name { font-size: 1.02rem; }
  .n {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .82rem; color: var(--t-faint);
  }
</style>
