/**
 * The box a lab draws its plot into, as an inline style. The plot scales down
 * with the column (`.lab-chart svg` in explico's stylesheet), and the box
 * keeps the plot's own shape, so the figure's caption sits right under the
 * plot at any width, before and after the island draws it. Without it, the
 * box's `min-height: 18rem` leaves an empty band under a scaled-down plot, on
 * the page and in the picture the PDF and Markdown downloads capture.
 *
 * The box holds nothing but the plot, so its `.lab-shell` is `not-content`,
 * as explico's playground labs are. Until the island has drawn, the build's
 * copy of the plot comes before `.lab-chart-live`, and Starlight's spacing
 * between blocks would put a 1rem margin above that: the box would scroll by
 * as much, a scrollable region with no keyboard access (axe).
 */
export function chartBox(width: number, height: number) {
  return {
    minHeight: 0,
    maxWidth: width,
    aspectRatio: `${width} / ${height}`,
  } as const;
}
