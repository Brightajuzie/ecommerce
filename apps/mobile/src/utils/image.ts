/**
 * Requests a smaller, delivery-optimized version of a Cloudinary-hosted
 * image via Cloudinary's on-the-fly URL transformations, instead of always
 * shipping the full up-to-2000px master stored at upload time (see
 * apps/api/src/uploads/uploads.service.ts). A product card showing an image
 * at ~150px display width has no business downloading a 2000px original —
 * this is the single biggest lever on perceived "products load faster"
 * speed, since image bytes dwarf the JSON payload for any product list.
 *
 * Non-Cloudinary URLs (Unsplash seed images, which already carry their own
 * `?w=` sizing, and the local-disk upload fallback used when Cloudinary
 * isn't configured) are returned unchanged — this only rewrites URLs that
 * actually match Cloudinary's `/image/upload/` delivery path.
 *
 * `width` should be the image's real on-screen display width in *logical*
 * pixels; pass roughly 2x that for a reasonable retina-sharp result without
 * fetching a needlessly huge source.
 */
export function optimizedImageUrl(
  url: string | undefined | null,
  width: number,
): string | undefined {
  if (!url) return url ?? undefined;

  const marker = "/image/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return url;

  const insertAt = markerIndex + marker.length;
  // c_limit: never upscales past the original, just caps the max dimension.
  // q_auto,f_auto: Cloudinary picks the best quality/format (e.g. WebP/AVIF)
  // for the requesting browser — same defaults already used at upload time.
  const transform = `w_${Math.round(width)},q_auto,f_auto,c_limit/`;
  return `${url.slice(0, insertAt)}${transform}${url.slice(insertAt)}`;
}
