import { ensureLocaleColumn } from "./auth/ensure-tables";
import { getSession } from "./auth/server";
import { LOCALE_COOKIE } from "./strings";

/** The language the signed-in app user chose, or null when nobody is signed in or
 *  nothing was chosen. A failed read logs and resolves as no choice: the page still renders. */
export async function storedLocale(request: Request, env: Env): Promise<string | null> {
  try {
    const session = await getSession(request, env);
    if (!session) return null;
    await ensureLocaleColumn(env);
    const row = await env.DB.prepare("SELECT `stencil_locale` AS locale FROM `user` WHERE `id` = ?")
      .bind(session.user.id)
      .first<{ locale: string | null }>();
    return row?.locale ?? null;
  } catch (err) {
    console.warn(`[locale] stored language could not be read for app ${env.APP_ID}:`, err);
    return null;
  }
}

/** Remember `locale` on the app user's row, so it follows them to their next device. */
export async function saveStoredLocale(env: Env, userId: string, locale: string): Promise<void> {
  await ensureLocaleColumn(env);
  await env.DB.prepare("UPDATE `user` SET `stencil_locale` = ? WHERE `id` = ?").bind(locale, userId).run();
}

/** The `Set-Cookie` value that remembers `locale` for a browser, signed in or not. */
export function localeCookie(locale: string): string {
  return `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
