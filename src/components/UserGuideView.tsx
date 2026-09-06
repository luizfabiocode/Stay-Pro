import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  Calendar as CalendarIcon,
  Home,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  DollarSign,
  MessageCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  Smartphone,
  FileSpreadsheet,
  Lock,
  Zap,
} from 'lucide-react';
import { ActiveTab } from './Header';

interface UserGuideViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewReservation?: () => void;
  onOpenNewBlock?: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  category: 'comecando' | 'operacao' | 'avancado';
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({
  setActiveTab,
  onOpenNewReservation,
  onOpenNewBlock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('primeiros-passos');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const sections: GuideSection[] = [
    {
      id: 'primeiros-passos',
      title: '1. Primeiros Passos',
      shortDesc: 'Cadastro, login, confirmação e segurança da conta',
      icon: Zap,
      badge: 'Início',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      category: 'comecando',
    },
    {
      id: 'dashboard',
      title: '2. Visão Geral do Dashboard',
      shortDesc: 'Cards de ocupação, faturamento e listas de check-ins',
      icon: Home,
      badge: 'Métricas',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      category: 'comecando',
    },
    {
      id: 'gerenciar-imoveis',
      title: '3. Gerenciamento de Imóveis',
      shortDesc: 'Como alternar, cadastrar e configurar múltiplos imóveis',
      icon: Building2,
      badge: 'Multi-Imóvel',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      category: 'operacao',
    },
    {
      id: 'gerenciar-reservas',
      title: '4. Gestão de Reservas & Status',
      shortDesc: 'Criar reservas, cálculos de sinal/saldo e status',
      icon: BookOpen,
      badge: 'Essencial',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      category: 'operacao',
    },
    {
      id: 'calendario-bloqueios',
      title: '5. Calendário & Bloqueio de Datas',
      shortDesc: 'Significado das cores, visão mensal e bloqueios',
      icon: CalendarIcon,
      badge: 'Visual',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      category: 'operacao',
    },
    {
      id: 'equipe-colaboradores',
      title: '6. Equipe & Permissões',
      shortDesc: 'Convidar colaboradores e definir permissões (RBAC)',
      icon: Users,
      badge: 'Equipe',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      category: 'avancado',
    },
    {
      id: 'relatorios-auditoria',
      title: '7. Relatórios, LGPD & Auditoria',
      shortDesc: 'Exportações em CSV, histórico de ações e proteção de dados',
      icon: ShieldCheck,
      badge: 'Segurança',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      category: 'avancado',
    },
    {
      id: 'faq-dicas',
      title: '8. FAQ & Dicas de Ouro',
      shortDesc: 'Perguntas frequentes e boas práticas operacionais',
      icon: HelpCircle,
      badge: 'Ajuda',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      category: 'avancado',
    },
  ];

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const term = searchTerm.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.shortDesc.toLowerCase().includes(term)
    );
  }, [sections, searchTerm]);

  const faqs = [
    {
      q: 'Existe algum limite de imóveis ou reservas no plano gratuito?',
      a: 'Não! O Stay Pro é 100% gratuito e ilimitado. Você pode cadastrar quantos imóveis, reservas, bloqueios e colaboradores desejar, sem nenhuma taxa oculta.',
    },
    {
      q: 'Como funciona o cálculo do sinal e do saldo restante?',
      a: 'Ao criar uma reserva, o sistema sugere automaticamente 50% de sinal e calcula os 50% restantes para pagamento no check-in. Você pode alterar os valores livremente conforme o acordo firmado com o hóspede.',
    },
    {
      q: 'O que é o "Gap de Limpeza"?',
      a: 'É um intervalo de segurança configurável (0, 1 ou 2 dias) entre reservas consecutivas para garantir que a equipe de limpeza tenha tempo hábil para higienizar e arrumar o imóvel antes da chegada do próximo hóspede.',
    },
    {
      q: 'Por que o sistema desconecta após 30 minutos?',
      a: 'Para garantir conformidade com a LGPD e proteger os dados confidenciais dos seus hóspedes (como CPF e contatos), o sistema encerra a sessão automaticamente após 30 minutos de inatividade.',
    },
    {
      q: 'Como enviar mensagens de confirmação pelo WhatsApp?',
      a: 'Dentro de qualquer reserva no Dashboard ou na aba Reservas, basta clicar no ícone do WhatsApp para abrir mensagens prontas de confirmação, instruções de check-in ou lembrete de saldo.',
    },
    {
      q: 'Como exportar os dados para contabilidade ou Excel?',
      a: 'Acesse a aba "Relatórios" e clique em "Exportar CSV". O arquivo gerado é compatível com Microsoft Excel, Google Sheets e softwares contábeis.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Central de Conhecimento & Manual Prático</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Guia do Usuário Stay Pro
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Aprenda a operar todas as ferramentas do sistema de ponta a ponta: gestão multi-imóvel, reservas, relatórios financeiros, automações de WhatsApp e segurança.
          </p>

          {/* Search Bar */}
          <div className="mt-5 relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no guia (ex: sinal, bloqueio, colaboradores)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout (Sidebar Navigation + Detail View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation (Index) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sticky top-20">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
              Tópicos do Guia
            </p>
            <div className="space-y-1 mt-1">
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSectionId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate">{sec.title}</p>
                        <p className="text-[10px] text-slate-400 font-normal truncate">
                          {sec.shortDesc}
                        </p>
                      </div>
                    </div>
                    {sec.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ml-2 hidden sm:inline-block ${
                          sec.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sec.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Card */}
            <div className="mt-4 pt-4 border-t border-slate-100 px-2 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Ações Rápidas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('calendario')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Calendário</span>
                </button>
                <button
                  onClick={() => setActiveTab('reservas')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>Reservas</span>
                </button>
                <button
                  onClick={() => setActiveTab('configuracoes')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Configurações</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (Detailed Guides) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: PRIMEIROS PASSOS */}
          <div
            id="primeiros-passos"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">1. Primeiros Passos</h2>
                <p className="text-xs text-slate-500">
                  Como criar sua conta, confirmar dados e navegar com total segurança.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">
                    1
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs mb-1">Criação da Conta</h3>
                  <p className="text-xs text-slate-500">
                    Acesse a aba <strong>Criar Conta</strong>, preencha seu nome, WhatsApp, e-mail, senha e informe o nome do seu primeiro imóvel.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">
                    2
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs mb-1">Ativação Automática</h3>
                  <p className="text-xs text-slate-500">
                    Sua conta de Administrador é inicializada instantaneamente junto com o imóvel cadastrado e configurações recomendadas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-2">
                    3
                  </div>
                  <h3 className="font-bold text-slate-800 text-xs mb-1">Login & Proteção</h3>
                  <p className="text-xs text-slate-500">
                    Entre com seu e-mail e senha. O sistema possui proteção contra força bruta e encerra sessões após 30 min de inatividade.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-blue-900 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Dica de Segurança:</span> Caso precise alterar sua senha ou atualizar seu telefone cadastrado, clique no seu nome no canto superior direito e selecione <strong>Meu Perfil & Segurança</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DASHBOARD */}
          <div
            id="dashboard"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">2. Visão Geral do Dashboard</h2>
                <p className="text-xs text-slate-500">
                  Entenda os indicadores financeiros, taxas de ocupação e alertas operacionais.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                O <strong>Dashboard</strong> é a central de comando do seu imóvel ativo. Todas as métricas exibidas correspondem rigorosamente ao imóvel selecionado no topo da tela.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Taxa de Ocupação no Mês</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Calcula a porcentagem de noites ocupadas por hóspedes em relação ao total de dias do mês selecionado.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Faturamento & Sinais</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Soma o valor bruto de todas as reservas confirmadas, detalhando quanto já foi pago como sinal e quanto falta receber no check-in.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Próximos Check-ins e Check-outs</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lista todas as chegadas e partidas previstas para os próximos 7 dias, permitindo planejar a recepção e a limpeza.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>Atalhos de WhatsApp</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Botões diretos ao lado de cada reserva para enviar confirmações, lembretes de chegada e avisos de saldo com um clique.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: GERENCIAMENTO DE IMÓVEIS */}
          <div
            id="gerenciar-imoveis"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">3. Como Gerenciar Múltiplos Imóveis</h2>
                <p className="text-xs text-slate-500">
                  Controle várias propriedades com dados, preços e calendários totalmente isolados.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-md bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    A
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Como alternar entre imóveis</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No topo da tela, clique no seletor de imóveis (ao lado do logotipo Stay Pro). O menu abrirá a lista com todos os seus imóveis. Ao clicar em um imóvel, <strong>todas as telas (Dashboard, Calendário, Reservas e Relatórios)</strong> atualizam instantaneamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-md bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    B
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Como cadastrar um novo imóvel</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Abra o seletor de imóveis no topo e clique em <strong>"+ Cadastrar Novo Imóvel"</strong>. Informe o nome (ex: <em>Flat Beira-Mar 402</em>), endereço, diária padrão, taxa de limpeza e tempo mínimo de estadia. O cadastro é gratuito e ilimitado!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-md bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    C
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Como configurar regras e chaves Pix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vá até a aba <strong>Configurações</strong> para ajustar o horário de check-in (ex: 14:00), horário de check-out (ex: 11:00), regras da casa e a chave Pix para cobrança de sinais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: GERENCIAR RESERVAS */}
          <div
            id="gerenciar-reservas"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">4. Como Gerenciar Reservas & Status</h2>
                <p className="text-xs text-slate-500">
                  Crie reservas, configure valores de sinal e acompanhe o ciclo completo de cada hóspede.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Para cadastrar uma nova estadia, clique no botão azul <strong>"Nova Reserva"</strong> no cabeçalho ou clique diretamente em uma data livre no Calendário.
              </p>

              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider pt-2">
                Ciclo de Vida & Status da Reserva:
              </h3>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px] shrink-0 border border-amber-300">
                    Pendente
                  </span>
                  <p className="text-xs text-amber-900">
                    A reserva foi pré-agendada ou está aguardando o envio/comprovante do sinal de pagamento.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] shrink-0 border border-blue-300">
                    Confirmado
                  </span>
                  <p className="text-xs text-blue-900">
                    O sinal foi recebido e a vaga está garantida para o hóspede. O calendário bloqueia o período automaticamente.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0 border border-emerald-300">
                    Check-in
                  </span>
                  <p className="text-xs text-emerald-900">
                    O hóspede já chegou ao imóvel. Momento de dar baixa no saldo restante para registrar a reserva como <strong>Total Pago</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-[11px] shrink-0 border border-slate-300">
                    Check-out
                  </span>
                  <p className="text-xs text-slate-700">
                    O hóspede desocupou o imóvel. O sistema aplica o <em>Gap de Limpeza</em> para higienização antes da próxima entrada.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] shrink-0 border border-rose-300">
                    Cancelado
                  </span>
                  <p className="text-xs text-rose-900">
                    A reserva foi desmarcada. O período é liberado no calendário e o registro financeiro é mantido para auditoria.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: CALENDÁRIO & BLOQUEIOS */}
          <div
            id="calendario-bloqueios"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">5. Calendário & Bloqueio de Períodos</h2>
                <p className="text-xs text-slate-500">
                  Visualização mensal, legendas de cores e como indisponibilizar datas para manutenção.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Legenda de Cores no Calendário:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-blue-600 mx-auto" />
                  <p className="font-bold text-blue-900 text-xs">Azul / Verde</p>
                  <p className="text-[11px] text-blue-700">Reserva Confirmada ou Check-in em andamento</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-amber-500 mx-auto" />
                  <p className="font-bold text-amber-900 text-xs">Amarelo / Laranja</p>
                  <p className="text-[11px] text-amber-700">Reserva Pendente aguardando sinal</p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-rose-600 mx-auto" />
                  <p className="font-bold text-rose-900 text-xs">Vermelho / Listrado</p>
                  <p className="text-[11px] text-rose-700">Bloqueio de Manutenção ou Uso Próprio</p>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-slate-800 text-xs mb-1">Como Bloquear Datas:</h3>
                <p className="text-xs text-slate-500 mb-2">
                  Clique no botão <strong>"Bloquear"</strong> no topo da tela ou diretamente no dia desejado. Escolha a data de início e fim e informe o motivo (ex: <em>Pintura</em>, <em>Manutenção da piscina</em> ou <em>Uso familiar</em>). O período ficará travado para novas reservas.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 6: EQUIPE & PERMISSÕES */}
          <div
            id="equipe-colaboradores"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">6. Como Convidar Colaboradores</h2>
                <p className="text-xs text-slate-500">
                  Trabalhe em equipe atribuindo papéis de Administrador ou Colaborador.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      👑
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Perfil Administrador</h3>
                  </div>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                    <li>Acesso total a todos os imóveis</li>
                    <li>Cadastrar e excluir imóveis</li>
                    <li>Gerenciar equipe e convidar membros</li>
                    <li>Alterar dados bancários e regras</li>
                    <li>Visualizar logs de auditoria e LGPD</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      👷
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Perfil Colaborador</h3>
                  </div>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                    <li>Acesso aos imóveis atribuídos</li>
                    <li>Criar e visualizar reservas</li>
                    <li>Registrar check-ins e check-outs</li>
                    <li>Consultar o calendário mensal</li>
                    <li>Enviar mensagens no WhatsApp</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs mb-1">Passo a passo para convidar:</h3>
                <ol className="text-xs text-slate-500 list-decimal list-inside space-y-1">
                  <li>Acesse a aba <strong>Usuários</strong> ou clique no menu superior ➔ <strong>Gerenciar Equipe</strong>.</li>
                  <li>Clique no botão <strong>"+ Convidar Membro"</strong>.</li>
                  <li>Informe o nome, e-mail e selecione o perfil (Admin ou Colaborador).</li>
                  <li>Selecione quais imóveis esse membro terá permissão para gerenciar.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* SECTION 7: RELATÓRIOS & AUDITORIA */}
          <div
            id="relatorios-auditoria"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">7. Relatórios, Exportação & LGPD</h2>
                <p className="text-xs text-slate-500">
                  Exportação de dados contábeis, trilha de auditoria e conformidade de privacidade.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportação para Excel (CSV)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Na aba <strong>Relatórios</strong>, clique em <strong>Exportar CSV</strong> para baixar uma planilha completa com hóspedes, diárias, taxas de limpeza e faturamento bruto.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Criptografia de CPF (LGPD)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Todos os documentos de hóspedes são criptografados com o algoritmo militar <strong>AES-256</strong> no banco de dados, protegendo sua operação contra vazamentos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 8: FAQ & DICAS */}
          <div
            id="faq-dicas"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs scroll-mt-24 space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">8. Perguntas Frequentes (FAQ)</h2>
                <p className="text-xs text-slate-500">
                  Respostas rápidas para as dúvidas mais comuns dos anfitriões.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="py-3">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left font-bold text-xs sm:text-sm text-slate-800 hover:text-blue-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed pl-2 border-l-2 border-blue-500 animate-in fade-in duration-100">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
