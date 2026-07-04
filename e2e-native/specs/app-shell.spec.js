import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('App Shell', () => {
  before(async () => { await waitForApp(); });

  it('should render sidebar with Nonaterm title', async () => {
    const title = await $('.workspace-sidebar__title');
    expect(await title.isDisplayed()).to.be.true;
    expect(await title.getText()).to.equal('Nonaterm');
  });

  it('should show workspace navigation', async () => {
    const nav = await $('nav[aria-label="Workspaces"]');
    expect(await nav.isDisplayed()).to.be.true;
  });

  it('should have workspace entries', async () => {
    const items = await $$('.workspace-list__item');
    expect(items.length).to.be.greaterThanOrEqual(1);
  });
});
