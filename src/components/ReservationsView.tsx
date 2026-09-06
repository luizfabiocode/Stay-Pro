import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Ban,
  Download,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  User,
  Phone,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Reserva, ReservationStatus } from '../types';
import { reservationsApi } from '../services/api';
import { formatCurrency, formatDateBR, getStatusColor, maskCPF } from '../utils/security';
import { exportReservationsToCSV } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';

interface ReservationsViewProps {
  onOpenNewReservation: () => void;
  onOpenNewBlock: () => void;
  onEditReservation: (reserva: Reserva) => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({
  onOpenNewReservation,
  onOpenNewBlock,
  onEditReservation,
}) => {
  const { success, error } = useToast();

  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [monthFilter, setMonthFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Delete modal confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Reserva | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await reservationsApi.list({
        q: search,
        status: statusFilter,
        mes: monthFilter,
        page,
        limit,
      });
      setReservations(data.reservas);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('Error fetching reservations', err);
      error('Erro ao carregar reservas', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page, statusFilter, monthFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchReservations();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await reservationsApi.delete(deleteTarget.id);
      success('Reserva excluída', `A reserva ${deleteTarget.codigo} foi excluída com sucesso.`);
      setDeleteTarget(null);
      fetchReservations();
    } catch (err: any) {
      error('Erro ao excluir', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const allData = await reservationsApi.list({ limit: 1000 });
      exportReservationsToCSV(allData.reservas, `stay_pro_reservas_${new Date().toISOString().split('T')[0]}.csv`);
      success('CSV Exportado', 'O arquivo de reservas foi baixado com sucesso.');
    } catch (err: any) {
      error('Erro ao exportar CSV', err.message);
    }
  };

  const statusOptions = ['Todos', 'Confirmado', 'Pendente', 'Check-in', 'Check-out', 'Cancelado', 'Bloqueado'];

  return (
    <div className="space-y-6">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Gerenciamento de Reservas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {total} {total === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewBlock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Novo Bloqueio</span>
          </button>

          <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Reserva</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por hóspede, telefone, email ou código (#1001)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
          >
            {statusOptions.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
          />
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Hóspede</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Sinal / Saldo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando reservas...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Nenhuma reserva encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => {
                  const isBlocked = res.status === 'Bloqueado';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{res.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{res.hospede}</div>
                        {res.email && <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{res.email}</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {res.telefone || '---'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {formatDateBR(res.checkIn)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {formatDateBR(res.checkOut)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                        {isBlocked ? '---' : formatCurrency(res.valorTotal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isBlocked ? (
                          <span className="text-slate-400">---</span>
                        ) : res.sinalPago ? (
                          <div>
                            <span className="text-xs font-semibold text-green-700">
                              Sinal: {formatCurrency(res.valorSinal)}
                            </span>
                            {res.saldoRestante > 0 ? (
                              <div className="text-[11px] text-yellow-700 font-medium">
                                Resta: {formatCurrency(res.saldoRestante)}
                              </div>
                            ) : (
                              <div className="text-[11px] text-green-600 font-medium">Quitado</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-rose-600">Não pago</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditReservation(res)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Editar Reserva"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(res)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Excluir Reserva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Mostrando página <span className="font-bold text-slate-900">{page}</span> de{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({total} reservas)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir a reserva{' '}
              <strong className="text-slate-900">{deleteTarget.codigo} ({deleteTarget.hospede})</strong>?
              Esta ação é permanente e será registrada nos logs de auditoria.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
