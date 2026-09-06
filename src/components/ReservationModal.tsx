import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Users,
  CreditCard,
  FileText,
  Calculator,
  Shield,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Reserva, ReservationStatus, PaymentMethod } from '../types';
import { reservationsApi } from '../services/api';
import { formatCPF, formatPhone, calculateNights, formatCurrency } from '../utils/security';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservaToEdit?: Reserva | null;
  preselectedCheckIn?: string;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reservaToEdit,
  preselectedCheckIn,
}) => {
  const { propriedade } = useAuth();
  const { success, error } = useToast();

  const [hospede, setHospede] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [qtdPessoas, setQtdPessoas] = useState(2);
  const [cpf, setCpf] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [sinalPago, setSinalPago] = useState(false);
  const [valorSinal, setValorSinal] = useState<number>(0);
  const [dataSinal, setDataSinal] = useState('');
  const [dataSaldo, setDataSaldo] = useState('');
  const [formaPagamentoSinal, setFormaPagamentoSinal] = useState<PaymentMethod>('PIX');
  const [formaPagamentoSaldo, setFormaPagamentoSaldo] = useState<PaymentMethod>('PIX');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('PIX');
  const [status, setStatus] = useState<ReservationStatus>('Confirmado');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reservaToEdit) {
      setHospede(reservaToEdit.hospede || '');
      setTelefone(reservaToEdit.telefone || '');
      setEmail(reservaToEdit.email || '');
      setQtdPessoas(reservaToEdit.qtdPessoas || 2);
      setCpf(reservaToEdit.cpfDecrypted || '');
      setCheckIn(reservaToEdit.checkIn || '');
      setCheckOut(reservaToEdit.checkOut || '');
      setValorTotal(reservaToEdit.valorTotal || 0);
      setSinalPago(Boolean(reservaToEdit.sinalPago));
      setValorSinal(reservaToEdit.valorSinal || 0);
      setDataSinal(reservaToEdit.dataSinal || '');
      setDataSaldo(reservaToEdit.dataSaldo || '');
      setFormaPagamentoSinal(reservaToEdit.formaPagamentoSinal || 'PIX');
      setFormaPagamentoSaldo(reservaToEdit.formaPagamentoSaldo || 'PIX');
      setFormaPagamento(reservaToEdit.formaPagamento || 'PIX');
      setStatus(reservaToEdit.status || 'Confirmado');
      setObservacoes(reservaToEdit.observacoes || '');
    } else {
      // Default new reservation
      const today = new Date();
      const inDate = preselectedCheckIn || today.toISOString().split('T')[0];
      const outD = new Date(inDate);
      outD.setDate(outD.getDate() + (propriedade?.periodoMinimo || 2));
      const outDate = outD.toISOString().split('T')[0];

      setHospede('');
      setTelefone('');
      setEmail('');
      setQtdPessoas(2);
      setCpf('');
      setCheckIn(inDate);
      setCheckOut(outDate);
      setStatus('Confirmado');
      setSinalPago(true);
      setDataSinal(inDate);
      setDataSaldo(outDate);
      setFormaPagamento('PIX');
      setFormaPagamentoSinal('PIX');
      setFormaPagamentoSaldo('PIX');
      setObservacoes('');

      // Auto-calculate standard pricing
      const nights = calculateNights(inDate, outDate);
      const standardRate = propriedade?.diariaPadrao || 600;
      const cleaning = propriedade?.taxaLimpeza || 150;
      const total = nights * standardRate + cleaning;
      setValorTotal(total);
      setValorSinal(total * 0.5); // 50% deposit standard
    }
  }, [reservaToEdit, preselectedCheckIn, propriedade, isOpen]);

  if (!isOpen) return null;

  // Auto-calculated fields
  const nights = calculateNights(checkIn, checkOut);
  const saldoRestante = Math.max(0, valorTotal - (sinalPago ? valorSinal : 0));

  const handleRecalculateStandardRate = () => {
    const standardRate = propriedade?.diariaPadrao || 600;
    const cleaning = propriedade?.taxaLimpeza || 150;
    const calculatedTotal = nights * standardRate + cleaning;
    setValorTotal(calculatedTotal);
    if (sinalPago) {
      setValorSinal(calculatedTotal * 0.5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospede || !telefone || !email || !checkIn || !checkOut) {
      error('Campos obrigatórios', 'Por favor, preencha todos os campos sinalizados com (*).');
      return;
    }

    if (nights < (propriedade?.periodoMinimo || 2)) {
      error('Período mínimo', `Este imóvel requer no mínimo ${propriedade?.periodoMinimo || 2} noites.`);
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<Reserva> = {
        hospede,
        telefone,
        email,
        qtdPessoas: Number(qtdPessoas),
        cpf,
        checkIn,
        checkOut,
        valorTotal: Number(valorTotal),
        sinalPago,
        valorSinal: sinalPago ? Number(valorSinal) : 0,
        saldoRestante,
        dataSinal: sinalPago ? dataSinal : undefined,
        dataSaldo: saldoRestante > 0 ? dataSaldo : undefined,
        formaPagamentoSinal,
        formaPagamentoSaldo,
        formaPagamento,
        status,
        observacoes,
      };

      if (reservaToEdit) {
        await reservationsApi.update(reservaToEdit.id, payload);
        success('Reserva atualizada!', `A reserva de ${hospede} foi atualizada com sucesso.`);
      } else {
        await reservationsApi.create(payload);
        success('Reserva criada!', `Nova reserva de ${hospede} registrada com sucesso.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving reservation', err);
      error('Erro ao salvar reserva', err.message || 'Ocorreu um erro ao processar a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {reservaToEdit ? `Editar Reserva ${reservaToEdit.codigo}` : 'Nova Reserva de Locação'}
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os dados do hóspede, período de estadia e controle financeiro.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Section 1: Hóspede */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              1. Dados do Hóspede
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Hóspede *
                </label>
                <input
                  type="text"
                  required
                  value={hospede}
                  onChange={(e) => setHospede(e.target.value)}
                  placeholder="Ex: Roberto Almeida"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Hóspede *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hospede@email.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade de Pessoas *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={qtdPessoas}
                  onChange={(e) => setQtdPessoas(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>CPF do Hóspede (opcional)</span>
                  <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
                    <Shield className="w-3 h-3" /> Criptografia AES-256
                  </span>
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Datas & Período */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                2. Período da Estadia
              </h3>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {nights} {nights === 1 ? 'noite' : 'noites'} selecionadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Check-in *
                </label>
                <input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Check-out *
                </label>
                <input
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financeiro & Sinal */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                3. Valores & Condições de Pagamento
              </h3>
              <button
                type="button"
                onClick={handleRecalculateStandardRate}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                title="Calcular diárias padrão + taxa de limpeza automaticamente"
              >
                <Calculator className="w-3 h-3" />
                <span>Aplicar Diária Padrão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Total da Reserva (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={valorTotal}
                  onChange={(e) => setValorTotal(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Reserva *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Confirmado">Confirmado</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Check-in">Check-in</option>
                  <option value="Check-out">Check-out</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="PIX">PIX</option>
                  <option value="Transferência">Transferência TED/DOC</option>
                  <option value="Dinheiro">Dinheiro Espécie</option>
                  <option value="Cartão">Cartão de Crédito</option>
                </select>
              </div>
            </div>

            {/* Sinal / Deposit Checkbox */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sinalPago}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSinalPago(checked);
                    if (checked && valorSinal === 0) {
                      setValorSinal(valorTotal * 0.5);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Sinal Pago / Entrada Confirmada
                </span>
              </label>

              {sinalPago && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor do Sinal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={valorSinal}
                      onChange={(e) => setValorSinal(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data do Pagamento do Sinal
                    </label>
                    <input
                      type="date"
                      value={dataSinal}
                      onChange={(e) => setDataSinal(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Automatic Remaining Balance Preview */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs sm:text-sm">
                <span className="font-semibold text-slate-600">Saldo Restante Calculado:</span>
                <span
                  className={`font-extrabold ${
                    saldoRestante === 0 ? 'text-blue-600' : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(saldoRestante)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Observações */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700">
              Observações Gerais (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Hóspede solicitou berço, chegada antecipada combinada às 12h..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Submit Actions */}
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
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
            >
              {loading ? 'Salvando...' : reservaToEdit ? 'Salvar Alterações' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
