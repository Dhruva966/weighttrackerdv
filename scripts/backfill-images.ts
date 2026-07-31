/**
 * DISABLED — Free Exercise DB / stock photographic backfill.
 *
 * Aloo exercise images must come only from verified IMG_3417.pdf silhouette crops:
 *   pnpm apply:pdf-icons
 *   pnpm purge:stock-reseed-pdf
 *
 * Do not re-enable FEDB uploads without an explicit product decision; they replace
 * PDF crops with human/stock photos in `exercise-images`.
 */
console.error(
  "backfill:images is disabled — Free Exercise DB stock photos are not allowed.\n" +
    "Use: pnpm apply:pdf-icons   or   pnpm purge:stock-reseed-pdf",
);
process.exit(1);
