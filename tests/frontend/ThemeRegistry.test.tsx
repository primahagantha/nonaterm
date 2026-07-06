import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from '@/components/shell/SettingsPage';
import { THEMES, useSettingsStore } from '@/stores/settingsStore';

vi.mock('@/lib/tauri', () => ({
  stateExportConfig: vi.fn(),
  stateImportConfig: vi.fn(),
  stateSaveSnapshot: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: (selector: (state: { appInfo: null; diagnostics: null; backendStatus: string }) => unknown) =>
    selector({ appInfo: null, diagnostics: null, backendStatus: 'ready' }),
}));

describe('theme registry', () => {
  it('exposes all themes with required metadata', () => {
    const ids = Object.keys(THEMES);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      const def = THEMES[id as keyof typeof THEMES];
      expect(def.id).toBeDefined();
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(def.preview.bg).toBeDefined();
    }
  });
});

describe('SettingsPage theme picker', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      optionsOpen: false,
      themeMode: 'light',
      themeId: 'midnight',
      fontFamily: 'Cascadia Code, ui-monospace, monospace',
      fontSize: 13,
    });
  });

  it('renders a card for every theme', () => {
    render(<SettingsPage />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    for (const def of Object.values(THEMES)) {
      expect(
        screen.getByRole('radio', { name: new RegExp(def.label, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('marks the active theme as checked', () => {
    useSettingsStore.setState({ themeId: 'aurora' });
    render(<SettingsPage />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    const aurora = screen.getByRole('radio', { name: /aurora/i });
    expect(aurora).toHaveAttribute('aria-checked', 'true');
    const dracula = screen.getByRole('radio', { name: /dracula/i });
    expect(dracula).toHaveAttribute('aria-checked', 'false');
  });

  it('mode toggle switches light/dark', () => {
    render(<SettingsPage />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('font size input updates', () => {
    render(<SettingsPage />);
    act(() => {
      useSettingsStore.getState().setOptionsOpen(true);
    });
    const fontInputs = screen.getAllByRole('spinbutton');
    const sizeInput = fontInputs.find((el) => el.getAttribute('min') === '10');
    expect(sizeInput).toBeDefined();
    fireEvent.change(sizeInput!, { target: { value: '18' } });
    expect(useSettingsStore.getState().fontSize).toBe(18);
  });
});
