"use server";

import { put } from "@vercel/blob";
import { requireRole } from "@/lib/guard";
import { db, auditLogs } from "@/db";

/* Image uploads to Vercel Blob.
   Validated server-side by magic bytes rather than the filename or the
   browser-supplied MIME type — both are trivially forged, and a file
   called photo.png can contain anything. */

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/* Leading bytes that actually identify each format. */
const SIGNATURES: { ext: string; mime: string; bytes: number[] }[] = [
  { ext: "png",  mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg",  mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "gif",  mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: "webp", mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detect(buffer: Uint8Array) {
  return SIGNATURES.find((s) => s.bytes.every((b, i) => buffer[i] === b)) ?? null;
}

export type UploadResult = { url?: string; error?: string };

export async function uploadImage(formData: FormData): Promise<UploadResult> {
  /* Only staff upload files — students never do. */
  const me = await requireRole("instructor", "admin", "superadmin");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That image is over 4 MB. Compress it and try again." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detect(bytes);
  if (!kind) {
    return { error: "That doesn't look like a PNG, JPEG, GIF, or WebP." };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      error:
        "Image storage isn't configured. Create a Blob store in Vercel, or paste an image URL instead.",
    };
  }

  try {
    /* Random suffix stops one upload overwriting another and stops
       anyone guessing a URL from a filename. */
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60);
    const blob = await put(`lessons/${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: kind.mime,
    });

    await db.insert(auditLogs).values({
      event: "upload.image",
      userId: me.userId,
      userRole: me.role,
      details: blob.pathname,
    });

    return { url: blob.url };
  } catch (e) {
    console.error("Blob upload failed:", e);
    return { error: "Upload failed. Try again, or paste an image URL." };
  }
}
