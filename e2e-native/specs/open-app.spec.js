import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Open App / Quick Launch', () => {
  before(async () => { await waitForApp(); });

  it('should show quick launch button', async () => {
    const btn = await $('button[aria-label="Quick launch terminal"]');
    await btn.waitForDisplayed({ timeout: 5000 });
    expect(await btn.isDisplayed()).to.be.true;
  });
});
