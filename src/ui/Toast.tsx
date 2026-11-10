import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastCtx = createContext<(msg: string) => void>(() => {});

/** Message de confirmation éphémère (« Noté pour Camille »), annoncé aux lecteurs d'écran. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[60] flex justify-center pointer-events-none pt-safe">
        {msg && <div className="mt-2 px-4 py-2.5 rounded-full bg-ink text-bg text-[15px] font-medium shadow-lg">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
