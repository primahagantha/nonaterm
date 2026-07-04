import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Vertical Tabs', () => {
  before(async () => { await waitForApp(); });

  it('should have view mode toggle', async () => {
    const toggle = await $('button[aria-label="Toggle view mode"]');
    await toggle.waitForDisplayed({ timeout: 5000 });
    expect(await toggle.isDisplayed()).to.be.true;
  });
});
