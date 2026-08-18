/**
 * The directory library now lives in @navcom/core, so the node and every client share one
 * implementation of the staleness and display rules. A second implementation would be a
 * second place for them to drift, and the drift produces a confident wrong answer.
 *
 * Only `load.ts` stays here: it uses Vite's import.meta.glob, which is not framework-neutral.
 */
export * from '@navcom/core';
export { loadAll, loadDirectory, loadRegions, regionOf } from './load';
