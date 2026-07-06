import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/tauri', () => ({
  stateExportConfig: vi.fn(),
  stateImportConfig: vi.fn(),
  stateSaveSnapshot: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

import { OptionsMenu } from '@/components/shell/OptionsMenu';
import { useSettingsStore } from '@/stores/settingsStore';

describe('OptionsMenu', () => {
  beforeEach(() => {
    useSettingsStore.setState({ optionsOpen: false });
  });

  it('renders the options trigger button', () => {
    render(<OptionsMenu />);
    expect(screen.getByRole('button', { name: /open options menu/i })).toBeInTheDocument();
  });

  it('toggles optionsOpen when trigger is clicked', () => {
    render(<OptionsMenu />);
    expect(useSettingsStore.getState().optionsOpen).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /open options menu/i }));
    expect(useSettingsStore.getState().optionsOpen).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /open options menu/i }));
    expect(useSettingsStore.getState().optionsOpen).toBe(false);
  });
});
