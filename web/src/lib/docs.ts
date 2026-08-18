/**
 * The documentation surface.
 *
 * The Journalist asks to see that the system works without seeing who is in it, and the
 * Skeptic will not install anything before reading what leaves his phone. For both, the
 * documentation *is* the auditable surface — so it is published rather than left in a
 * repository.
 *
 * Rendered at build time, so it costs the reader zero JavaScript.
 */

import { marked } from 'marked';

const REPO = 'https://github.com/Arch-Angel-Agency-LLC/navcom-app/blob/main';

const files = import.meta.glob('../../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

export interface DocPage {
  /** URL slug, e.g. "product/identity". */
  slug: string;
  title: string;
  html: string;
}

function slugOf(path: string): string {
  return path.replace(/^.*\/docs\//, '').replace(/\.md$/, '');
}

function titleOf(markdown: string, slug: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : slug;
}

/**
 * Rewrites in-repo relative links.
 *
 * A link to another published document becomes a site route. Anything else — CLAUDE.md,
 * the seed CSV, anything above docs/ — points at the source on the repository host, so a
 * reader following a reference lands on the real file rather than a 404.
 */
function rewriteLinks(html: string, slug: string, known: Set<string>): string {
  const dir = slug.includes('/') ? slug.slice(0, slug.lastIndexOf('/')) : '';

  return html.replace(/href="([^"]*)"/g, (whole, href: string) => {
    if (/^(https?:|mailto:|#|\/)/.test(href)) return whole;

    const [file, hash] = href.split('#');
    if (!file) return whole;

    const parts = (dir ? `${dir}/${file}` : file).split('/');
    const out: string[] = [];
    let aboveDocs = 0;
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') {
        if (out.length) out.pop();
        else aboveDocs++;
      } else out.push(p);
    }
    const resolved = out.join('/');

    if (aboveDocs === 0 && resolved.endsWith('.md')) {
      const target = resolved.replace(/\.md$/, '');
      if (known.has(target)) return `href="/docs/${target}/${hash ? `#${hash}` : ''}"`;
    }

    const repoPath = aboveDocs > 0 ? resolved : `docs/${resolved}`;
    return `href="${REPO}/${repoPath}"`;
  });
}

let cache: DocPage[] | null = null;

export function allDocs(): DocPage[] {
  if (cache) return cache;

  const entries = Object.entries(files).map(([path, raw]) => ({ slug: slugOf(path), raw }));
  const known = new Set(entries.map((e) => e.slug));

  cache = entries
    .map(({ slug, raw }) => ({
      slug,
      title: titleOf(raw, slug),
      html: rewriteLinks(marked.parse(raw, { async: false }) as string, slug, known)
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return cache;
}

export function docBySlug(slug: string): DocPage | undefined {
  return allDocs().find((d) => d.slug === slug);
}

/** Grouped for the index: top-level pages first, then each subdirectory. */
export function docGroups(): { group: string; pages: DocPage[] }[] {
  const groups = new Map<string, DocPage[]>();
  for (const doc of allDocs()) {
    const g = doc.slug.includes('/') ? doc.slug.split('/')[0] : '';
    groups.set(g, [...(groups.get(g) ?? []), doc]);
  }
  const order = ['', 'spec', 'watch', 'product', 'research'];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([group, pages]) => ({ group, pages }));
}
