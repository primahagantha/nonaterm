import { describe, it, expect } from 'vitest';
import { parseTokenOutput, formatTokenCount } from '@/lib/tokenParser';

describe('Token Parser', () => {
  describe('parseTokenOutput', () => {
    it('parses Claude Code format: "Tokens: 1,234 in / 5,678 out"', () => {
      const result = parseTokenOutput('Tokens: 1,234 in / 5,678 out');
      expect(result).toEqual({ input: 1234, output: 5678 });
    });

    it('parses Cursor format: "tokens: 1234 input, 5678 output"', () => {
      const result = parseTokenOutput('tokens: 1234 input, 5678 output');
      expect(result).toEqual({ input: 1234, output: 5678 });
    });

    it('parses opencode format: "in: 1234 | out: 5678"', () => {
      const result = parseTokenOutput('in: 1234 | out: 5678');
      expect(result).toEqual({ input: 1234, output: 5678 });
    });

    it('parses cline format: "Input tokens: 1234, Output tokens: 5678"', () => {
      const result = parseTokenOutput('Input tokens: 1234, Output tokens: 5678');
      expect(result).toEqual({ input: 1234, output: 5678 });
    });

    it('returns null for non-matching output', () => {
      const result = parseTokenOutput('Hello world');
      expect(result).toBeNull();
    });

    it('handles numbers with commas', () => {
      const result = parseTokenOutput('Tokens: 1,234,567 in / 8,901,234 out');
      expect(result).toEqual({ input: 1234567, output: 8901234 });
    });

    it('handles numbers with dots (European format)', () => {
      const result = parseTokenOutput('Tokens: 1.234 in / 5.678 out');
      expect(result).toEqual({ input: 1234, output: 5678 });
    });
  });

  describe('formatTokenCount', () => {
    it('formats thousands as K', () => {
      expect(formatTokenCount(1234)).toBe('1.2K');
    });

    it('formats millions as M', () => {
      expect(formatTokenCount(1234567)).toBe('1.2M');
    });

    it('formats small numbers as-is', () => {
      expect(formatTokenCount(123)).toBe('123');
    });

    it('formats zero as 0', () => {
      expect(formatTokenCount(0)).toBe('0');
    });
  });
});
