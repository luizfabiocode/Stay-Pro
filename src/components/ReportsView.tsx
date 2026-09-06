import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Download,
  Percent,
  CreditCard,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { MonthlyReportData } from '../types';
import { reportsApi } from '../services/api';
import { formatCurrency, formatDateBR } from '../utils/security';
import { exportMonthlyReportToPDF, exportReservationsToCSV } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ReportsView: React.FC = () => {
  const { propriedade } = useAuth();
  const { success, error } = useToast();

  const now = new Date();
  const defaultMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getMonthly(selectedMonth);
      setReport(data);
    } catch (err: any) {
      error('Erro ao gerar relatório', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth]);

  const handleExportPDF = () => {
    if (!report) return;
    try {
      exportMonthlyReportToPDF(report, propriedade || undefined);
      success('PDF Gerado!', 'O relatório mensal em formato PDF foi baixado com sucesso.');
    } catch (err: any) {
      error('Erro ao exportar PDF', err.message);
    }
  };

  const handleExportCSV = () => {
    if (!report) return;
    try {
      exportReservationsToCSV(report.reservas, `relatorio_${report.mesAno}_stay_pro.csv`);
      success('CSV Gerado!', 'Os dados brutos foram exportados em formato CSV.');
    } catch (err: any) {
      error('Erro ao exportar CSV', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Relatórios e Métricas Financeiras
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe o faturamento bruto, ADR (diária média) e taxa de ocupação mensal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!report || report.reservas.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-40 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm font-medium">Calculando métricas financeiras...</p>
        </div>
      ) : report ? (
        <>
          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 1: Total Faturamento */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Faturamento Bruto
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-3 tracking-tight">
                {formatCurrency(report.faturamentoBruto)}
              </p>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>Sinal: {formatCurrency(report.faturamentoSinais)}</span>
                <span>Saldo: {formatCurrency(report.faturamentoSaldos)}</span>
              </div>
            </div>

            {/* 2: Taxa de Ocupação */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Taxa de Ocupação
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-3 tracking-tight">
                {report.taxaOcupacao}%
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {report.diasOcupados} de {report.diasTotaisMes} noites reservadas
              </p>
            </div>

            {/* 3: Diária Média (ADR) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Diária Média (ADR)
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-3 tracking-tight">
                {formatCurrency(report.mediaDiaria)}
              </p>
              <p className="text-xs text-slate-500 mt-2">Valor médio gerado por noite</p>
            </div>

            {/* 4: Total Reservas */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total de Reservas
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-3 tracking-tight">
                {report.totalReservas}
              </p>
              <p className="text-xs text-slate-500 mt-2">Contratos no período</p>
            </div>
          </div>

          {/* Breakdown & Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Formas de Pagamento Utilizadas</span>
              </h3>

              <div className="space-y-3">
                {Object.entries(report.porFormaPagamento || {}).map(([metodo, val]) => {
                  const valor = Number(val) || 0;
                  const percent = report.faturamentoBruto > 0 ? Math.round((valor / report.faturamentoBruto) * 100) : 0;
                  return (
                    <div key={metodo} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{metodo}</span>
                        <span className="text-slate-900 font-bold">
                          {formatCurrency(valor)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Distribuição de Reservas por Status</span>
              </h3>

              <div className="space-y-3">
                {Object.entries(report.porStatus || {}).map(([st, countVal]) => {
                  const qtd = Number(countVal) || 0;
                  const percent = report.totalReservas > 0 ? Math.round((qtd / report.totalReservas) * 100) : 0;
                  let barColor = 'bg-blue-600';
                  if (st === 'Confirmado') barColor = 'bg-green-500';
                  if (st === 'Pendente') barColor = 'bg-yellow-500';
                  if (st === 'Bloqueado') barColor = 'bg-red-500';
                  if (st === 'Cancelado') barColor = 'bg-slate-400';

                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{st}</span>
                        <span className="text-slate-900 font-bold">
                          {qtd} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${barColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Reservations List for the Selected Month */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                Histórico Detalhado de Reservas ({report.mesNome})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Hóspede</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Valor Bruto</th>
                    <th className="px-4 py-3">Sinal Pago</th>
                    <th className="px-4 py-3">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.reservas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                        Nenhuma reserva cadastrada para este mês.
                      </td>
                    </tr>
                  ) : (
                    report.reservas.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{r.codigo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.hospede}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateBR(r.checkIn)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateBR(r.checkOut)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              r.status === 'Confirmado'
                                ? 'bg-green-100 text-green-700'
                                : r.status === 'Pendente'
                                ? 'bg-yellow-100 text-yellow-700'
                                : r.status === 'Bloqueado'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(r.valorTotal)}</td>
                        <td className="px-4 py-3 text-green-600 font-semibold">{formatCurrency(r.valorSinal)}</td>
                        <td className="px-4 py-3 text-slate-800">{formatCurrency(r.saldoRestante)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
