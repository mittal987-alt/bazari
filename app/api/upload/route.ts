import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getUserFromToken } from "@/lib/auth";
import { uploadLimiter, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // prevents caching

/**
 * Allowed image MIME types — verified both by the Content-Type header
 * AND by inspecting the first 4 magic bytes of the file buffer.
 * This prevents bypasses where an attacker sets a fake Content-Type.
 */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Magic byte signatures for allowed image formats */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg",  bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",   bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif",   bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp",  bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },  // RIFF.... at 0
  { mime: "image/avif",  bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },  // ftyp at byte 4
];

/** Maximum upload size: 5 MB */
const MAX_BYTES = 5 * 1024 * 1024;

/** Maximum files per request */
const MAX_FILES = 5;

/**
 * Verify a buffer's magic bytes against known image signatures.
 * Returns true if the buffer matches at least one known image format.
 */
function hasValidMagicBytes(buffer: Buffer): boolean {
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const match = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (match) return true;
  }
  return false;
}

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = uploadLimiter.check(ip);
  if (rl.limited) {
    return NextResponse.json(
      { message: "Too many upload requests. Please wait a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetMs - Date.now()) / 1000)) },
      }
    );
  }

  // ── Authentication ───────────────────────────────────────────────────────
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { message: `Maximum ${MAX_FILES} files per request` },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // ── Size check ─────────────────────────────────────────────────────
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { message: `File ${file.name} too large (max 5 MB)` },
          { status: 400 }
        );
      }

      // ── Content-Type header check ──────────────────────────────────────
      if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { message: `File type ${file.type || "unknown"} is not permitted. Only JPEG, PNG, WebP, GIF, and AVIF are allowed.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // ── Magic-byte verification ────────────────────────────────────────
      // Validates the actual file content, not just the browser-supplied MIME type.
      if (!hasValidMagicBytes(buffer)) {
        logger.warn("Upload rejected: magic bytes mismatch", {
          userId: String(user.id),
          fileName: file.name,
          declaredMime: file.type,
        });
        return NextResponse.json(
          { message: `File ${file.name} does not appear to be a valid image.` },
          { status: 400 }
        );
      }

      // ── Upload to Cloudinary ───────────────────────────────────────────
      const result: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "olx_ads",
            resource_type: "image",
            // Cloudinary also validates the file server-side
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
          },
          (error, response) => {
            if (error) reject(error);
            else resolve(response);
          }
        );
        uploadStream.end(buffer);
      });

      uploadedUrls.push(result.secure_url);
    }

    return NextResponse.json({ urls: uploadedUrls });

  } catch (error: any) {
    logger.error("Upload route error", {
      error: error instanceof Error ? error.message : String(error),
      userId: String(user.id),
    });
    return NextResponse.json(
      { message: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}