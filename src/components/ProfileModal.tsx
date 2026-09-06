import React, { useState } from 'react';
import { X, User, Mail, Phone, Shield, Building2, Key, Sparkles, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { maskCPF } from '../utils/security';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, propriedade } = useAuth();
  const [showFullCpf, setShowFullCpf] = useState(false);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{user.name}</h2>
              <p className="text-xs text-slate-500 capitalize">{user.role} • {user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-xs sm:text-sm">
          {/* Property Info */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-bold text-slate-900">{propriedade?.nome || 'Minha Propriedade'}</p>
                <p className="text-[11px] text-slate-500">{propriedade?.endereco || 'Endereço não configurado'}</p>
              </div>
            </div>
          </div>

          {/* Account Status / Access Box */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                  Licença Stay Pro
                </span>
                <p className="font-bold text-blue-950">100% Gratuito • Reservas e Usuários Ilimitados</p>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-500">Telefone</span>
              <span className="font-semibold text-slate-800">{user.phone || 'Não informado'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
              <span className="text-slate-500">Status da Conta</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo & Confirmado
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>CPF (Criptografado AES-256)</span>
              </div>
              <span className="font-mono text-slate-700 font-medium">
                {user.cpf || user.cpfDecrypted ? '•••.•••.•••-•• (Seguro)' : 'Não cadastrado'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
