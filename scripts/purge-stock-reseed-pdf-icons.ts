/**
 * Re-enable path: purge leftover Storage noise is optional; prefer `pnpm apply:pdf-icons`
 * to upload verified IMG_3417 PDF diagram crops only (skips letter tiles).
 *
 * This entrypoint now delegates to apply-pdf-icons so `pnpm purge:stock-reseed-pdf`
 * is no longer a hard fail.
 */
import './apply-pdf-icons.ts';
