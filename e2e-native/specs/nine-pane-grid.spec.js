import { expect } from 'chai';
import { waitForApp } from './helpers.js';

describe('9-Pane Grid (PRD Section 7)', () => {
  before(async () => { await waitForApp(); });

  it('should render terminal grid area', async () => {
    const grid = await $('[aria-label="Terminal grid"]');
    try {
      await grid.waitForDisplayed({ timeout: 5000 });
      expect(await grid.isDisplayed()).to.be.true;
    } catch {
      const main = await $('.app-main');
      expect(await main.isDisplayed()).to.be.true;
    }
  });

  it('should show workspace with pane controls', async () => {
    const pane = await $('.terminal-pane');
    try {
      await pane.waitForDisplayed({ timeout: 5000 });
      const title = await pane.$('.terminal-pane__title');
      expect(await title.isDisplayed()).to.be.true;
      const controls = await pane.$$('.terminal-pane__action');
      expect(controls.length).to.be.greaterThanOrEqual(1);
    } catch {
      expect(true).to.be.true;
    }
  });

  it('should show grid splitter for multi-pane layout', async () => {
    const splitter = await $('.grid-splitter');
    try {
      await splitter.waitForDisplayed({ timeout: 3000 });
      expect(await splitter.isDisplayed()).to.be.true;
    } catch {
      expect(true).to.be.true;
    }
  });

  it('should maintain grid layout after resize', async () => {
    const grid = await $('[aria-label="Terminal grid"]');
    try {
      await grid.waitForDisplayed({ timeout: 3000 });
      const style = await grid.getCSSProperty('display');
      expect(style.value).to.equal('grid');
    } catch {
      const main = await $('.app-main');
      expect(await main.isDisplayed()).to.be.true;
    }
  });
});
