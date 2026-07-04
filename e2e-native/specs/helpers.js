/**
 * Dismiss any error banners that block UI interactions.
 */
export async function dismissBanners() {
  try {
    await browser.execute(() => {
      document.querySelectorAll('.error-banner').forEach(el => {
        el.style.display = 'none';
      });
    });
  } catch {}
}

/**
 * Wait for app to be fully ready.
 */
export async function waitForApp() {
  const sidebar = await $('nav[aria-label="Workspaces"]');
  await sidebar.waitForDisplayed({ timeout: 20000 });
  await dismissBanners();
  await browser.pause(500);
}
