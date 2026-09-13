import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 m-4 bg-red-950/80 text-red-200 border border-red-500 rounded-3xl backdrop-blur-md z-50">
          <h2 className="font-bold text-xl mb-4 text-red-400">💥 Sistem Mengalami Crash (Black Screen Dicegah)</h2>
          <p className="text-sm mb-4 text-center text-red-300">Tolong screenshot layar ini dan berikan ke AI Assistant.</p>
          
          <div className="w-full bg-black/50 p-4 rounded-xl overflow-x-auto mb-4 border border-red-900">
            <pre className="text-xs font-mono text-red-300 break-all whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              className="px-5 py-2.5 bg-red-800 rounded-xl hover:bg-red-700 text-xs sm:text-sm font-bold text-white transition-all shadow-lg active:scale-95 cursor-pointer"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Coba Pulihkan
            </button>
            <button 
              className="px-5 py-2.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 text-xs sm:text-sm font-bold text-white transition-all shadow-lg active:scale-95 border border-zinc-600 cursor-pointer"
              onClick={() => { window.location.href = '/'; }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
