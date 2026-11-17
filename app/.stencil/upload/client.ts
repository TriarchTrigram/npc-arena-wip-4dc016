/**
 * The browser half of the platform uploader: `uploadFile` sends one file to the app's upload
 * route (`handleUpload` in `./server`) in parts with progress, retries and a clean abort;
 * `uploadFiles` sends many, a few at a time. A refusal is an `UploadError` with a plain message.
 */

const PART_BYTES = 10 * 1024 * 1024;
const PART_ATTEMPTS = 4;
const RETRY_BASE_MS = 500;
const SNIFF_BYTES = 32;
const DEFAULT_ROUTE = "/api/upload";
const DEFAULT_CONCURRENCY = 3;
const GENERIC_FAILURE = "The upload didn't finish. Check your connection and try again.";

export class UploadError extends Error {
  constructor(
    message: string,
    readonly file: File,
    /** The HTTP status behind a refusal; undefined when the connection failed. */
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface UploadOptions {
  /** The app's upload route. Defaults to `/api/upload`. */
  route?: string;
  /** Bytes sent so far out of the file's size, as 0–100. */
  onProgress?: (percent: number) => void;
  /** Aborting stops the upload and drops the half-stored file. */
  signal?: AbortSignal;
}

export interface UploadedFile {
  key: string;
  /** `/api/files/<key>`, ready for `src` or `href`. */
  url: string;
  size: number;
  contentType: string;
  file: File;
}

export interface UploadFilesOptions extends Omit<UploadOptions, "onProgress"> {
  /** How many files travel at once. Defaults to 3. */
  concurrency?: number;
  /** Bytes sent across every file, as 0–100. */
  onProgress?: (percent: number) => void;
  /** Called as each file finishes or fails, in completion order. */
  onFile?: (result: { file: File; uploaded?: UploadedFile; error?: UploadError }) => void;
}

// A refusal carries `{ error }` in plain words; a reply that is not JSON came
// from the edge, not the route, so it is translated by status.
async function errorFrom(res: { status: number; text: () => Promise<string> }, file: File) {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { error?: string };
    if (body.error) return new UploadError(body.error, file, res.status);
  } catch {
    // not JSON: fall through to the status
  }
  const message = res.status === 413 ? "That file is too large." : GENERIC_FAILURE;
  return new UploadError(message, file, res.status);
}

async function postJson<T>(route: string, body: unknown, file: File, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new UploadError(GENERIC_FAILURE, file);
  }
  if (!res.ok) throw await errorFrom(res, file);
  return (await res.json()) as T;
}

// XMLHttpRequest, because fetch reports no upload progress.
function sendPart(
  route: string,
  form: FormData,
  file: File,
  onBytes: (sent: number) => void,
  signal?: AbortSignal,
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.upload.onprogress = (e) => onBytes(e.loaded);
    xhr.onerror = () => reject(new UploadError(GENERIC_FAILURE, file));
    xhr.onabort = () => reject(signal?.reason ?? new UploadError("The upload was cancelled.", file));
    xhr.onload = async () => {
      signal?.removeEventListener("abort", abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as { etag: string });
      } else {
        reject(await errorFrom({ status: xhr.status, text: async () => xhr.responseText }, file));
      }
    };
    xhr.open("POST", route);
    xhr.send(form);
  });
}

// A connection failure or a server fault is retried with a growing pause; a
// refusal (4xx) is final, and so is an abort.
function retryable(err: unknown): boolean {
  return err instanceof UploadError && (err.status === undefined || err.status >= 500);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Upload one file. Resolves with the stored key and URL, or rejects with an `UploadError`. */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadedFile> {
  const route = options.route ?? DEFAULT_ROUTE;
  const { signal } = options;
  const head = toBase64(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  const created = await postJson<{ uploadId: string; key: string; contentType: string }>(
    route,
    { action: "create", name: file.name, type: file.type, size: file.size, head },
    file,
    signal,
  );
  const { uploadId, key, contentType } = created;
  const total = Math.max(1, Math.ceil(file.size / PART_BYTES));
  const parts: { partNumber: number; etag: string }[] = [];
  const report = (sent: number) =>
    options.onProgress?.(Math.min(100, Math.round((sent / Math.max(1, file.size)) * 100)));

  try {
    for (let i = 0; i < total; i++) {
      const partNumber = i + 1;
      const offset = i * PART_BYTES;
      const form = new FormData();
      form.append("action", "part");
      form.append("uploadId", uploadId);
      form.append("key", key);
      form.append("partNumber", String(partNumber));
      form.append("chunk", file.slice(offset, offset + PART_BYTES));
      for (let attempt = 1; ; attempt++) {
        try {
          const { etag } = await sendPart(route, form, file, (sent) => report(offset + sent), signal);
          parts.push({ partNumber, etag });
          break;
        } catch (err) {
          if (attempt >= PART_ATTEMPTS || !retryable(err) || signal?.aborted) throw err;
          await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
        }
      }
    }
    const done = await postJson<{ key: string; url: string; size: number }>(
      route,
      { action: "complete", uploadId, key, parts, name: file.name, contentType },
      file,
      signal,
    );
    report(file.size);
    return { ...done, contentType, file };
  } catch (err) {
    // The failure being thrown is the one to report; the abort only keeps a half file out of storage.
    await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abort", uploadId, key }),
      keepalive: true,
    }).catch(() => undefined);
    throw err;
  }
}

/**
 * Upload many files — a multi-select, a dropped folder, a whole shoot — a few
 * at a time. Every file is tried; the result lists what landed and what was
 * refused or failed, each failure with its sentence for the app user.
 */
export async function uploadFiles(
  files: Iterable<File>,
  options: UploadFilesOptions = {},
): Promise<{ uploaded: UploadedFile[]; failed: { file: File; error: UploadError }[] }> {
  const queue = [...files];
  const uploaded: UploadedFile[] = [];
  const failed: { file: File; error: UploadError }[] = [];
  const totalBytes = Math.max(1, queue.reduce((sum, f) => sum + f.size, 0));
  const sent = new Map<File, number>();
  const reportAll = () => {
    let bytes = 0;
    for (const n of sent.values()) bytes += n;
    options.onProgress?.(Math.min(100, Math.round((bytes / totalBytes) * 100)));
  };

  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      try {
        const result = await uploadFile(file, {
          route: options.route,
          signal: options.signal,
          onProgress: (percent) => {
            sent.set(file!, (percent / 100) * file!.size);
            reportAll();
          },
        });
        uploaded.push(result);
        options.onFile?.({ file, uploaded: result });
      } catch (err) {
        if (options.signal?.aborted) throw err;
        const error = err instanceof UploadError ? err : new UploadError(GENERIC_FAILURE, file);
        failed.push({ file, error });
        options.onFile?.({ file, error });
      }
    }
  };
  const lanes = Math.max(1, Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, queue.length));
  await Promise.all(Array.from({ length: lanes }, worker));
  return { uploaded, failed };
}
