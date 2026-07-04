import { expect } from 'chai';

describe('Workspace Switching (Native)', () => {
  before(async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 10000 });
  });

  it('should switch workspace and back without crash', async () => {
    // Re-query fresh elements each time to avoid stale references
    let items = await $$('.workspace-list__select');
    if (items.length < 2) return this.skip();

    const header = await $('.workspace-header__info h1');
    const nameBefore = await header.getText();

    // Switch to second workspace
    items = await $$('.workspace-list__select');
    await items[1].click();
    await browser.pause(1500);

    // Switch back to first workspace
    items = await $$('.workspace-list__select');
    await items[0].click();
    await browser.pause(1500);

    // App should not have crashed (sidebar still visible)
    const sidebar = await $('nav[aria-label="Workspaces"]');
    expect(await sidebar.isDisplayed()).to.be.true;
  });

  it('should survive rapid workspace switching', async () => {
    const items = await $$('.workspace-list__select');
    if (items.length < 2) return this.skip();

    for (let i = 0; i < 3; i++) {
      await items[1].click();
      await browser.pause(300);
      await items[0].click();
      await browser.pause(300);
    }

    // App should not have crashed
    const sidebar = await $('nav[aria-label="Workspaces"]');
    expect(await sidebar.isDisplayed()).to.be.true;
    const header = await $('.workspace-header__info h1');
    expect(await header.isDisplayed()).to.be.true;
  });
});
