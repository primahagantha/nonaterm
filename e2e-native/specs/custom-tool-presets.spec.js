import { expect } from 'chai';

describe('Custom Tool Presets', () => {
  before(async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 15000 });
  });

  it('should load app without errors', async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    expect(await sidebar.isDisplayed()).to.be.true;
  });
});
