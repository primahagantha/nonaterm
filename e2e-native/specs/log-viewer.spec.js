import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Log Viewer', () => {
  before(async () => { await waitForApp(); });

  it('should toggle log panel', async () => {
    const toggle = await $('.log-viewer__toggle');
    await toggle.waitForDisplayed({ timeout: 5000 });
    await browser.execute('arguments[0].click()', toggle);
    await browser.pause(300);

    const panel = await $('.log-viewer__panel');
    expect(await panel.isDisplayed()).to.be.true;
  });
});
