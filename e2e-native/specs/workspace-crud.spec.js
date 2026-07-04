import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Workspace CRUD', () => {
  before(async () => { await waitForApp(); });

  it('should show workspace list', async () => {
    const items = await $$('.workspace-list__select');
    expect(items.length).to.be.greaterThanOrEqual(1);
  });
});
