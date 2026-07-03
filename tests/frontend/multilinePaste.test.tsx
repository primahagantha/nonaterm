import { describe, it, expect } from 'vitest';

describe('Multiline Paste Confirmation', () => {
  it('detects multiline text', () => {
    const text = 'line1\nline2\nline3';
    const lineCount = text.split(/\r?\n/).length;
    expect(lineCount).toBe(3);
  });

  it('detects single line text', () => {
    const text = 'single line';
    const lineCount = text.split(/\r?\n/).length;
    expect(lineCount).toBe(1);
  });

  it('detects multiline with CRLF', () => {
    const text = 'line1\r\nline2\r\nline3';
    const lineCount = text.split(/\r?\n/).length;
    expect(lineCount).toBe(3);
  });

  it('handles empty text', () => {
    const text = '';
    const lineCount = text.split(/\r?\n/).length;
    expect(lineCount).toBe(1);
  });
});
