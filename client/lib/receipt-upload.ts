// Keep multipart requests below Vercel's 4.5 MB limit, including form overhead.
export const MAX_RECEIPT_FILE_BYTES = 4 * 1024 * 1024
export const RECEIPT_SIZE_ERROR = "File is too large. Maximum size is 4 MiB. Please choose a smaller image."
export const RECEIPT_TYPE_ERROR = "Invalid file type. Please upload a JPG, PNG, HEIC, HEIF, or WebP image."
export const RECEIPT_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
])
