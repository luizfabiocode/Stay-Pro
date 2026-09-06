import React, { useState } from 'react';
import { Building2, X, Plus, DollarSign, MapPin, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface NewPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPropertyModal: React.FC<NewPropertyModalProps> = ({ isOpen, onClose }) => {
  const { createProperty } = useAuth();
  const { success, error } = useToast();

  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [diariaPadrao, setDiariaPadrao] = useState(500);
  const [taxaLimpeza, setTaxaLimpeza] = useState(150);
  const [periodoMinimo, setPeriodoMinimo] = useState(2);
  const [gapLimpeza, setGapLimpeza] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    try {
      await createProperty({
        nome: nome.trim(),
        endereco: endereco.trim(),
        descricao: descricao.trim(),
        telefone: telefone.trim(),
        telefoneContato: telefone.trim(),
        diariaPadrao: Number(diariaPadrao) || 500,
        taxaLimpeza: Number(taxaLimpeza) || 150,
        periodoMinimo: Number(periodoMinimo) || 2,
        gapLimpeza: Number(gapLimpeza) || 1,
        checkInHorario: '14:00',
        checkOutHorario: '11:00',
      });
      setNome('');
      setEndereco('');
      setDescricao('');
      setTelefone('');
      onClose();
    } catch (err: any) {
      // toast already shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cadastrar Novo Imóvel</h2>
              <p className="text-xs text-slate-500">Gerencie múltiplos imóveis de forma 100% isolada e gratuita.</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Imóvel / Casa / Apto *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Chalé Suíço das Montanhas ou Flat Beira-Mar 402"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Endereço / Localização
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Av. Atlântica, 1500 - Guarujá, SP"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Diária Padrão (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={diariaPadrao}
                onChange={(e) => setDiariaPadrao(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxa de Limpeza (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={taxaLimpeza}
                onChange={(e) => setTaxaLimpeza(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mínimo de Noites
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={periodoMinimo}
                onChange={(e) => setPeriodoMinimo(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gap de Limpeza (Dias)
              </label>
              <select
                value={gapLimpeza}
                onChange={(e) => setGapLimpeza(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value={0}>Sem gap (0 dias)</option>
                <option value={1}>1 dia de intervalo</option>
                <option value={2}>2 dias de intervalo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp / Telefone de Contato
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 98765-4321"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Cadastrando...' : 'Cadastrar Imóvel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
