<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.doc.title} · NavCom docs</title>
  <meta name="description" content="{data.doc.title} — NavCom design documentation." />
</svelte:head>

<div class="wrap">
  <p class="back"><a href="/docs/">&larr; All documents</a></p>
  <!-- Rendered from repo markdown at build time. -->
  <article class="prose">{@html data.doc.html}</article>
  <p class="source"><span class="mono">docs/{data.doc.slug}.md</span></p>
</div>

<style>
  .back { font-size: 0.9rem; margin-bottom: 1.25rem; }
  .back a { color: var(--muted); }

  .prose { max-width: var(--measure); }

  .prose :global(h1) {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    line-height: 1.12;
    letter-spacing: -0.02em;
    margin-bottom: 1rem;
  }
  .prose :global(h2) {
    font-size: 1.4rem;
    margin: 2.25rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--line-strong);
  }
  .prose :global(h3) { font-size: 1.12rem; margin: 1.75rem 0 0.5rem; }
  .prose :global(p) { margin: 0.9rem 0; }
  .prose :global(ul), .prose :global(ol) {
    margin: 0.9rem 0; padding-left: 1.3rem; list-style: revert;
    display: flex; flex-direction: column; gap: 0.35rem;
  }
  .prose :global(li)::marker { color: var(--faint); }
  .prose :global(blockquote) {
    margin: 1.1rem 0; padding: 0.1rem 0 0.1rem 1rem;
    border-left: 3px solid var(--line-strong); color: var(--muted);
  }
  .prose :global(code) {
    font-family: var(--font-mono); font-size: 0.86em;
    background: var(--sunk); border: 1px solid var(--line); padding: 0.05em 0.3em;
  }
  .prose :global(pre) {
    background: var(--sunk); border: 1px solid var(--line);
    padding: 1rem; overflow-x: auto; margin: 1.1rem 0;
  }
  .prose :global(pre code) { background: none; border: none; padding: 0; font-size: 0.82rem; }
  .prose :global(hr) { border: none; border-top: 1px solid var(--line-strong); margin: 2.25rem 0; }
  .prose :global(strong) { font-weight: 650; }

  /* Tables carry most of the normative detail — they must stay readable and scroll
     inside themselves rather than pushing the page sideways. */
  .prose :global(table) {
    border-collapse: collapse; width: 100%; font-size: 0.9rem;
    margin: 1.1rem 0; display: block; overflow-x: auto;
  }
  .prose :global(th) {
    text-align: left; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--line-strong);
    white-space: nowrap;
  }
  .prose :global(td) {
    padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--line); vertical-align: top;
  }

  .source {
    margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--line);
    font-size: 0.78rem; color: var(--faint);
  }
</style>
