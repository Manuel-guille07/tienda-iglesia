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
        <div className="min-h-screen bg-[#141210] text-[#EFECE6] flex flex-col items-center justify-center p-6 selection:bg-[#EFECE6] selection:text-[#141210]">
          <div className="relative w-full max-w-md bg-[#171412] border border-[#2A2420] rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-[11px] font-mono text-rose-300 uppercase tracking-widest mb-3">
              EL_CHIRINGUITO_EXCEPTION
            </div>

            <h1 className="text-xl font-bold text-[#F4F0EA] tracking-tight mb-2">
              Error crítico en la aplicación
            </h1>
            <p className="text-xs text-[#9A9086] leading-relaxed mb-6 max-w-xs">
              Se ha producido un fallo inesperado en el renderizado o estado del sistema. Pulsa reintentar para restablecer la sesión.
            </p>

            {this.state.error && (
              <div className="w-full bg-[#0E0C0B] border border-[#2A2420] rounded-xl p-3 text-left mb-6 font-mono text-[11px] text-rose-400 overflow-x-auto max-h-32">
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

            <div className="mt-6 pt-4 border-t border-[#2A2420] w-full flex items-center justify-between text-[10px] text-[#9A9086] font-mono">
              <span>EL CHIRINGUITO POS</span>
              <span>RECOVERABLE_ERROR</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
