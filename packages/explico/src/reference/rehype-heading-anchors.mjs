/**
 * Deep-linkable content headings (Step F3).
 *
 * The lesson pipeline uses a custom Markdown `processor` (see `astro.config.mjs`),
 * which bypasses Starlight's own heading-link rehype pass. This plugin restores
 * it with the *same* markup Starlight emits, so its bundled `anchor-links.css`
 * (shipped globally because `markdown.headingLinks` defaults on) styles it for
 * free — including the hover/focus reveal of an otherwise invisible anchor:
 *
 *   <div class="sl-heading-wrapper level-h2">
 *     <h2 id="slug">Heading</h2>
 *     <a class="sl-anchor-link" href="#slug"> <icon> <sr-only label> </a>
 *   </div>
 *
 * The `:target` flash, sticky-header scroll offset, and the JS niceties
 * (re-trigger on repeat activation, smooth scroll, `history.pushState`, brief
 * section highlight) live in `global.css` + `HeadingAnchorEnhancer.astro`, the
 * same split the keyed-equation feature uses.
 *
 * `rehypeHeadingIds` from `@astrojs/markdown-remark` normally runs *after* the
 * user rehype plugins, so heading `id`s do not exist yet when this runs. It is
 * idempotent (only assigns a missing `id`, and rebuilds `file.data.astro.headings`
 * from an unchanged document order), so this plugin runs it first and Astro's
 * later pass becomes a no-op for these headings.
 */

import { rehypeHeadingIds } from '@astrojs/markdown-remark';

const HEADING_TAG = /^h([1-6])$/;

// Starlight's `link-alt` icon (`components-internals/Icons.ts`), the same glyph
// its own `rehypeAutolinkHeadings` uses.
const LINK_ICON_PATH =
  'm12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 1 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 0 0-1.42-1.42m8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 1 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l3.88-3.89a4.49 4.49 0 0 0 0-6.33M8.83 15.17a1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.92-4.92a1 1 0 1 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42';

function headingText(node) {
  let text = '';
  const walk = (current) => {
    if (!current || typeof current !== 'object') return;
    if (current.type === 'text' || current.type === 'raw') {
      text += String(current.value ?? '');
      return;
    }
    if (Array.isArray(current.children)) current.children.forEach(walk);
  };
  walk(node);
  return text.replace(/\s+/g, ' ').trim();
}

function isHeadingWrapper(node) {
  const className = node?.properties?.className;
  return (
    node?.type === 'element' &&
    Array.isArray(className) &&
    className.includes('sl-heading-wrapper')
  );
}

function anchorLink(id, label) {
  return {
    type: 'element',
    tagName: 'a',
    properties: { className: ['sl-anchor-link'], href: `#${id}` },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { ariaHidden: 'true', className: ['sl-anchor-icon'] },
        children: [
          {
            type: 'element',
            tagName: 'svg',
            properties: {
              width: 16,
              height: 16,
              viewBox: '0 0 24 24',
              fill: 'currentColor',
            },
            children: [
              {
                type: 'element',
                tagName: 'path',
                properties: { d: LINK_ICON_PATH },
                children: [],
              },
            ],
          },
        ],
      },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['sr-only'], 'data-pagefind-ignore': 'true' },
        children: [{ type: 'text', value: label }],
      },
    ],
  };
}

export default function rehypeHeadingAnchors() {
  const assignHeadingIds = rehypeHeadingIds();

  return function transform(tree, file) {
    assignHeadingIds(tree, file);

    const walk = (node) => {
      if (!node || typeof node !== 'object' || !Array.isArray(node.children)) {
        return;
      }
      if (isHeadingWrapper(node)) return; // already processed

      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        const tag =
          child?.type === 'element' && typeof child.tagName === 'string'
            ? HEADING_TAG.exec(child.tagName)
            : null;

        if (
          tag &&
          tag[1] !== '1' &&
          typeof child.properties?.id === 'string' &&
          child.properties.id.length > 0
        ) {
          const id = child.properties.id;
          const label = `Section titled “${headingText(child)}”`;
          node.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['sl-heading-wrapper', `level-${child.tagName}`],
            },
            children: [child, anchorLink(id, label)],
          };
          continue; // the heading is a leaf for our purposes
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
