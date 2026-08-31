import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Wrench, CheckCircle2 } from 'lucide-react';
import { loadStoredData, resetToInitialData } from '../utils/storage';
import { healAndRepairAllData, recordSecurityEvent } from '../utils/security';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  repaired: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      repaired: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, repaired: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Aspirant Sportswear Error Boundary:', error, errorInfo);
    recordSecurityEvent({
      type: 'TAMPER_DETECTED',
      severity: 'high',
      details: `Application runtime exception caught: ${error.message}`,
      source: 'GlobalErrorBoundary',
    });
  }

  private handleAutoRepair = () => {
    try {
      const currentData = loadStoredData();
      const { repairedData } = healAndRepairAllData(currentData);
      // Re-save repaired state
      localStorage.setItem('sublimaster_employees_v1', JSON.stringify(repairedData.employees));
      localStorage.setItem('sublimaster_attendance_v1', JSON.stringify(repairedData.attendance));
      localStorage.setItem('sublimaster_salary_v1', JSON.stringify(repairedData.salary));
      localStorage.setItem('sublimaster_orders_v1', JSON.stringify(repairedData.orders));
      localStorage.setItem('sublimaster_equipment_v1', JSON.stringify(repairedData.equipment));
      localStorage.setItem('sublimaster_settings_v1', JSON.stringify(repairedData.settings));

      this.setState({ repaired: true });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Auto repair failed, resetting to clean initial data:', err);
      resetToInitialData();
      window.location.reload();
    }
  };

  private handleHardReset = () => {
    resetToInitialData();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                System Self-Defense Activated
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                An unexpected error or corrupted data state was intercepted by the plant security layer. No data has been exposed.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-left font-mono text-[11px] text-rose-300 break-all overflow-x-auto max-h-28 custom-scrollbar">
                {this.state.error.message || 'Unknown Exception'}
              </div>
            )}

            {this.state.repaired ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Data repaired & database sanitized. Reloading system...</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={this.handleAutoRepair}
                  className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Auto-Repair & Recover</span>
                </button>
                <button
                  onClick={this.handleHardReset}
                  className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Factory Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
