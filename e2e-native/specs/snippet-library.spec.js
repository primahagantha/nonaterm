import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('Snippet Library', () => {
  before(async () => { await waitForApp(); });

  it('should show snippets section in DOM', async () => {
    const body = await $('body');
    const html = await body.getHTML();
    expect(html).to.include('Snippets');
  });
});
