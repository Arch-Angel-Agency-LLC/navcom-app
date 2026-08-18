<script lang="ts">
  /**
   * `@` resets the layout chain to the root, so the terminal does not inherit the site's
   * header, navigation or stylesheet.
   *
   * Not cosmetic. The Field Terminal is a different instrument for the opposite situation —
   * one hand, cold, dark — and a nav bar offering "Docs" is both wrong for that moment and
   * dead weight in a bundle sized for a prepaid Android 8.
   */
  import '$lib/terminal/tokens.css';
  import '$lib/terminal/screen.css';
  let { children } = $props();
</script>

<svelte:head>
  <meta name="theme-color" content="#0B0E12" />
  <link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="terminal">
  {@render children()}
</div>

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    padding: 1.1rem 1.1rem 2rem;
    max-width: 30rem;
    margin: 0 auto;
    gap: 1.4rem;
  }
</style>
