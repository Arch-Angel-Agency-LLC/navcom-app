<script lang="ts">
  /**
   * The root holds nothing but the outlet.
   *
   * Two genuinely different surfaces live under it — a public document in `(site)`, and the
   * Field Terminal, which is an application for the opposite situation. Chrome belongs to
   * whichever one you are in, so neither inherits the other's header, stylesheet or
   * assumptions.
   */
  let { children } = $props();
</script>

{@render children()}
