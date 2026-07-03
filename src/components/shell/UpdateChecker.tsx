import { useEffect, useState } from 'react';
import {
  isTauriRuntime,
  systemCheckUpdates,
  systemInstallUpdate,
} from '@/lib/tauri';
import type { UpdateInfo } from '@/types/ipc';

const INITIAL_DELAY_MS = 3000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Banner non-blocking yang mengecek dan menawarkan update aplikasi secara berkala. */
export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;

    const checkForUpdates = async () => {
      try {
        const info = await systemCheckUpdates();
        if (!cancelled && info.available) {
          setUpdateInfo(info);
        }
      } catch {
        // silently ignore update check errors
      }
    };

    const initialTimer = window.setTimeout(checkForUpdates, INITIAL_DELAY_MS);
    const interval = window.setInterval(checkForUpdates, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  if (!updateInfo || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await systemInstallUpdate();
    } catch {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <section
      className="update-banner"
      role="alert"
      aria-label="Update available"
    >
      <div className="update-banner__content">
        <strong>Update v{updateInfo.version} available.</strong>
        {updateInfo.notes ? <span>{updateInfo.notes}</span> : null}
      </div>
      <div className="update-banner__actions">
        {installing ? (
          <span className="update-banner__status">Installing...</span>
        ) : (
          <>
            <button
              type="button"
              className="update-banner__btn update-banner__btn--primary"
              onClick={handleInstall}
            >
              Download &amp; Install
            </button>
            <button
              type="button"
              className="update-banner__btn"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </section>
  );
}
