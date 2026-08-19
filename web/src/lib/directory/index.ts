/**
 * The directory library now lives in @navcom/core, so the node and every client share one
 * implementation of the staleness and display rules. A second implementation would be a
 * second place for them to drift, and the drift produces a confident wrong answer.
 *
 * Only `load.ts` stays here: it uses Vite's import.meta.glob, which is not framework-neutral.
 */
// The directory subpath, NOT the barrel. The barrel re-exports the event layer, the
// transport and NIP-44, and a page that formats dates was shipping all of it -- 17 kB of
// crypto on a device floor of a prepaid Android 8.
export * from '@navcom/core/directory';
export { loadAll, loadDirectory, loadRegions, regionOf } from './load';
