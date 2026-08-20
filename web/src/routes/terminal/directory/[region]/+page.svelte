<script lang="ts">
  /**
   * The cached directory — the Dark fallback.
   *
   * **There is no search box, and that is deliberate.** `Query` goes to the watch: someone
   * with both hands free does the lookup, can ask a follow-up, and can be wrong out loud.
   * Searching a list one-handed in the cold is the problem the watch exists to solve, so
   * offering search here as a first-class action would quietly undo the design.
   *
   * The record rendering is the site's own components, unchanged. They are the only
   * implementation of the display rules that the built-artifact tests check, and the
   * directory is where a rule the output does not honour would do real harm.
   */
  import FieldRow from '$lib/components/FieldRow.svelte';
  import {
    displayField,
    displayRecord,
    RESOURCE_TYPES,
    type ResourceRecord,
    type ResourceType
  } from '$lib/directory';
  import { AVAILABILITY_FIELDS, FIELD_LABELS, INTAKE_FIELDS, labelValue } from '$lib/directory/load';
  import { onMount } from 'svelte';

  let { data } = $props();

  /**
   * Collapsed groups, not open ones — everything starts open.
   *
   * Two reasons, and they point the same way. In the field it is fewer taps for someone
   * working one-handed. In the build it means the records are actually IN the prerendered
   * HTML, where the display-rule regression tests can see them; a collapsed-by-default
   * accordion would have shipped this screen with the rules unchecked.
   */
  let collapsed = $state<Set<ResourceType>>(new Set());
  const isOpen = (t: ResourceType) => !collapsed.has(t);

  function toggle(t: ResourceType) {
    const next = new Set(collapsed);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    collapsed = next;
  }
  /**
   * Build time until the page hydrates, then the operator's real clock.
   *
   * A prerendered page necessarily freezes staleness into HTML — that is what the daily
   * rebuild and the staleness margin exist for. The terminal can do better the moment it is
   * actually running, and does: every verdict below recomputes against the real clock, so a
   * cached page opened three weeks later does not still claim three-week-old confidence.
   */
  let hydrated = $state(false);
  const now = $derived(hydrated ? new Date() : new Date(data.built));

  onMount(() => {
    hydrated = true;

    // Ask to be saved for offline.
    //
    // Opening an area is what saves it -- but arriving here by tapping a link is a
    // client-side navigation, which fetches this page's DATA and never its HTML. Without
    // this the document was never cached, and an operator who browsed to their area and
    // then lost signal found nothing. Reloading by hand cached it; nobody reloads by hand.
    navigator.serviceWorker?.controller?.postMessage({ cache: location.pathname });
  });

  const byType = $derived(
    RESOURCE_TYPES.map((type) => ({
      type,
      records: data.records.filter((r: ResourceRecord) => r.type === type)
    })).filter((g) => g.records.length > 0)
  );

  /** How old the whole copy is — the age nothing on a record would ever mention. */
  const snapshotDays = $derived(
    Math.floor((now.getTime() - Date.parse(data.built)) / 86_400_000)
  );
</script>

<svelte:head>
  <title>{data.region.name} · Field Terminal</title>
  <meta name="description" content="What this device holds when there is no watch." />
</svelte:head>

<header>
  <p class="eyebrow"><a href="/terminal/directory/">← All areas</a></p>
  <h1>{data.region.name}</h1>
</header>

<section>
  <p>
    This is what this phone is holding, and it works with no signal at all.
  </p>
  <p class="cost">
    If a watch is up, <strong><a href="/terminal/query/">ask it instead</a></strong> — somebody
    with both hands free and a real screen can answer things this list cannot. This is what
    you have when nobody is watching, and it is worse, on purpose.
  </p>
</section>

<!-- A cached copy has two ages, and only one of them is written on the records. -->
<section class="snapshot" class:old={snapshotDays > 7} data-snapshot-age={snapshotDays}>
  <h2>This copy</h2>
  <p>
    {#if snapshotDays <= 0}
      Refreshed today.
    {:else if snapshotDays === 1}
      Refreshed yesterday.
    {:else}
      Refreshed <strong>{snapshotDays} days ago</strong>.
    {/if}
    {#if snapshotDays > 7}
      Places close and hours change inside a week. <strong>Call first, on everything.</strong>
    {/if}
  </p>
</section>

{#if data.records.length === 0}
  <section><p>This device holds no directory for your area yet.</p></section>
{/if}

{#each byType as group (group.type)}
  <section class="group">
    <button
      class="head"
      aria-expanded={isOpen(group.type)}
      onclick={() => toggle(group.type)}
    >
      <span>{labelValue(group.type)}</span>
      <span class="chev" aria-hidden="true">{isOpen(group.type) ? '−' : '+'}</span>
    </button>

    {#if isOpen(group.type)}
      <div class="records">
        {#each group.records as record (record.id)}
          {@const meta = displayRecord(record, now)}
          <article
            class="rec"
            class:seeded={meta.seeded}
            data-record={record.id}
            data-seeded={meta.seeded}
            data-flagged={meta.flagFirst !== null}
          >
            <!-- Rule 3. The flag is read before the name, not beside it. -->
            {#if meta.flagFirst}
              <p class="flag" data-flag>{meta.flagFirst.label}</p>
            {/if}
            <!-- Rule 6. Seeded entries say so in words, not with a subtle border. -->
            {#if meta.seeded}
              <p class="seeded-note" data-seeded-note>
                Unverified public listing — nobody has checked this
              </p>
            {/if}

            <h3>{record.name}</h3>

            <dl>
              <FieldRow field="address" label={FIELD_LABELS.address ?? 'Address'}
                display={displayField(record, 'address', now)} />
              <FieldRow field="phone" label={FIELD_LABELS.phone ?? 'Phone'}
                display={displayField(record, 'phone', now)} />
              {#each AVAILABILITY_FIELDS as field (field)}
                <FieldRow {field} label={FIELD_LABELS[field] ?? field}
                  display={displayField(record, field, now)} />
              {/each}
              {#each INTAKE_FIELDS as field (field)}
                <FieldRow {field} label={FIELD_LABELS[field] ?? field}
                  display={displayField(record, field, now)} />
              {/each}
            </dl>
          </article>
        {/each}
      </div>
    {/if}
  </section>
{/each}

<section class="limit">
  <h2>Why there is no search here</h2>
  <p>
    <strong>Query goes to the watch.</strong> Someone with both hands free does the lookup,
    can ask a follow-up, and can be wrong out loud. Searching a list one-handed in the cold
    is the problem the watch exists to solve — so this stays something to browse when there
    is nobody to ask, and not a substitute for asking.
  </p>
</section>

<style>
  .snapshot { border-left: 3px solid var(--t-line-strong); padding-left: .9rem; }
  .snapshot.old { border-left-color: var(--t-oncall); }
  .snapshot.old strong { color: var(--t-oncall); }

  .group { border-top: 1px solid var(--t-line); }
  .head {
    width: 100%; justify-content: space-between; border: 0; background: transparent;
    padding: 0; min-height: 3.5rem; font-size: 1.05rem; color: var(--t-ink);
  }
  .chev { color: var(--t-faint); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

  .records { display: flex; flex-direction: column; gap: 1.1rem; padding-bottom: 1.1rem; }
  .rec { border: 1px solid var(--t-line-strong); padding: .9rem 1rem; }
  .rec.seeded { border-style: dashed; }
  .rec h3 { font-size: 1.15rem; margin: 0 0 .4rem; color: var(--t-ink); }
  dl { margin: 0; }

  .flag {
    color: var(--t-dark); border: 1px solid var(--t-dark);
    padding: .4rem .6rem; margin: 0 0 .5rem; font-weight: 700; font-size: .92rem;
  }
  .seeded-note {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .68rem; letter-spacing: .09em; text-transform: uppercase;
    color: var(--t-faint); margin: 0 0 .4rem;
  }

  .limit { border-left: 3px solid var(--t-line-strong); padding-left: .9rem; }
</style>
