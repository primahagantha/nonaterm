import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  paneId: string;
  onRestart?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/** Catches render/initialization errors in terminal panes to prevent app-wide crash. */
export class TerminalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[TerminalErrorBoundary] Pane ${this.props.paneId} crashed:`, error);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRestart?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="terminal-pane__loading">
          <p style={{ color: 'var(--tw-danger)', fontWeight: 600 }}>
            Pane crashed
          </p>
          <p style={{ color: 'var(--tw-text-muted)', fontSize: '0.82rem' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={this.handleRestart}
          >
            Restart Pane
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
