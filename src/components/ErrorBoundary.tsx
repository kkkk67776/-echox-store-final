import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check, Terminal, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ECHOX ErrorBoundary] Caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear storage:', e);
      window.location.reload();
    }
  };

  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.name}: ${error?.message}\nStack: ${error?.stack}\nComponentStack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
      const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'غير محدد';
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'غير محدد';
      const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-echoxstore-9e1d54e8-7960-44b2-951a-524166c61a13';
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'غير محدد';

      return (
        <div className="min-h-screen bg-[#0B0F17] text-white flex items-center justify-center p-4 sm:p-8 font-sans" dir="rtl">
          <div className="max-w-2xl w-full bg-[#111827] border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full inline-block">
                  ECHOX DIAGNOSTIC & ERROR BOUNDARY
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  حدث خطأ أثناء تشغيل التطبيق
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  تم اعتراض الخطأ لمنع ظهور الشاشة البيضاء وتمكين التشخيص المباشر
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-red-400 font-bold">
                <span>رسالة الخطأ (Error Message):</span>
                <span className="font-mono text-[11px]">{this.state.error?.name}</span>
              </div>
              <p className="text-xs sm:text-sm font-mono text-red-200 bg-black/40 p-3 rounded-xl border border-red-500/20 break-words" dir="ltr">
                {this.state.error?.message || 'Unknown runtime error occurred.'}
              </p>
            </div>

            {/* Firebase Diagnostic Box */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Database className="w-4 h-4 text-[#FF6B00]" />
                <span>حالة متغيرات بيئة Firebase (Environment Diagnostics):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono" dir="ltr">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PROJECT_ID:</span>
                  <span className="text-emerald-400 font-bold">{projectId}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">FIRESTORE_DB:</span>
                  <span className="text-emerald-400 font-bold truncate block">{dbId}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">AUTH_DOMAIN:</span>
                  <span className="text-slate-300 truncate block">{authDomain}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">API_KEY:</span>
                  <span className="text-slate-300">{maskedKey}</span>
                </div>
              </div>
            </div>

            {/* Error Stack (Collapsible) */}
            {this.state.error?.stack && (
              <details className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <summary className="cursor-pointer font-bold text-slate-300 hover:text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>عرض التتبع البرمجي الكامل (Stack Trace)</span>
                </summary>
                <pre className="mt-2 text-[10px] font-mono text-slate-400 p-2 bg-black/60 rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap" dir="ltr">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة (Reload)</span>
              </button>

              <button
                onClick={this.handleResetStorage}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer"
                title="يمسح البيانات المخزنة محلياً في حال وجود بيانات فاسدة"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>مسح الذاكرة المحلية والبدء من جديد</span>
              </button>

              <button
                onClick={this.handleCopyError}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 cursor-pointer"
              >
                {this.state.copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{this.state.copied ? 'تم النسخ!' : 'نسخ التقرير'}</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
