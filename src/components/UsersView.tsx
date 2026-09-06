import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  Shield,
  Mail,
  Copy,
  Clock,
  ExternalLink,
  Crown,
  Lock,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { User } from '../types';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface UsersViewProps {}

export const UsersView: React.FC<UsersViewProps> = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'colaborador'>('colaborador');
  const [inviting, setInviting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{ link: string; tempPass: string } | null>(null);

  // Remove confirmation
  const [userToRemove, setUserToRemove] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsersList(data.usuarios);
    } catch (err: any) {
      error('Erro ao carregar usuários', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const currentTotalUsers = usersList.length;

  const handleOpenInvite = () => {
    setGeneratedInvite(null);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('colaborador');
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    setInviting(true);
    try {
      const res = await usersApi.invite({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });

      success('Convite gerado!', `O convite para ${inviteName} foi gerado com sucesso.`);
      setGeneratedInvite({
        link: res.inviteLink,
        tempPass: res.temporaryPassword,
      });
      fetchUsers();
    } catch (err: any) {
      error('Erro ao convidar', err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    try {
      await usersApi.remove(userToRemove.id);
      success('Usuário removido', `O acesso de ${userToRemove.name} foi revogado.`);
      setUserToRemove(null);
      fetchUsers();
    } catch (err: any) {
      error('Erro ao remover usuário', err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    info('Copiado!', 'Link temporário copiado para a área de transferência.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Equipe & Gestão de Acessos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie administradores e colaboradores com permissões controladas por perfil.
          </p>
        </div>

        <button
          onClick={handleOpenInvite}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Convidar Colaborador</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Membros da Equipe</h3>
            <p className="text-xs text-slate-500">
              {currentTotalUsers} {currentTotalUsers === 1 ? 'usuário cadastrado' : 'usuários cadastrados'} • Acesso Ilimitado
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3.5">Nome / Email</th>
                <th className="px-4 py-3.5">Perfil de Acesso</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Data de Cadastro</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Carregando membros...
                  </td>
                </tr>
              ) : (
                usersList.map((u) => {
                  const isOwner = u.role === 'admin' && u.id === user?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <Crown className="w-3 h-3 text-blue-600" /> Administrador (Dono)
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 text-slate-600" /> Colaborador
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            u.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {u.status === 'ativo' ? 'Ativo' : 'Pendente de Confirmação'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isOwner ? (
                          <span className="text-[11px] text-slate-400 italic">Você (Dono)</span>
                        ) : (
                          <button
                            onClick={() => setUserToRemove(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover Acesso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Convidar Colaborador</h2>
                  <p className="text-xs text-slate-500">Envie um link temporário de 24 horas para acesso.</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedInvite ? (
              <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail do Colaborador *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="carlos@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nível de Permissão
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="colaborador">Colaborador (Visualiza, cria e edita reservas)</option>
                    <option value="admin">Administrador (Acesso total)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs"
                  >
                    {inviting ? 'Gerando...' : 'Gerar Convite (24h)'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-bold text-blue-900">
                    Convite criado para {inviteName}!
                  </p>
                  <p className="text-xs text-blue-800 mt-1">
                    Compartilhe o link temporário ou informe a senha provisória:
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link de Ativação Temporário (Válido por 24 horas)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.link}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInvite.link)}
                      className="p-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                      title="Copiar Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Senha Provisória Gerada
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.tempPass}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInvite.tempPass)}
                      className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0"
                      title="Copiar Senha"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove User Modal */}
      {userToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900">Revogar Acesso</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Tem certeza que deseja revogar o acesso de <strong>{userToRemove.name}</strong> ({userToRemove.email})?
              O colaborador não poderá mais acessar as informações do imóvel.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveUser}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Sim, Revogar Acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
