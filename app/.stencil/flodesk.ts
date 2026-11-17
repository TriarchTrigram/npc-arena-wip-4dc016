import { BACKEND_BASE, createBackendFetch } from "./backend";
import { isDev } from "./context";

export interface AddToFlodeskParams {
  email: string;
  /** Full name; the platform splits it into Flodesk's first and last name. */
  name?: string | null;
  /** Flodesk segment ids to join on top of the ones saved on the app's Users page. */
  segmentIds?: string[];
}

/** Add an email the app collected to the Flodesk segments saved on the app's Users
 *  page, plus any `segmentIds` given, on the same queue and retry as signups.
 *  Skipped in local dev and never throws; resolves false when Flodesk is not set
 *  up for this app. */
export async function addToFlodesk(env: Env, params: AddToFlodeskParams): Promise<boolean> {
  if (isDev(env) || !env.BACKEND_SERVICE) return false;
  try {
    const res = await createBackendFetch(env)(`${BACKEND_BASE}/flodesk/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        name: params.name ?? null,
        segmentIds: params.segmentIds ?? [],
      }),
    });
    if (!res.ok) {
      console.warn("[flodesk] add skipped:", params.email, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[flodesk] add failed:", params.email, err);
    return false;
  }
}
