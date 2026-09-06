import React, { useState, useEffect } from 'react';
import { X, Ban, Calendar, AlertCircle, Wrench } from 'lucide-react';
import { reservationsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDate?: string;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
}) => {
  const { success, error } = useToast();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [motivoBloqueio, setMotivoBloqueio] = useState('Manutenção / Reforma periódica');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    const inDate = preselectedDate || today.toISOString().split('T')[0];
    const outD = new Date(inDate);
    outD.setDate(outD.getDate() + 2);
    const outDate = outD.toISOString().split('T')[0];

    setCheckIn(inDate);
    setCheckOut(outDate);
    setMotivoBloqueio('Manutenção preventiva do imóvel');
  }, [preselectedDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkIn || !checkOut) {
      error('Datas obrigatórias', 'Informe o período de início e fim do bloqueio.');
      return;
    }

    setLoading(true);
    try {
      await reservationsApi.createBlock({
        checkIn,
        checkOut,
        motivoBloqueio,
      });

      success('Datas bloqueadas!', 'O período selecionado foi marcado como indisponível no calendário.');
      onSuccess();
      onClose();
    } catch (err: any) {
      error('Erro ao bloquear datas', err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickReasons = [
    'Manutenção preventiva do imóvel',
    'Uso próprio / Família',
    'Reforma e pintura',
    'Limpeza pesada pós-obra',
    'Vistoria técnica',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bloquear Datas no Calendário</h2>
              <p className="text-xs text-slate-500">Marque dias como indisponíveis no calendário de locação.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Inicial do Bloqueio *
              </label>
              <input
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Final do Bloqueio *
              </label>
              <input
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo do Bloqueio
            </label>
            <input
              type="text"
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              placeholder="Ex: Reforma da piscina, uso próprio..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Sugestões Rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setMotivoBloqueio(reason)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              {loading ? 'Bloqueando...' : 'Confirmar Bloqueio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
