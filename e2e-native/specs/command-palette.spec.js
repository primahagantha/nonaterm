import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Command Palette', () => {
  before(async () => { await waitForApp(); });

  it('should have shortcuts button visible', async () => {
    const btn = await $('button[aria-label*="shortcuts"]');
    expect(await btn.isDisplayed()).to.be.true;
  });
});
