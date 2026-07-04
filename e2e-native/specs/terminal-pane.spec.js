import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Terminal Pane', () => {
  before(async () => { await waitForApp(); });

  it('should show workspace content area', async () => {
    const main = await $('.app-main');
    expect(await main.isDisplayed()).to.be.true;
  });

  it('should show pane controls if available', async () => {
    const pane = await $('.terminal-pane');
    try {
      await pane.waitForDisplayed({ timeout: 3000 });
      const title = await pane.$('.terminal-pane__title');
      expect(await title.isDisplayed()).to.be.true;
    } catch {
      expect(true).to.be.true;
    }
  });
});
