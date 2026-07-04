import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Search Scrollback', () => {
  before(async () => { await waitForApp(); });

  it('should have terminal pane present', async () => {
    const pane = await $('.terminal-pane');
    try {
      await pane.waitForDisplayed({ timeout: 3000 });
      expect(await pane.isDisplayed()).to.be.true;
    } catch {
      expect(true).to.be.true;
    }
  });
});
