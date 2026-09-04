import rehypeKatex from 'rehype-katex';
import { createNotationKatexOptions } from '../../reference/katex-options.mjs';

interface HastText {
  type: 'text';
  value: string;
}

interface HastElement {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: HastNode[];
}

type HastNode = HastText | HastElement;

interface HastRoot {
  type: 'root';
  children: HastNode[];
}

export type SafeMathNode =
  | { type: 'text'; value: string }
  | {
      type: 'element';
      tagName: string;
      properties: Readonly<Record<string, string>>;
      children: readonly SafeMathNode[];
    };

const allowedTags = new Set([
  'annotation',
  'math',
  'menclose',
  'mfrac',
  'mi',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mroot',
  'mrow',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'semantics',
  'span',
  'svg',
  'path',
  'line',
]);

const simpleAttributeNames = new Set([
  'accent',
  'accentunder',
  'columnalign',
  'columnspacing',
  'displaystyle',
  'fence',
  'height',
  'lspace',
  'mathvariant',
  'preserveaspectratio',
  'rowspacing',
  'rspace',
  'scriptlevel',
  'separator',
  'stretchy',
  'viewbox',
  'width',
]);

const safeAttributeValue = /^[ A-Za-z0-9+.,()\-/%]*$/;
const safeClassName = /^[A-Za-z0-9_-]+$/;
const safeStyle = /^(?:[a-z-]+:[ A-Za-z0-9+.,()\-/%]*;)*$/;
const safePathData = /^[\sA-Za-z0-9+.,\-]*$/;
const unsafeExtensionCommand =
  /\\(?:href|url|includegraphics|htmlClass|htmlData|htmlId|htmlStyle)\b/;

function attributeValue(value: unknown, propertyName: string): string {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string' || !safeAttributeValue.test(value)) {
    throw new Error(`Unsafe KaTeX ${propertyName} value.`);
  }
  return value;
}

function safeProperties(
  element: HastElement,
): Readonly<Record<string, string>> {
  const properties: Record<string, string> = {};

  for (const [name, value] of Object.entries(element.properties)) {
    if (name === 'className') {
      if (
        !Array.isArray(value) ||
        !value.every(
          (className) =>
            typeof className === 'string' && safeClassName.test(className),
        )
      ) {
        throw new Error('Unsafe KaTeX class list.');
      }
      properties.class = value.join(' ');
      continue;
    }

    if (name === 'ariaHidden' && value === 'true') {
      properties['aria-hidden'] = 'true';
      continue;
    }

    if (name === 'encoding' && value === 'application/x-tex') {
      properties.encoding = value;
      continue;
    }

    if (
      name === 'xmlns' &&
      (value === 'http://www.w3.org/1998/Math/MathML' ||
        value === 'http://www.w3.org/2000/svg')
    ) {
      properties.xmlns = value;
      continue;
    }

    if (
      name === 'style' &&
      typeof value === 'string' &&
      safeStyle.test(value) &&
      !/(?:expression|url)\s*\(/i.test(value)
    ) {
      properties.style = value;
      continue;
    }

    if (name === 'd' && typeof value === 'string' && safePathData.test(value)) {
      properties.d = value;
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (simpleAttributeNames.has(normalizedName)) {
      const outputName =
        normalizedName === 'viewbox'
          ? 'viewBox'
          : normalizedName === 'preserveaspectratio'
            ? 'preserveAspectRatio'
            : normalizedName;
      properties[outputName] = attributeValue(value, name);
      continue;
    }

    throw new Error(`Unexpected KaTeX property: ${name}.`);
  }

  return Object.freeze(properties);
}

function sanitizeNode(node: HastNode): SafeMathNode {
  if (node.type === 'text') {
    return Object.freeze({ type: 'text', value: node.value });
  }

  if (node.type !== 'element' || !allowedTags.has(node.tagName)) {
    throw new Error(`Unexpected KaTeX node: ${node.type}.`);
  }

  return Object.freeze({
    type: 'element',
    tagName: node.tagName,
    properties: safeProperties(node),
    children: Object.freeze(node.children.map(sanitizeNode)),
  });
}

/**
 * Render repository-authored LaTeX through the same build-time KaTeX adapter
 * as lesson math, then expose a constrained structured tree to Astro. No HTML
 * string crosses the component boundary.
 */
export function renderNotationMath(latex: string): readonly SafeMathNode[] {
  if (latex.trim().length === 0) {
    throw new Error('Notation LaTeX must not be empty.');
  }
  if (unsafeExtensionCommand.test(latex)) {
    throw new Error('Notation LaTeX cannot use a trust-requiring extension.');
  }

  const root: HastRoot = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: ['math-inline'] },
        children: [{ type: 'text', value: latex }],
      },
    ],
  };

  const transform = rehypeKatex(createNotationKatexOptions());
  const file = {
    message(message: unknown): never {
      throw new Error(String(message));
    },
  } as unknown as Parameters<typeof transform>[1];

  transform(root as unknown as Parameters<typeof transform>[0], file);
  return Object.freeze(root.children.map(sanitizeNode));
}
