// Astro loads this file for its content collections. The schemas and loaders
// live in the engine; the course only re-exports them. Course-specific wiring
// (title, sidebar sections, domains, conventions) is in `content/course.config.ts`.
export { collections } from '@danieltuzes/legend/content-config';
