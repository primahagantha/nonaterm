import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';

const {
  mockIsTauriRuntime,
  mockSystemCheckUpdates,
  mockSystemInstallUpdate,
} = vi.hoisted(() => ({
  mockIsTauriRuntime: vi.fn(),
  mockSystemCheckUpdates: vi.fn(),
  mockSystemInstallUpdate: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  isTauriRuntime: mockIsTauriRuntime,
  systemCheckUpdates: mockSystemCheckUpdates,
  systemInstallUpdate: mockSystemInstallUpdate,
}));

import { UpdateChecker } from '@/components/shell/UpdateChecker';

const noUpdate = {
  available: false,
  version: null,
  currentVersion: '0.1.0',
  notes: null,
};

const hasUpdate = {
  available: true,
  version: '0.2.0',
  currentVersion: '0.1.0',
  notes: 'Bug fixes and performance improvements',
};

describe('UpdateChecker', () => {
  beforeEach(() => {
    mockIsTauriRuntime.mockReset();
    mockSystemCheckUpdates.mockReset();
    mockSystemInstallUpdate.mockReset();
    mockIsTauriRuntime.mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no update is available', async () => {
    mockSystemCheckUpdates.mockResolvedValue(noUpdate);

    render(<UpdateChecker />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mockSystemCheckUpdates).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows banner when update is available', async () => {
    mockSystemCheckUpdates.mockResolvedValue(hasUpdate);

    render(<UpdateChecker />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText(/Update v0\.2\.0 available/i)).toBeInTheDocument();
    expect(screen.getByText('Download & Install')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('hides banner on dismiss', async () => {
    mockSystemCheckUpdates.mockResolvedValue(hasUpdate);

    render(<UpdateChecker />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    fireEvent.click(screen.getByText('Dismiss'));

    expect(
      screen.queryByText(/Update v0\.2\.0 available/i),
    ).not.toBeInTheDocument();
  });

  it('shows installing status when install is clicked', async () => {
    mockSystemCheckUpdates.mockResolvedValue(hasUpdate);
    mockSystemInstallUpdate.mockReturnValue(new Promise(() => {}));

    render(<UpdateChecker />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    fireEvent.click(screen.getByText('Download & Install'));

    expect(screen.getByText('Installing...')).toBeInTheDocument();
    expect(mockSystemInstallUpdate).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not in Tauri runtime', () => {
    mockIsTauriRuntime.mockReturnValue(false);

    const { container } = render(<UpdateChecker />);

    expect(container).toBeEmptyDOMElement();
    expect(mockSystemCheckUpdates).not.toHaveBeenCalled();
  });
});
