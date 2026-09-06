import React from 'react';
import { Clock, ShieldAlert, LogIn, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SessionTimeoutModal: React.FC = () => {
  const {
    isSessionExpired,
    dismissSessionExpiredModal,
    showInactivityWarning,
    remainingInactivitySeconds,
    extendSession,
    logout,
  } = useAuth();

  if (!isSessionExpired && !showInactivityWarning) return null;

  if (showInactivityWarning && !isSessionExpired) {
    const minutes = Math.floor(remainingInactivitySeconds / 60);
    const seconds = remainingInactivitySeconds % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-amber-200 text-center animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3.5 shadow-xs">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            Aviso de Inatividade
          </span>

          <h2 className="text-lg font-bold text-slate-900">Sua sessão irá expirar em breve</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Você está inativo há mais de 25 minutos. Por motivos de segurança e conformidade LGPD, a sessão será encerrada em:
          </p>

          <div className="my-4 py-3 px-6 bg-slate-100 rounded-2xl inline-block border border-slate-200">
            <span className="font-mono text-2xl font-black text-amber-600 tracking-wider">
              {formattedTime}
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={logout}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sair Agora</span>
            </button>
            <button
              onClick={extendSession}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Permanecer Conectado</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-slate-900">Sessão Expirada por Inatividade</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          Para garantir a segurança e a proteção de dados (LGPD) dos seus hóspedes, sua sessão foi finalizada após 30 minutos sem atividade.
        </p>

        <div className="mt-6">
          <button
            onClick={dismissSessionExpiredModal}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login Novamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
