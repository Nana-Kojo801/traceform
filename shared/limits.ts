// Credit-protection caps (spec section 8). Enforced on the server; mirrored in the UI.
export const MAX_DOCUMENTS_PER_PROJECT = 5
export const MAX_FILE_BYTES = 200 * 1024
export const MAX_TOTAL_CHARS = 60_000
export const RUN_COOLDOWN_MS = 30_000
export const DEFAULT_DAILY_RUN_CAP = 60
export const MAX_FIELDS_PER_SCHEMA = 40
/** Fields per model call; larger schemas are split by section. */
export const FIELDS_PER_CALL = 20
export const MAX_PARSE_RETRIES = 2
/** Images are downscaled in the browser before upload; this caps the original file. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
/** Scanned PDFs: at most this many pages are rendered and transcribed. */
export const MAX_TRANSCRIBE_PAGES = 3
