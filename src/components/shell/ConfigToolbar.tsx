import { OptionsMenu } from '@/components/shell/OptionsMenu';

/**
 * @deprecated Replaced by {@link OptionsMenu} (top-right gear icon).
 * Kept as a re-export so older tests and references continue to compile.
 */
export function ConfigToolbar() {
  return <OptionsMenu />;
}
