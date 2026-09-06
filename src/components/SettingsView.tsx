import React, { useState, useEffect } from 'react';
import {
  Building,
  DollarSign,
  ShieldCheck,
  FileText,
  Clock,
  MapPin,
  Phone,
  Save,
  CheckCircle2,
  Sparkles,
  Lock,
  Eye,
  AlertCircle,
  Database,
  Key,
  Smartphone,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Radio,
  Send,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { Propriedade, AuditLog, SecurityAlert, BackupItem } from '../types';
import { propertyApi, logsApi, securityApi } from '../services/api';
import { formatCurrency, formatDateBR, maskCPF, maskEmail } from '../utils/security';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsView: React.FC = () => {
  const { user, propriedade, updateLocalProperty, refreshProfile } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<
    'imovel' | 'precos' | 'regras' | 'seguranca' | 'auditoria' | 'backups' | 'lgpd' | 'webhooks'
  >('imovel');
  const [loading, setLoading] = useState(false);

  // Form states - Property
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [telefone, setTelefone] = useState('');

  const [diariaPadrao, setDiariaPadrao] = useState<number>(600);
  const [taxaLimpeza, setTaxaLimpeza] = useState<number>(150);
  const [periodoMinimo, setPeriodoMinimo] = useState<number>(2);
  const [gapLimpeza, setGapLimpeza] = useState<number>(1);

  const [checkInHorario, setCheckInHorario] = useState('14:00');
  const [checkOutHorario, setCheckOutHorario] = useState('11:00');
  const [regrasTexto, setRegrasTexto] = useState('');

  // 2FA states
  const [twoFactorConfig, setTwoFactorConfig] = useState<{
    secret: string;
    qrCodeUri: string;
    backupCodes: string[];
  } | null>(null);
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Logs & Alerts states
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [actionFilter, setActionFilter] = useState('Todos');
  const [riskFilter, setRiskFilter] = useState('Todos');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Backups states
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookHighRiskOnly, setWebhookHighRiskOnly] = useState(true);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // LGPD Anonymization Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (propriedade) {
      setNome(propriedade.nome || '');
      setEndereco(propriedade.endereco || '');
      setDescricao(propriedade.descricao || '');
      setTelefone(propriedade.telefone || propriedade.telefoneContato || '');

      setDiariaPadrao(propriedade.diariaPadrao || 600);
      setTaxaLimpeza(propriedade.taxaLimpeza || 150);
      setPeriodoMinimo(propriedade.periodoMinimo || 2);
      setGapLimpeza(propriedade.gapLimpeza ?? 1);

      setCheckInHorario(propriedade.checkInHorario || '14:00');
      setCheckOutHorario(propriedade.checkOutHorario || '11:00');
      const regras = Array.isArray(propriedade.regrasCasa)
        ? propriedade.regrasCasa.join('\n')
        : propriedade.regrasCasa ||
          'Proibido som alto após as 22h.\nNão são permitidas festas sem autorização prévia.\nPets de pequeno porte permitidos sob consulta prévia.';
      setRegrasTexto(regras);
    }
  }, [propriedade]);

  useEffect(() => {
    if (activeTab === 'auditoria') {
      fetchLogs();
    } else if (activeTab === 'backups') {
      fetchBackups();
    } else if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab, actionFilter, riskFilter]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await logsApi.list({ action: actionFilter, risk: riskFilter });
      setLogs(data);
      const alerts = await securityApi.getSecurityAlerts();
      setSecurityAlerts(alerts);
    } catch (err: any) {
      error('Erro ao carregar logs', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const data = await securityApi.getBackups();
      setBackups(data);
    } catch (err: any) {
      error('Erro ao listar backups', err.message);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const data = await securityApi.getWebhookConfig();
      setWebhookUrl(data.webhookUrl || '');
      setWebhookEnabled(data.enabled || false);
      setWebhookHighRiskOnly(data.highRiskOnly ?? true);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<Propriedade> = {
        nome,
        endereco,
        descricao,
        telefone,
        telefoneContato: telefone,
        diariaPadrao: Number(diariaPadrao),
        taxaLimpeza: Number(taxaLimpeza),
        periodoMinimo: Number(periodoMinimo),
        gapLimpeza: Number(gapLimpeza),
        checkInHorario,
        checkOutHorario,
        regrasCasa: regrasTexto,
      };

      const res = await propertyApi.update(payload);
      updateLocalProperty(res.propriedade);
      success('Configurações salvas!', 'Os dados do imóvel e regras foram atualizados com sucesso.');
    } catch (err: any) {
      error('Erro ao salvar', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2FA Actions
  const handleStart2FA = async () => {
    try {
      const res = await securityApi.generate2FA();
      setTwoFactorConfig(res);
      info('Chave 2FA Gerada', 'Escaneie o QR Code ou insira a chave no Google Authenticator.');
    } catch (err: any) {
      error('Erro ao gerar 2FA', err.message);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorVerifyCode || twoFactorVerifyCode.length !== 6) {
      error('Código Inválido', 'Digite o código de 6 dígitos gerado pelo aplicativo.');
      return;
    }

    try {
      await securityApi.verify2FA(twoFactorVerifyCode);
      success('2FA Ativado!', 'Sua conta agora está protegida com autenticação em duas etapas.');
      setTwoFactorConfig(null);
      setTwoFactorVerifyCode('');
      await refreshProfile();
    } catch (err: any) {
      error('Falha na Validação', err.message);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Digite o código atual de 6 dígitos do autenticador ou um código de backup para confirmar o cancelamento do 2FA:');
    if (!code) return;

    try {
      await securityApi.disable2FA(code);
      success('2FA Desativado', 'A autenticação em 2 etapas foi desativada da sua conta.');
      await refreshProfile();
    } catch (err: any) {
      error('Erro ao desativar', err.message);
    }
  };

  // Backup Actions
  const handleCreateBackup = async () => {
    setLoadingBackups(true);
    try {
      const res = await securityApi.createBackup();
      success('Backup Gerado!', `Snapshot criado com sucesso. Hash SHA-256 verificado.`);
      fetchBackups();
    } catch (err: any) {
      error('Erro ao criar backup', err.message);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async (id: string, name: string) => {
    if (!confirm(`ATENÇÃO: Deseja restaurar o banco de dados para o snapshot "${name}"? Os dados atuais serão substituídos pelo estado do backup.`)) {
      return;
    }

    try {
      await securityApi.restoreBackup(id);
      success('Backup Restaurado!', 'O banco de dados foi sincronizado com o snapshot selecionado.');
      await refreshProfile();
      fetchBackups();
    } catch (err: any) {
      error('Erro na restauração', err.message);
    }
  };

  // Webhook Actions
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await securityApi.saveWebhookConfig({
        webhookUrl,
        enabled: webhookEnabled,
        highRiskOnly: webhookHighRiskOnly,
      });
      success('Webhooks Salvos', 'Configurações de integração SIEM/Webhook atualizadas.');
    } catch (err: any) {
      error('Erro ao salvar', err.message);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      error('URL Necessária', 'Informe a URL do webhook antes de testar.');
      return;
    }

    setTestingWebhook(true);
    try {
      await securityApi.testWebhook(webhookUrl);
      success('Conexão Estabelecida!', 'Mensagem de teste recebida pelo endpoint com sucesso.');
    } catch (err: any) {
      error('Falha no Teste', err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  // LGPD Actions
  const handleExportLGPDData = async () => {
    try {
      const data = await securityApi.exportLGPDData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staypro-lgpd-export-${user?.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Dados Exportados', 'O arquivo JSON com a totalidade dos seus dados cadastrais foi baixado.');
    } catch (err: any) {
      error('Erro ao exportar', err.message);
    }
  };

  const handleAnonymizeAccount = async () => {
    if (!deleteReason) {
      error('Motivo Obrigatório', 'Por favor descreva o motivo da solicitação de anonimização.');
      return;
    }

    try {
      await securityApi.deleteAccountLGPD(deleteReason);
      success('Conta Anonimizada', 'Seus dados pessoais foram anonimizados conforme o Art. 18 da LGPD.');
      setShowDeleteModal(false);
      window.location.reload();
    } catch (err: any) {
      error('Erro na solicitação', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Configurações & Painel de Segurança Stay Pro
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Personalize as regras de locação, valores padrão, 2FA, backups, logs de auditoria e conformidade LGPD.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        {[
          { id: 'imovel', label: 'Dados do Imóvel', icon: Building },
          { id: 'precos', label: 'Preços & Diárias', icon: DollarSign },
          { id: 'regras', label: 'Regras da Casa', icon: FileText },
          { id: 'seguranca', label: 'Autenticação 2FA', icon: Smartphone },
          { id: 'auditoria', label: 'Logs & Auditoria', icon: ShieldCheck },
          { id: 'backups', label: 'Backups & DR', icon: Database },
          { id: 'webhooks', label: 'Alertas & SIEM', icon: Radio },
          { id: 'lgpd', label: 'LGPD & Privacidade', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Imóvel */}
      {activeTab === 'imovel' && (
        <form onSubmit={handleSaveProperty} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Imóvel / Casa de Temporada *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mansão Vista Mar Premium"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço Completo com CEP
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua das Palmeiras, 120 - Ubatuba, SP"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp de Contato
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição do Imóvel para Hóspedes
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva os diferenciais da acomodação (quartos, ar condicionado, piscina aquecida, churrasqueira, etc.)..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Preços & Regras de Reserva */}
      {activeTab === 'precos' && (
        <form onSubmit={handleSaveProperty} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Diária Padrão (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                required
                value={diariaPadrao}
                onChange={(e) => setDiariaPadrao(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Valor base sugerido automaticamente na calculadora de reservas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxa Única de Limpeza (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                required
                value={taxaLimpeza}
                onChange={(e) => setTaxaLimpeza(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Taxa de higienização cobrada por estadia.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Período Mínimo de Noites *
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={periodoMinimo}
                onChange={(e) => setPeriodoMinimo(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ex: 2 noites mínimas para locações de finais de semana.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gap de Limpeza após Check-out (Dias)
              </label>
              <select
                value={gapLimpeza}
                onChange={(e) => setGapLimpeza(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value={0}>Sem gap (check-in no mesmo dia)</option>
                <option value={1}>1 dia de intervalo para limpeza</option>
                <option value={2}>2 dias de intervalo para limpeza</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Destaca visualmente o dia seguinte ao check-out no calendário.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Regras de Preço'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Regras da Casa */}
      {activeTab === 'regras' && (
        <form onSubmit={handleSaveProperty} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário de Check-in Padrão
              </label>
              <input
                type="text"
                value={checkInHorario}
                onChange={(e) => setCheckInHorario(e.target.value)}
                placeholder="Ex: A partir das 14:00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário de Check-out Limite
              </label>
              <input
                type="text"
                value={checkOutHorario}
                onChange={(e) => setCheckOutHorario(e.target.value)}
                placeholder="Ex: Até as 11:00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Regras da Casa e Normas de Convivência (uma por linha)
              </label>
              <textarea
                rows={5}
                value={regrasTexto}
                onChange={(e) => setRegrasTexto(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Regras da Casa</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: 2FA & Autenticação de 2 Etapas */}
      {activeTab === 'seguranca' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${user?.twoFactorEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Autenticação em Duas Etapas (2FA / TOTP)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Adicione uma camada extra de proteção contra roubo de credenciais exigindo um código temporário de 6 dígitos gerado no Google Authenticator ou Authy.
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
              user?.twoFactorEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {user?.twoFactorEnabled ? '● Ativo e Protegido' : '○ Não Configurado'}
            </span>
          </div>

          {!user?.twoFactorEnabled && !twoFactorConfig && (
            <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Como funciona a ativação do 2FA:
              </div>
              <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                <li>Você receberá um QR Code e uma chave secreta exclusiva.</li>
                <li>Você também receberá 10 códigos de recuperação de emergência descartáveis.</li>
                <li>Qualquer tentativa de login exigirá a senha e a confirmação do código no seu celular.</li>
              </ul>
              <button
                onClick={handleStart2FA}
                className="mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Configurar 2FA Agora</span>
              </button>
            </div>
          )}

          {twoFactorConfig && !user?.twoFactorEnabled && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Passo 1: Escaneie o QR Code ou insira a chave manual
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="w-36 h-36 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-mono p-3">
                    [QR CODE TOTP]
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2">Compatível com Google Authenticator / 1Password</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chave Secreta Manual:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={twoFactorConfig.secret}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-900"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorConfig.secret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Copiar Chave"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Passo 2: Digite o código de 6 dígitos gerado:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFactorVerifyCode}
                        onChange={(e) => setTwoFactorVerifyCode(e.target.value)}
                        placeholder="000000"
                        className="w-36 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-center text-lg font-bold tracking-widest text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleVerify2FA}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                      >
                        Confirmar e Ativar 2FA
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Códigos de Recuperação de Emergência (Guarde em local seguro):
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(twoFactorConfig.backupCodes.join('\n'));
                      setCopiedBackupCodes(true);
                      setTimeout(() => setCopiedBackupCodes(false), 2000);
                    }}
                    className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    {copiedBackupCodes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar Todos
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs text-slate-800 font-bold bg-white p-3 rounded-lg border border-amber-200">
                  {twoFactorConfig.backupCodes.map((c, i) => (
                    <span key={i} className="p-1 bg-slate-50 rounded text-center">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sua conta está protegida por 2FA
                </span>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Qualquer novo acesso de um novo navegador exigirá o código TOTP.
                </p>
              </div>
              <button
                onClick={handleDisable2FA}
                className="py-2 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors"
              >
                Desativar 2FA
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Logs & Auditoria com Filtros e Níveis de Risco */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          {/* Security Alerts (if any) */}
          {securityAlerts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Alertas de Segurança e Tentativas Bloqueadas
              </div>
              <div className="space-y-2">
                {securityAlerts.slice(0, 3).map((al) => (
                  <div key={al.id} className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-rose-800 uppercase mr-2">[{al.risco}] {al.tipo}:</span>
                      <span className="text-slate-700">{al.mensagem}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">IP: {al.ip} • {new Date(al.timestamp).toLocaleString('pt-BR')}</div>
                    </div>
                    {!al.resolvido && (
                      <button
                        onClick={async () => {
                          await securityApi.resolveSecurityAlert(al.id);
                          fetchLogs();
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0"
                      >
                        Marcar Resolvido
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Registros de Auditoria & Trilha de Segurança</h3>
                <p className="text-xs text-slate-500">
                  Rastreabilidade completa de logins, criação de reservas, bloqueios, alterações de status e sessões.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="Todos">Todos os Riscos</option>
                  <option value="Baixo">Risco Baixo</option>
                  <option value="Médio">Risco Médio</option>
                  <option value="Alto">Risco Alto</option>
                </select>

                <button
                  onClick={fetchLogs}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Risco</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">IP / Dispositivo</th>
                    <th className="px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum registro de auditoria encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            {log.acao || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.risco === 'Alto'
                              ? 'bg-rose-100 text-rose-800'
                              : log.risco === 'Médio'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.risco || 'Baixo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-sans">{log.usuarioNome || log.userName || log.usuarioEmail || 'Sistema'}</td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">{log.ip}</td>
                        <td className="px-4 py-3 text-slate-600 font-sans text-xs">{log.detalhes || log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Backups & Recuperação de Desastres (DR) */}
      {activeTab === 'backups' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Gerenciamento de Backups & Disaster Recovery
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Snapshots completos do banco de dados com verificação de integridade criptográfica SHA-256 e política de retenção de 30 dias.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={loadingBackups}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 shrink-0 active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>{loadingBackups ? 'Gerando...' : 'Criar Backup Agora'}</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Tamanho</th>
                  <th className="px-4 py-3">Integridade SHA-256</th>
                  <th className="px-4 py-3">Criado Em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {loadingBackups ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Carregando snapshots de backup...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Nenhum backup gerado ainda. Clique em "Criar Backup Agora" para criar o primeiro snapshot.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{b.nomeArquivo}</td>
                      <td className="px-4 py-3 text-slate-600">{b.tamanhoFormatado}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]" title={b.checksumSha256}>
                        {b.checksumSha256 ? `${b.checksumSha256.slice(0, 16)}...` : '---'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(b.createdAt).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRestoreBackup(b.id, b.nomeArquivo)}
                          className="px-2.5 py-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors"
                        >
                          Restaurar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 7: Webhooks / SIEM Alertas */}
      {activeTab === 'webhooks' && (
        <form onSubmit={handleSaveWebhook} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Integração SIEM & Webhooks de Segurança
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Envie notificações automáticas em tempo real para seu canal do Slack, Microsoft Teams, Discord ou SIEM quando eventos de alto risco forem detectados (bloqueios por força bruta, 2FA desativado, alteração de senhas).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                URL do Webhook (HTTPS)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/... ou https://siem.empresa.com/alerts"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !webhookUrl}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingWebhook ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Habilitar notificações ativas via Webhook</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 pl-6">
                <input
                  type="checkbox"
                  checked={webhookHighRiskOnly}
                  onChange={(e) => setWebhookHighRiskOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Notificar apenas eventos de risco Alto (Recomendado para evitar ruído)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações de Webhook</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 8: LGPD & Privacidade */}
      {activeTab === 'lgpd' && (
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                O Stay Pro implementa as melhores práticas de governança, sigilo, criptografia e proteção aos direitos dos titulares de dados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1.5">
                <Key className="w-4 h-4 text-blue-600" />
                Criptografia AES-256 PBKDF2
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                CPFs e dados sensíveis de hóspedes são criptografados com chave derivada de 100.000 iterações PBKDF2 antes da gravação.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                Hash Bcrypt com Salt
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Senhas são protegidas via algoritmos unidirecionais com 10 rounds de salt.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Proteção Força Bruta & 2FA
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Limite de 5 tentativas de login por IP com bloqueio automático de 15 minutos e suporte a TOTP RFC 6238.
              </p>
            </div>
          </div>

          {/* LGPD Actions */}
          <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Painel de Direitos do Titular (Art. 18 LGPD)
            </h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportLGPDData}
                className="flex-1 py-2.5 px-4 bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Meus Dados (JSON - Portabilidade)</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="py-2.5 px-4 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Solicitar Anonimização / Exclusão de Conta</span>
              </button>
            </div>
          </div>

          {/* Privacy Policy summary */}
          <div className="border-t border-slate-100 pt-5 text-xs text-slate-600 space-y-3 leading-relaxed">
            <h4 className="font-bold text-slate-800 text-sm">Resumo da Política de Privacidade</h4>
            <p>
              1. <strong>Finalidade dos dados:</strong> Os dados de hóspedes (nome, telefone, e-mail e CPF) são coletados exclusivamente para a formalização do contrato de locação por temporada e controle de portaria/acesso.
            </p>
            <p>
              2. <strong>Compartilhamento:</strong> Nenhum dado cadastrado na plataforma Stay Pro é compartilhado com terceiros para fins de marketing ou publicidade.
            </p>
            <p>
              3. <strong>Direito dos titulares:</strong> A qualquer momento, o titular pode solicitar a portabilidade integral ou a anonimização de suas informações pessoais.
            </p>
          </div>
        </div>
      )}

      {/* Delete / Anonymize Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3.5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Solicitar Anonimização de Dados (LGPD)</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed text-left">
              Conforme o Artigo 18 da Lei Geral de Proteção de Dados, esta ação irá anonimizar irreversivelmente seu nome, e-mail, telefone, CPF e credenciais de acesso na plataforma Stay Pro.
            </p>

            <div className="mt-4 text-left">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo da Solicitação:
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Não utilizo mais a plataforma e desejo que meus dados sejam apagados..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnonymizeAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Confirmar Anonimização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
