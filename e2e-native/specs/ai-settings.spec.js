import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('AI Settings', () => {
  before(async () => { await waitForApp(); });

  it('should have options menu button', async () => {
    const btn = await $('button[aria-label*="options"]');
    expect(await btn.isDisplayed()).to.be.true;
  });
});
