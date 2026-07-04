import { expect } from 'chai';

describe('Workspace Switching (Native)', () => {
  before(async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 10000 });
  });

  it('should switch workspace and keep terminal alive', async () => {
    const firstPane = await $('.terminal-pane');
    await firstPane.waitForDisplayed({ timeout: 5000 });

    const items = await $$('.workspace-list__select');
    if (items.length > 1) {
      await items[1].click();
      await browser.pause(500);

      await items[0].click();
      await browser.pause(500);

      const paneAfter = await $('.terminal-pane');
      expect(await paneAfter.isDisplayed()).to.be.true;
      const statusAfter = await paneAfter.getAttribute('data-status');
      expect(statusAfter).to.not.equal('error');
    }
  });

  it('should survive rapid workspace switching', async () => {
    const items = await $$('.workspace-list__select');
    if (items.length > 1) {
      for (let i = 0; i < 5; i++) {
        await items[1].click();
        await browser.pause(100);
        await items[0].click();
        await browser.pause(100);
      }

      const pane = await $('.terminal-pane');
      expect(await pane.isDisplayed()).to.be.true;
    }
  });
});
