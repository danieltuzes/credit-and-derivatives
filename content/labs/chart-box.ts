/**
 * The box a lab draws its plot into, as an inline style. The plot scales down
 * with the column (`.lab-chart svg` in explico's stylesheet), and the box
 * keeps the plot's own shape, so the figure's caption sits right under the
 * plot at any width, before and after the island draws it. Without it, the
 * box's `min-height: 18rem` leaves an empty band under a scaled-down plot, on
 * the page and in the picture the PDF and Markdown downloads capture.
 */
export function chartBox(width: number, height: number) {
  return {
    minHeight: 0,
    maxWidth: width,
    aspectRatio: `${width} / ${height}`,
  } as const;
}
