import { permanentRedirect } from 'next/navigation';

/**
 * /settings is the canonical entry point for the settings area, but the
 * actual landing view is the Account page. We redirect server-side so:
 *   - existing bookmarks / external links to /settings keep working
 *   - the Navbar's "Settings" menu item (links to /settings) lands the user
 *     on the same view as the "Account" menu item (links to /settings/account)
 *   - the URL bar always shows the self-documenting /settings/account
 *
 * permanentRedirect emits HTTP 308 so search engines and link-checkers
 * know the canonical URL has moved to /settings/account and stop
 * re-crawling /settings. The 308 also preserves the request method on
 * future POSTs (though no POST handler exists here today).
 */
export default function SettingsRootPage(): never {
  permanentRedirect('/settings/account');
}
