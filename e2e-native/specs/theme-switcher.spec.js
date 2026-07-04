import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Theme Switcher', () => {
  before(async () => { await waitForApp(); });

  it('should have options menu button', async () => {
    const btn = await $('button[aria-label*="options"]');
    expect(await btn.isDisplayed()).to.be.true;
  });
});
