import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

type Show = (msg: string, action?: ToastAction) => void;
const ToastCtx = createContext<Show>(() => {});

/**
 * Message de confirmation éphémère (« Noté pour Camille »), annoncé aux lecteurs d'écran.
 * Avec une action (« Annuler »), il reste affiché plus longtemps et devient cliquable.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; action?: ToastAction } | null>(null);
  const timer = useRef<number>();
  const show = useCallback<Show>((msg, action) => {
    setToast({ msg, action });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), action ? 5000 : 2200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[60] flex justify-center pointer-events-none pt-safe px-4">
        {toast && (
          <div className="mt-2 pl-4 pr-1.5 py-1.5 min-h-[44px] rounded-full bg-ink text-bg text-[15px] font-medium shadow-lg flex items-center gap-3 pointer-events-auto">
            <span className={toast.action ? '' : 'pr-2.5'}>{toast.msg}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  void toast.action!.run();
                  setToast(null);
                }}
                className="min-h-[36px] px-3 rounded-full bg-bg/15 text-bg font-semibold"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
