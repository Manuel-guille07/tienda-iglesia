import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-[11px] font-mono text-rose-300 uppercase tracking-widest mb-3">
              ELARX_FATAL_EXCEPTION
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight mb-2">
              Error crítico en la aplicación
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-xs">
              Se ha producido un fallo inesperado en el renderizado o estado del sistema. Pulsa reintentar para restablecer la sesión.
            </p>

            {this.state.error && (
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-left mb-6 font-mono text-[11px] text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center text-sm font-semibold py-3"
              icon={<RefreshCw className="w-4 h-4 animate-spin-hover" />}
              onClick={this.handleReload}
            >
              Reintentar / Recargar App
            </Button>

            <div className="mt-6 pt-4 border-t border-slate-800 w-full flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>ELARX SECURE GUARD</span>
              <span>RECOVERABLE_ERROR</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
