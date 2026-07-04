import { expect } from 'chai';

describe('Workspace Widget', () => {
  before(async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 15000 });
  });

  it('should show notes widget', async () => {
    const widget = await $('.workspace-widget');
    expect(await widget.isDisplayed()).to.be.true;
  });

  it('should expand and allow typing', async () => {
    const toggle = await $('.workspace-widget__toggle');
    await toggle.click();
    await browser.pause(300);

    const textarea = await $('[aria-label="Workspace notes"]');
    expect(await textarea.isDisplayed()).to.be.true;

    await textarea.setValue('Test notes');
    expect(await textarea.getValue()).to.equal('Test notes');
  });
});
