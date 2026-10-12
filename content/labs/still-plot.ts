/**
 * A lab's default chart, drawn at build time (rule V3). The figure's picture
 * is an island that draws its chart in the browser, after the page loads;
 * until then, and wherever it never runs (print without JavaScript, a
 * figure's preview card on another page, a link preview), the built page
 * holds only this copy. It is the Observable Plot call the island makes, at
 * the lab's default inputs, on a server-side document.
 *
 * Import it only from an `.astro` file's frontmatter, which never reaches
 * the browser, so linkedom stays out of the islands' bundles. Each lab's
 * `*Picture.astro` hands the chart to its island as children, which the
 * island shows until it has drawn the live chart into `.lab-chart-live`.
 */
import * as Plot from '@observablehq/plot';
import { parseHTML } from 'linkedom';

export function stillPlot(options: Plot.PlotOptions): string {
  const { document } = parseHTML(
    '<!doctype html><html><head></head><body></body></html>',
  );
  const plot = Plot.plot({ ...options, document }) as unknown as Element;
  return plot.outerHTML;
}
