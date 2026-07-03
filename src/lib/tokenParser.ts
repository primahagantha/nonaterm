/**
 * Token parser for AI agent CLI output.
 * Supports: Claude Code, Cursor, opencode, cline, agy, and generic formats.
 */

export type TokenCount = {
  input: number;
  output: number;
};

/**
 * Parse token output from various AI agent CLI formats.
 * Returns null if no token pattern is found.
 */
export function parseTokenOutput(line: string): TokenCount | null {
  const normalized = line.trim().toLowerCase();

  // Claude Code format: "Tokens: 1,234 in / 5,678 out"
  const claudeMatch = normalized.match(
    /tokens?:\s*([\d,.]+)\s*in\s*\/\s*([\d,.]+)\s*out/i
  );
  if (claudeMatch) {
    return {
      input: parseNumber(claudeMatch[1]),
      output: parseNumber(claudeMatch[2]),
    };
  }

  // Cursor format: "tokens: 1234 input, 5678 output"
  const cursorMatch = normalized.match(
    /tokens?:\s*([\d,.]+)\s*input\s*,\s*([\d,.]+)\s*output/i
  );
  if (cursorMatch) {
    return {
      input: parseNumber(cursorMatch[1]),
      output: parseNumber(cursorMatch[2]),
    };
  }

  // opencode format: "in: 1234 | out: 5678"
  const opencodeMatch = normalized.match(
    /in:\s*([\d,.]+)\s*\|\s*out:\s*([\d,.]+)/i
  );
  if (opencodeMatch) {
    return {
      input: parseNumber(opencodeMatch[1]),
      output: parseNumber(opencodeMatch[2]),
    };
  }

  // cline format: "Input tokens: 1234, Output tokens: 5678"
  const clineMatch = normalized.match(
    /input\s*tokens?:\s*([\d,.]+)\s*,\s*output\s*tokens?:\s*([\d,.]+)/i
  );
  if (clineMatch) {
    return {
      input: parseNumber(clineMatch[1]),
      output: parseNumber(clineMatch[2]),
    };
  }

  // Generic format: "1234 in, 5678 out" or "1234 input, 5678 output"
  const genericMatch = normalized.match(
    /([\d,.]+)\s*(?:in|input)\s*[,/]\s*([\d,.]+)\s*(?:out|output)/i
  );
  if (genericMatch) {
    return {
      input: parseNumber(genericMatch[1]),
      output: parseNumber(genericMatch[2]),
    };
  }

  return null;
}

/**
 * Parse a number string that may contain commas or dots as thousand separators.
 */
function parseNumber(str: string): number {
  // Remove commas and dots (thousand separators)
  const cleaned = str.replace(/[,.\s]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Format token count for display.
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}
