/**
 * The server half of the platform uploader: one resource route receives a file in parts,
 * reads its real type from the first bytes, refuses in a sentence the app can show, and
 * seals the stored object at its measured size. The browser half is `./client`.
 */

import { completeUpload, sniffImageType, UploadTooLargeError } from "../storage";

/** The part size the client sends; a bigger part is refused before it is stored. */
export const UPLOAD_PART_BYTES = 10 * 1024 * 1024;

export interface UploadIntent {
  /** The file name as the browser gave it, reduced to letters, digits, `.`, `_` and `-`. */
  name: string;
  /** The type read from the file's first bytes, or the browser's claim when the bytes say nothing. */
  type: string;
  /** The size the browser declared. Shown and used for the early refusal; never a limit. */
  size: number;
}

export interface UploadedFile {
  key: string;
  /** Bytes actually stored, read from the object itself. */
  size: number;
  contentType: string;
  name: string;
}

export interface UploadRouteOptions {
  /** The app-scoped key the file lands under. Keep it unguessable: `crypto.randomUUID()` in it. */
  key: (file: UploadIntent) => string | Promise<string>;
  /** The biggest file this route stores, in bytes. Enforced on the stored bytes at the finish. */
  maxBytes?: number;
  /** Types this route stores, exact (`application/pdf`) or by family (`image/*`). Omit to store any. */
  accept?: readonly string[];
  /** Runs once per finished file, after the size is measured and under the limit. */
  onComplete?: (file: UploadedFile) => void | Promise<void>;
}

type CreateBody = { action: "create"; name?: string; type?: string; size?: number; head?: string };
type CompleteBody = {
  action: "complete";
  uploadId?: string;
  key?: string;
  name?: string;
  contentType?: string;
  parts?: R2UploadedPart[];
};
type AbortBody = { action: "abort"; uploadId?: string; key?: string };
type StatusBody = { action: "status"; key?: string };
type RulesBody = { action: "rules" };

const reply = (body: unknown, status = 200) => Response.json(body, { status });
const refuse = (error: string, status: number) => reply({ error }, status);

function bytesAt(bytes: Uint8Array, offset: number, text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

// Beyond the image formats: PDF, and the ISO container that MP4, QuickTime and
// iPhone HEIC photos share, told apart by the brand written after `ftyp`.
function sniffContentType(bytes: Uint8Array): string | null {
  const image = sniffImageType(bytes);
  if (image) return image;
  if (bytesAt(bytes, 0, "%PDF")) return "application/pdf";
  if (bytesAt(bytes, 4, "ftyp")) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (brand === "qt  ") return "video/quicktime";
    if (/^(heic|heix|hevc|mif1|msf1)$/.test(brand)) return "image/heic";
    return "video/mp4";
  }
  return null;
}

// The claim is only a fallback for a format the sniffer cannot read: a file that
// claims one it can read must prove it in its bytes, or `accept: ["image/*"]`
// stores anything that calls itself an image.
const SNIFFED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

function accepts(accept: readonly string[], type: string): boolean {
  return accept.some((rule) =>
    rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : rule === type,
  );
}

function describeAccepted(accept: readonly string[]): string {
  const names = accept.map((rule) => {
    if (rule === "image/*") return "images";
    if (rule === "video/*") return "videos";
    if (rule === "audio/*") return "audio";
    const sub = rule.split("/")[1] ?? rule;
    return sub.toUpperCase().replace(/^X-/, "");
  });
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// What the field takes, in the words shown before picking: "Images or PDF, up to 20 MB per file."
function describeRules({ accept, maxBytes }: UploadRouteOptions): string | null {
  // A cap of 0 is an allowance already spent, not a route with no cap.
  if (maxBytes === 0) return "Nothing more can be uploaded here right now.";
  const formats = accept?.length ? describeAccepted(accept) : "";
  const cap = maxBytes ? `up to ${formatBytes(maxBytes)} per file` : "";
  const text = [formats, cap].filter(Boolean).join(", ");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : null;
}

/**
 * Answer one request of the upload protocol. Call it from the action of the
 * app's upload route after the same gate as the screen that uploads
 * (`requireAuth`, `requireRole`); `storage` is `createStorage(env)`.
 *
 * `create` (JSON: name, type, size, the first bytes) picks the type from the
 * bytes, checks `accept` and the declared size, and opens the multipart upload
 * under `options.key`. `part` (multipart form: uploadId, key, partNumber, chunk)
 * stores one part of at most `UPLOAD_PART_BYTES`. `complete` (JSON) joins the
 * parts, measures the object, deletes it over `maxBytes`, then runs
 * `onComplete`. `abort` drops a failed upload so no half file stays in storage.
 * `status` (JSON: key) answers the stored size of a finished file, or null, so
 * a browser continuing a batch after a reload asks instead of remembering.
 * `rules` answers this request's `accept` and `maxBytes` with a sentence for them,
 * so a screen says what the field takes before a file is picked.
 * Every refusal is `{ error }` in words an app user can read, with a 4xx status.
 */
export async function handleUpload(
  request: Request,
  storage: R2Bucket,
  options: UploadRouteOptions,
): Promise<Response> {
  if (request.method !== "POST") return refuse("Upload requests must be POST.", 405);
  const maxParts = options.maxBytes ? Math.ceil(options.maxBytes / UPLOAD_PART_BYTES) : Infinity;

  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await request.formData();
    const uploadId = String(form.get("uploadId") ?? "");
    const key = String(form.get("key") ?? "");
    const partNumber = Number(form.get("partNumber"));
    const chunk = form.get("chunk");
    if (form.get("action") !== "part" || !uploadId || !key || !(chunk instanceof Blob)) {
      return refuse("This upload request is incomplete.", 400);
    }
    if (!Number.isInteger(partNumber) || partNumber < 1) {
      return refuse("This upload request is incomplete.", 400);
    }
    if (chunk.size > UPLOAD_PART_BYTES || partNumber > maxParts) {
      return refuse(`That file is over ${formatBytes(options.maxBytes ?? UPLOAD_PART_BYTES)}.`, 413);
    }
    const part = await storage
      .resumeMultipartUpload(key, uploadId)
      .uploadPart(partNumber, await chunk.arrayBuffer());
    return reply({ etag: part.etag, partNumber });
  }

  let body: CreateBody | CompleteBody | AbortBody | StatusBody | RulesBody;
  try {
    body = await request.json();
  } catch {
    return refuse("This upload request is incomplete.", 400);
  }

  switch (body.action) {
    case "create": {
      const name = (body.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const head = body.head ? Uint8Array.from(atob(body.head), (c) => c.charCodeAt(0)) : null;
      const sniffed = head && sniffContentType(head);
      const claimed = (body.type || "").split(";")[0].trim().toLowerCase();
      if (!sniffed && SNIFFED_TYPES.has(claimed)) {
        return refuse("That file isn't the type its name says it is.", 415);
      }
      const type = sniffed || claimed || "application/octet-stream";
      const size = Number(body.size) || 0;
      if (options.accept && !accepts(options.accept, type)) {
        return refuse(`That file type isn't accepted here (${describeAccepted(options.accept)}).`, 415);
      }
      if (options.maxBytes && size > options.maxBytes) {
        return refuse(`That file is over ${formatBytes(options.maxBytes)}.`, 413);
      }
      const key = await options.key({ name, type, size });
      const upload = await storage.createMultipartUpload(key, {
        httpMetadata: { contentType: type },
      });
      return reply({ uploadId: upload.uploadId, key, contentType: type });
    }
    case "complete": {
      if (!body.uploadId || !body.key || !Array.isArray(body.parts)) {
        return refuse("This upload request is incomplete.", 400);
      }
      let size: number;
      try {
        ({ size } = await completeUpload(storage, body.key, body.uploadId, body.parts, options.maxBytes));
      } catch (err) {
        if (err instanceof UploadTooLargeError) {
          return refuse(`That file is over ${formatBytes(err.maxBytes)}.`, 413);
        }
        throw err;
      }
      const file: UploadedFile = {
        key: body.key,
        size,
        contentType: body.contentType || "application/octet-stream",
        name: body.name || "file",
      };
      await options.onComplete?.(file);
      return reply({ ...file, url: `/api/files/${file.key}` });
    }
    case "abort": {
      if (!body.uploadId || !body.key) return refuse("This upload request is incomplete.", 400);
      await storage.resumeMultipartUpload(body.key, body.uploadId).abort();
      return reply({ ok: true });
    }
    case "status": {
      if (!body.key) return refuse("This upload request is incomplete.", 400);
      const stored = await storage.head(body.key);
      return reply({ size: stored?.size ?? null, url: `/api/files/${body.key}` });
    }
    case "rules":
      return reply({
        accept: options.accept ?? null,
        maxBytes: options.maxBytes ?? null,
        hint: describeRules(options),
      });
    default:
      return refuse("This upload request is incomplete.", 400);
  }
}
