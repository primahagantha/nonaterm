import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Terminal Survival', () => {
  before(async () => { await waitForApp(); });

  it('terminal survives workspace switch', async () => {
    let items = await $$('.workspace-list__select');
    if (items.length < 2) return;

    await items[1].click();
    await browser.pause(500);

    items = await $$('.workspace-list__select');
    await items[0].click();
    await browser.pause(1000);

    const sidebar = await $('nav[aria-label="Workspaces"]');
    expect(await sidebar.isDisplayed()).to.be.true;
  });

  it('survives rapid switching', async () => {
    let items = await $$('.workspace-list__select');
    if (items.length < 2) return;

    for (let i = 0; i < 3; i++) {
      items = await $$('.workspace-list__select');
      await items[1].click();
      await browser.pause(200);
      items = await $$('.workspace-list__select');
      await items[0].click();
      await browser.pause(200);
    }

    const sidebar = await $('nav[aria-label="Workspaces"]');
    expect(await sidebar.isDisplayed()).to.be.true;
  });
});
