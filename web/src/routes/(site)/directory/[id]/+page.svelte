<script lang="ts">
  import FieldRow from '$lib/components/FieldRow.svelte';
  import { displayField, displayRecord } from '$lib/directory';
  import { AVAILABILITY_FIELDS, FIELD_LABELS, INTAKE_FIELDS, labelValue } from '$lib/directory/load';
  import { localTimeNote } from '@navcom/core';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const now = $derived(new Date(data.builtAt));
  const record = $derived(data.record);
  const meta = $derived(displayRecord(record, now));
</script>

<svelte:head>
  <title>{record.name} · NavCom</title>
  <meta
    name="description"
    content="{record.name} — hours, intake rules, and how recently anyone checked."
  />
</svelte:head>

<div class="wrap">
  <p class="back"><a href="/directory/">&larr; All resources</a></p>

  {#if meta.flagFirst}
    <!-- Rule 3. Above all other content, including the name. -->
    <div class="notice notice--stop" data-flag>
      <p class="notice__label">Flagged</p>
      <p>{meta.flagFirst.label}</p>
    </div>
  {/if}

  {#if meta.seeded}
    <div class="notice notice--warn">
      <p class="notice__label">Unverified public listing</p>
      <p>
        This entry came from a public source. Nobody has been there or called. The intake
        rules below are almost certainly incomplete — that is what is missing from official
        listings, and it is the part that decides whether someone gets in.
      </p>
    </div>
  {/if}

  <header class:seeded={meta.seeded} data-record={record.id} data-seeded={meta.seeded} data-flagged={meta.flagFirst !== null}>
    <h1>{record.name}</h1>
    <p class="type">{labelValue(record.type)}</p>
  </header>

  <section>
    <h2>Contact</h2>
    <dl>
      <FieldRow field="address" label={FIELD_LABELS.address ?? 'Address'} display={displayField(record, 'address', now)} />
      <FieldRow field="phone" label={FIELD_LABELS.phone ?? 'Phone'} display={displayField(record, 'phone', now)} />
    </dl>
    {#if record.lat !== undefined && record.lon !== undefined}
      <p class="map">
        <!-- geo: hands off to the native app on Android and does nothing elsewhere, so the
             universal link is primary and the coordinates stay visible to copy. -->
        <a
          href="https://www.openstreetmap.org/?mlat={record.lat}&mlon={record.lon}#map=17/{record.lat}/{record.lon}"
          rel="noreferrer"
        >Open in maps</a>
        <span class="coords mono">{record.lat}, {record.lon}</span>
      </p>
    {/if}
  </section>

  <section>
    <h2>Availability</h2>
    {#if data.region}
      <p class="hint">{localTimeNote(data.region)}</p>
    {/if}
    <dl>
      {#each AVAILABILITY_FIELDS as field (field)}
        <FieldRow {field} label={FIELD_LABELS[field] ?? field} display={displayField(record, field, now)} />
      {/each}
    </dl>
  </section>

  <section>
    <h2>Will they take this person</h2>
    <p class="hint">
      This is the part official listings leave out. Anything marked unknown means nobody has
      confirmed it — not that there is no restriction.
    </p>
    <dl>
      {#each INTAKE_FIELDS as field (field)}
        <FieldRow {field} label={FIELD_LABELS[field] ?? field} display={displayField(record, field, now)} />
      {/each}
    </dl>
  </section>

  {#if record.notes}
    <section>
      <h2>Notes</h2>
      <p class="notes">{record.notes}</p>
    </section>
  {/if}

  <section>
    <h2>Verification</h2>
    <dl class="verify">
      <div><dt>Last checked</dt><dd>{meta.age ? `${meta.age.absolute} (${meta.age.relative})` : 'never'}</dd></div>
      <div><dt>By</dt><dd>{record.verified_by ?? 'unknown'}</dd></div>
      <div><dt>How</dt><dd>{record.method ? labelValue(record.method) : 'unknown'}</dd></div>
    </dl>
    <p class="hint">
      Confidence is worked out from how it was checked and how long ago — it is never typed
      in by hand. Different facts go stale at different speeds: hours in two weeks, intake
      rules in three months, an address in a year.
    </p>
  </section>
</div>

<style>
  .back { font-size: 0.9rem; margin-bottom: 1rem; }
  .back a { color: var(--muted); }

  .notice { margin-bottom: 1rem; }

  header { margin: 0.5rem 0 2rem; }
  header.seeded h1 { font-weight: 400; }

  h1 { font-size: clamp(1.8rem, 5.5vw, 2.5rem); line-height: 1.12; letter-spacing: -0.02em; }
  .type { color: var(--muted); margin-top: 0.3rem; }

  section { margin-top: 2.25rem; }

  h2 {
    font-size: 0.95rem;
    font-family: var(--font-body);
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--line-strong);
    margin-bottom: 0.5rem;
  }

  dl { margin: 0; }

  .hint { font-size: 0.9rem; color: var(--muted); margin: 0.6rem 0; max-width: var(--measure); }
  .notes { max-width: var(--measure); }
  .map { margin-top: 0.6rem; font-size: 0.95rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: baseline; }
  .coords { font-size: 0.78rem; color: var(--muted); }

  .verify { display: flex; flex-direction: column; gap: 0.4rem; }
  .verify div { display: grid; grid-template-columns: 10.5rem 1fr; gap: 1rem; }
  .verify dt {
    font-size: 0.78rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--muted);
  }
  .verify dd { margin: 0; }

  @media (max-width: 32rem) {
    .verify div { grid-template-columns: 1fr; gap: 0; }
  }
</style>
