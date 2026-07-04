import { expect } from 'chai';

describe('Nonaterm Native App', () => {
  it('should launch and show the app shell', async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 10000 });
    expect(await sidebar.isDisplayed()).to.be.true;
  });

  it('should show the Nonaterm brand name', async () => {
    const brand = await $('.workspace-header__brand-name');
    await brand.waitForDisplayed({ timeout: 5000 });
    expect(await brand.getText()).to.equal('Nonaterm');
  });

  it('should have a workspace sidebar with entries', async () => {
    const items = await $$('.workspace-list__item');
    expect(items.length).to.be.greaterThanOrEqual(1);
  });

  it('should show terminal panes', async () => {
    const panes = await $$('.terminal-pane');
    expect(panes.length).to.be.greaterThanOrEqual(1);
  });

  it('should show the options menu button', async () => {
    const optionsBtn = await $('button[aria-label*="options"]');
    expect(await optionsBtn.isDisplayed()).to.be.true;
  });
});
