import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Ban,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Phone,
  Mail,
  DollarSign,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Reserva } from '../types';
import { reservationsApi } from '../services/api';
import { formatCurrency, formatDateBR, getStatusColor } from '../utils/security';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface CalendarViewProps {
  onOpenNewReservation: (preselectedDate?: string) => void;
  onOpenNewBlock: (preselectedDate?: string) => void;
  onEditReservation: (reserva: Reserva) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenNewReservation,
  onOpenNewBlock,
  onEditReservation,
}) => {
  const { propriedade } = useAuth();
  const { success, error } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const res = await reservationsApi.list({ mes: monthStr, limit: 100 });
      setReservations(res.reservas);
    } catch (err) {
      console.error('Error fetching calendar reservations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Days array
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to find matching reservation for a date
  const getDayDetails = (dayNumber: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const dayDate = new Date(year, month, dayNumber);

    // Active reservation that covers this date
    const activeRes = reservations.find((r) => {
      if (r.status === 'Cancelado') return false;
      const inD = new Date(r.checkIn);
      const outD = new Date(r.checkOut);
      return dayStr >= r.checkIn && dayStr < r.checkOut;
    });

    // Is it a check-in day?
    const isCheckInDay = reservations.find((r) => r.status !== 'Cancelado' && r.checkIn === dayStr);

    // Is it a check-out day?
    const isCheckOutDay = reservations.find((r) => r.status !== 'Cancelado' && r.checkOut === dayStr);

    // Is it a cleaning gap day? (1 day after checkout if configured)
    let isCleaningGap = false;
    if (propriedade?.gapLimpeza && propriedade.gapLimpeza > 0) {
      const yesterday = new Date(year, month, dayNumber - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const prevCheckOut = reservations.find((r) => r.status !== 'Cancelado' && r.checkOut === yesterdayStr);
      if (prevCheckOut && !activeRes && !isCheckInDay) {
        isCleaningGap = true;
      }
    }

    return {
      dayStr,
      activeRes,
      isCheckInDay,
      isCheckOutDay,
      isCleaningGap,
    };
  };

  const handleDayClick = (dayNumber: number) => {
    const { dayStr, activeRes, isCheckInDay } = getDayDetails(dayNumber);

    if (activeRes) {
      setSelectedReserva(activeRes);
    } else if (isCheckInDay) {
      setSelectedReserva(isCheckInDay);
    } else {
      // Empty day: open new reservation modal with pre-selected check-in date
      onOpenNewReservation(dayStr);
    }
  };

  const handleQuickStatusChange = async (reservaId: string, newStatus: string) => {
    try {
      await reservationsApi.update(reservaId, { status: newStatus as any });
      success('Status atualizado!', `Reserva alterada para ${newStatus}.`);
      setSelectedReserva(null);
      fetchReservations();
    } catch (err: any) {
      error('Erro ao atualizar status', err.message);
    }
  };

  const handleQuickDepositConfirm = async (reserva: Reserva) => {
    try {
      await reservationsApi.update(reserva.id, {
        sinalPago: true,
        valorSinal: reserva.valorTotal * 0.5,
        status: 'Confirmado',
        dataSinal: new Date().toISOString().split('T')[0],
      });
      success('Sinal confirmado!', 'A reserva agora está confirmada.');
      setSelectedReserva(null);
      fetchReservations();
    } catch (err: any) {
      error('Erro ao confirmar sinal', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
                {monthNames[month]} de {year}
              </h2>
              <p className="text-xs text-slate-500">
                Período mínimo: {propriedade?.periodoMinimo || 2} noites • Gap de limpeza: {propriedade?.gapLimpeza || 1} dia
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Mês Atual
            </button>

            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onOpenNewBlock()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Ban className="w-3.5 h-3.5 text-rose-500" />
              <span>Bloquear</span>
            </button>

            <button
              onClick={() => onOpenNewReservation()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Reserva</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 pt-3.5 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Confirmado / Check-in</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span>Pendente de Sinal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Bloqueado (Manutenção)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>Higienização</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
            <span>Disponível</span>
          </div>
        </div>
      </div>

      {/* Monthly Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100">
          {/* Blank start offsets */}
          {Array.from({ length: firstDayWeekIndex }).map((_, idx) => (
            <div key={`blank-${idx}`} className="bg-slate-50 min-h-[90px] sm:min-h-[110px] p-2" />
          ))}

          {/* Actual days */}
          {days.map((dayNum) => {
            const { dayStr, activeRes, isCheckInDay, isCheckOutDay, isCleaningGap } = getDayDetails(dayNum);
            const isToday =
              new Date().toISOString().split('T')[0] === dayStr;

            let cellBg = 'bg-white hover:bg-slate-50';
            let statusBadge = null;

            if (activeRes) {
              if (activeRes.status === 'Confirmado' || activeRes.status === 'Check-in' || activeRes.status === 'Check-out') {
                cellBg = 'bg-green-50/90 text-green-950';
                statusBadge = (
                  <div className="mt-1 p-1 sm:p-1.5 rounded-md bg-green-600 text-white text-[10px] font-bold shadow-2xs truncate">
                    {activeRes.codigo} • {activeRes.hospede.split(' ')[0]}
                  </div>
                );
              } else if (activeRes.status === 'Pendente') {
                cellBg = 'bg-yellow-50/90 text-yellow-950';
                statusBadge = (
                  <div className="mt-1 p-1 sm:p-1.5 rounded-md bg-yellow-500 text-white text-[10px] font-bold shadow-2xs truncate">
                    {activeRes.codigo} • {activeRes.hospede.split(' ')[0]} (Pendente)
                  </div>
                );
              } else if (activeRes.status === 'Bloqueado') {
                cellBg = 'bg-red-50/90 text-red-950';
                statusBadge = (
                  <div className="mt-1 p-1 sm:p-1.5 rounded-md bg-red-600 text-white text-[10px] font-bold shadow-2xs truncate">
                    Bloqueado
                  </div>
                );
              }
            } else if (isCleaningGap) {
              cellBg = 'bg-slate-100 text-slate-600';
              statusBadge = (
                <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-300 text-slate-800 text-[9px] font-semibold truncate">
                  Higienização
                </div>
              );
            }

            return (
              <div
                key={dayNum}
                onClick={() => handleDayClick(dayNum)}
                className={`min-h-[90px] sm:min-h-[110px] p-2 transition-all cursor-pointer flex flex-col justify-between group select-none relative ${cellBg} ${
                  isToday ? 'ring-2 ring-inset ring-blue-600 font-bold' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-semibold rounded px-1.5 py-0.5 ${
                      isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isCheckInDay && !activeRes && (
                    <span className="text-[9px] font-bold px-1 rounded bg-green-100 text-green-800">
                      Entrada
                    </span>
                  )}
                  {isCheckOutDay && !activeRes && (
                    <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800">
                      Saída
                    </span>
                  )}
                </div>

                {statusBadge}

                {/* Hover prompt for empty days */}
                {!activeRes && !isCleaningGap && (
                  <div className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 transition-opacity">
                    <Plus className="w-3 h-3" />
                    <span>Reservar</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reservation Details Drawer/Modal */}
      {selectedReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">{selectedReserva.codigo}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                      selectedReserva.status === 'Confirmado'
                        ? 'bg-green-100 text-green-700'
                        : selectedReserva.status === 'Pendente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : selectedReserva.status === 'Bloqueado'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {selectedReserva.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedReserva.hospede}</h3>
              </div>
              <button
                onClick={() => setSelectedReserva(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Check-in</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatDateBR(selectedReserva.checkIn)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Check-out</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatDateBR(selectedReserva.checkOut)}</p>
                </div>
              </div>

              {selectedReserva.status !== 'Bloqueado' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{selectedReserva.telefone || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedReserva.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <div>
                      <span className="text-xs text-blue-800 font-medium">Valor Total</span>
                      <p className="text-base font-bold text-blue-950">
                        {formatCurrency(selectedReserva.valorTotal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-600 font-medium">
                        {selectedReserva.sinalPago ? `Sinal: ${formatCurrency(selectedReserva.valorSinal)}` : 'Sem Sinal'}
                      </span>
                      <p className="text-xs font-bold text-slate-800">
                        Saldo: {formatCurrency(selectedReserva.saldoRestante)}
                      </p>
                    </div>
                  </div>

                  {selectedReserva.observacoes && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600">
                      <span className="font-bold text-slate-700 block mb-0.5">Observações:</span>
                      {selectedReserva.observacoes}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-900">
                  <span className="font-bold block mb-1">Motivo do Bloqueio:</span>
                  <p>{selectedReserva.motivoBloqueio || 'Manutenção ou indisponibilidade de datas.'}</p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              {selectedReserva.status === 'Pendente' && !selectedReserva.sinalPago && (
                <button
                  onClick={() => handleQuickDepositConfirm(selectedReserva)}
                  className="px-3.5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                >
                  Confirmar Sinal (50%)
                </button>
              )}

              {selectedReserva.status === 'Confirmado' && (
                <button
                  onClick={() => handleQuickStatusChange(selectedReserva.id, 'Check-in')}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                >
                  Realizar Check-in
                </button>
              )}

              {selectedReserva.status === 'Check-in' && (
                <button
                  onClick={() => handleQuickStatusChange(selectedReserva.id, 'Check-out')}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                >
                  Realizar Check-out (Liberar Datas)
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => {
                    const r = selectedReserva;
                    setSelectedReserva(null);
                    onEditReservation(r);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
