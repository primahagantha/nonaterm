import { expect } from 'chai';

describe('Recovery Flow', () => {
  before(async () => {
    const sidebar = await $('nav[aria-label="Workspaces"]');
    await sidebar.waitForDisplayed({ timeout: 15000 });
  });

  it('should not show recovery toast on clean shutdown', async () => {
    const toast = await $('[aria-label="Session recovery"]');
    expect(await toast.isDisplayed()).to.be.false;
  });
});
