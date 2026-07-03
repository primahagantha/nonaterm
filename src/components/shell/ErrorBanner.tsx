import { useEffect, useState } from 'react';
import { onAppError, type AppError } from '@/lib/errorHandler';

export function ErrorBanner() {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    return onAppError((error) => {
      setErrors((prev) => [...prev, error]);
      if (error.severity === 'info' || error.severity === 'warn') {
        setTimeout(() => {
          setErrors((prev) => prev.filter((e) => e.timestamp !== error.timestamp));
        }, 8000);
      }
    });
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="error-banner-stack" role="alert" aria-live="assertive">
      {errors.slice(-3).map((error) => (
        <div key={error.timestamp} className={`error-banner error-banner--${error.severity}`}>
          <div className="error-banner__content">
            <span className="error-banner__icon" aria-hidden="true">
              {error.severity === 'critical' ? '🔴' : error.severity === 'error' ? '⚠️' : error.severity === 'warn' ? '⚡' : 'ℹ️'}
            </span>
            <div className="error-banner__text">
              <p className="error-banner__message">{error.message}</p>
              {error.action ? <p className="error-banner__action">{error.action}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="error-banner__close"
            onClick={() => setErrors((prev) => prev.filter((e) => e.timestamp !== error.timestamp))}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
