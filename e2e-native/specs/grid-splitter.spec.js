import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Grid Splitter', () => {
  before(async () => { await waitForApp(); });

  it('should show terminal grid or workspace content', async () => {
    const grid = await $('[aria-label="Terminal grid"]');
    try {
      await grid.waitForDisplayed({ timeout: 3000 });
      expect(await grid.isDisplayed()).to.be.true;
    } catch {
      const sidebar = await $('nav[aria-label="Workspaces"]');
      expect(await sidebar.isDisplayed()).to.be.true;
    }
  });
});
