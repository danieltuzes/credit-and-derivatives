function textContent(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text' && typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textContent).join('');
}

function katexErrors(node, output = []) {
  if (!node || typeof node !== 'object') return output;

  const classes = node.properties?.className;
  if (
    node.type === 'element' &&
    Array.isArray(classes) &&
    classes.includes('katex-error')
  ) {
    output.push({
      source: textContent(node).trim(),
      detail:
        typeof node.properties?.title === 'string'
          ? node.properties.title
          : 'Unknown KaTeX parse error',
      position: node.position,
    });
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) katexErrors(child, output);
  }

  return output;
}

/**
 * rehype-katex reports parse failures as non-fatal VFile messages and renders
 * a `.katex-error` fallback. Turn those recovered failures into compiler
 * errors so Astro cannot successfully build a lesson containing broken math.
 */
export default function rehypeFailKatexErrors() {
  return function failOnKatexErrors(tree, file) {
    const errors = katexErrors(tree);
    if (errors.length === 0) return;

    const first = errors[0];
    const source = first.source ? ` for "${first.source}"` : '';
    const additional =
      errors.length > 1 ? ` (${errors.length - 1} additional error(s))` : '';
    const message = `KaTeX rendering failed${source}: ${first.detail}${additional}`;

    if (typeof file?.fail === 'function') {
      file.fail(message, first.position, 'rehype-katex:parse-error');
    }
    throw new Error(message);
  };
}
