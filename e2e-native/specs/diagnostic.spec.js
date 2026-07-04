import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Diagnostic', () => {
  before(async () => { await waitForApp(); });

  it('should show workspace header', async () => {
    const header = await $('.workspace-header');
    expect(await header.isDisplayed()).to.be.true;
  });
});
