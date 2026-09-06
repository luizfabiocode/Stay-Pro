import React from 'react';
import { Sparkles, X, CheckCircle2, ArrowRight, Building, CalendarPlus, UserPlus, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from './Header';

interface OnboardingBannerProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewReservation: () => void;
  onOpenInvite: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  setActiveTab,
  onOpenNewReservation,
  onOpenInvite,
}) => {
  const { showOnboarding, dismissOnboarding, user, propriedade } = useAuth();

  if (!showOnboarding) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden mb-6">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Primeiros Passos
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Bem-vindo ao Stay Pro!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Configure seu imóvel, adicione sua primeira reserva e convide colaboradores para sua equipe.
            <span className="font-semibold text-blue-400 ml-1">
              Acesso 100% gratuito e ilimitado para gestão da sua temporada.
            </span>
          </p>
        </div>

        {/* Action Steps */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('guia')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-xs font-semibold text-blue-200 border border-blue-400/40 transition-colors backdrop-blur-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>Guia do Usuário</span>
          </button>

          <button
            onClick={() => setActiveTab('configuracoes')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white border border-white/10 transition-colors backdrop-blur-xs"
          >
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configurar Imóvel</span>
          </button>

          <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Adicionar Reserva</span>
          </button>

          <button
            onClick={onOpenInvite}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white border border-white/10 transition-colors backdrop-blur-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-400" />
            <span>Convidar Equipe</span>
          </button>

          <button
            onClick={dismissOnboarding}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-auto md:ml-0"
            title="Fechar introdução"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
