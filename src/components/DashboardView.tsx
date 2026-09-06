import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  LogIn,
  LogOut,
  Users,
  Sparkles,
  RefreshCw,
  Plus,
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DashboardStats, Reserva } from '../types';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDateBR, getStatusColor } from '../utils/security';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from './Header';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewReservation: () => void;
  onOpenNewBlock: () => void;
  onSelectReservation: (reserva: Reserva) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenNewReservation,
  onOpenNewBlock,
  onSelectReservation,
}) => {
  const { user, propriedade } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const now = new Date();
  const currentMonthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Mini Calendar generation
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  return (
    <div className="space-y-6">
      {/* Dashboard Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Visão Geral do Imóvel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 capitalize">
            {currentMonthName} • Gestão centralizada e em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('calendario')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span>Ver Calendário Completo</span>
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reservas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reservas do Mês</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">
              Ilimitado
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {stats?.reservasMesCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-green-600 font-semibold">Ativas</span> no período atual
            </p>
          </div>
        </div>

        {/* Card 2: Faturamento */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Faturamento do Mês</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {formatCurrency(stats?.faturamentoMes ?? 0)}
            </p>
            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Total em contratos vigentes
            </p>
          </div>
        </div>

        {/* Card 3: Taxa de Ocupação */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxa de Ocupação</span>
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${Math.min(100, stats?.taxaOcupacao || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {stats?.taxaOcupacao ?? 0}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.diasOcupadosMes ?? 0} de {stats?.diasTotaisMes ?? 30} dias reservados
            </p>
          </div>
        </div>

        {/* Card 4: Pendentes de Sinal */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 border-l-4 border-l-yellow-400 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendentes de Sinal</span>
            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold uppercase">
              Ação Requerida
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {stats?.pendentesSinalCount ?? 0}
            </p>
            <p className="text-xs text-yellow-600 font-medium mt-1">
              Total a receber: {formatCurrency(stats?.pendentesSinalValor ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Next Check-ins, Next Check-outs, and Mini Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Check-ins */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <LogIn className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Próximos Check-ins</h3>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {stats?.proximosCheckIns.length || 0}
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {stats?.proximosCheckIns && stats.proximosCheckIns.length > 0 ? (
                stats.proximosCheckIns.map((res) => {
                  return (
                    <div
                      key={res.id}
                      onClick={() => onSelectReservation(res)}
                      className="py-3 group cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {res.hospede}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {res.telefone} • {res.qtdPessoas} pessoas
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            res.status === 'Confirmado'
                              ? 'bg-green-100 text-green-700'
                              : res.status === 'Pendente'
                              ? 'bg-yellow-100 text-yellow-700'
                              : res.status === 'Bloqueado'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-1.5">
                        <span className="font-medium text-slate-700">Entrada: {formatDateBR(res.checkIn)}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(res.valorTotal)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum check-in programado para os próximos dias.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('reservas')}
            className="w-full mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1 group transition-colors"
          >
            <span>Ver todas as reservas</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Next Check-outs */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <LogOut className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Próximos Check-outs</h3>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {stats?.proximosCheckOuts.length || 0}
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {stats?.proximosCheckOuts && stats.proximosCheckOuts.length > 0 ? (
                stats.proximosCheckOuts.map((res) => {
                  return (
                    <div
                      key={res.id}
                      onClick={() => onSelectReservation(res)}
                      className="py-3 group cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {res.hospede}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Saldo: {res.saldoRestante > 0 ? formatCurrency(res.saldoRestante) : 'Quitado'}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            res.status === 'Confirmado'
                              ? 'bg-green-100 text-green-700'
                              : res.status === 'Pendente'
                              ? 'bg-yellow-100 text-yellow-700'
                              : res.status === 'Bloqueado'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 mt-1.5">
                        <span className="font-medium text-slate-700">Saída: {formatDateBR(res.checkOut)}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(res.valorTotal)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum check-out agendado para os próximos dias.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('reservas')}
            className="w-full mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1 group transition-colors"
          >
            <span>Ver todas as saídas</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mini Interactive Month Calendar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Mapa do Mês</h3>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Pendente
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Bloqueio
              </span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mt-3">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <div key={i} className="text-[10px] font-bold text-slate-400 py-1">
                  {day}
                </div>
              ))}

              {/* Blank initial days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-7" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === now.getDate();
                const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                let dayBg = 'text-slate-700 hover:bg-slate-100';
                let dotColor = null;

                const resMatch = stats?.proximosCheckIns?.concat(stats.proximosCheckOuts || []).find((r) => {
                  return dayDateStr >= r.checkIn && dayDateStr < r.checkOut;
                });

                if (resMatch) {
                  if (resMatch.status === 'Confirmado' || resMatch.status === 'Check-in' || resMatch.status === 'Check-out') {
                    dayBg = 'bg-green-100 text-green-800 font-bold';
                    dotColor = 'bg-green-600';
                  } else if (resMatch.status === 'Pendente') {
                    dayBg = 'bg-yellow-100 text-yellow-800 font-bold';
                    dotColor = 'bg-yellow-600';
                  } else if (resMatch.status === 'Bloqueado') {
                    dayBg = 'bg-red-100 text-red-800 font-bold';
                    dotColor = 'bg-red-600';
                  }
                }

                return (
                  <button
                    key={dayNum}
                    onClick={() => setActiveTab('calendario')}
                    className={`h-7 w-full rounded-lg text-xs flex flex-col items-center justify-center relative transition-all ${dayBg} ${
                      isToday ? 'ring-2 ring-blue-600 font-bold' : ''
                    }`}
                  >
                    <span>{dayNum}</span>
                    {dotColor && <span className={`w-1 h-1 rounded-full ${dotColor} absolute bottom-0.5`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('calendario')}
            className="w-full mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 group transition-colors"
          >
            <span>Abrir Calendário Interativo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Footer Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white">Ações Rápidas de Locação</h4>
          <p className="text-xs text-slate-400">
            Cadastre novas reservas, bloqueie datas para reforma ou emita relatórios instantâneos.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenNewBlock}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span>Novo Bloqueio</span>
          </button>

          <button
            onClick={onOpenNewReservation}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Reserva</span>
          </button>
        </div>
      </div>
    </div>
  );
};
