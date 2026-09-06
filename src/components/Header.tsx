import React, { useState } from 'react';
import {
  Home,
  Calendar as CalendarIcon,
  BookOpen,
  BarChart3,
  Settings,
  Users,
  Plus,
  Ban,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  Building2,
  Check,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NewPropertyModal } from './NewPropertyModal';

export type ActiveTab = 'dashboard' | 'calendario' | 'reservas' | 'relatorios' | 'configuracoes' | 'usuarios' | 'guia';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewReservation: () => void;
  onOpenNewBlock: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewReservation,
  onOpenNewBlock,
  onOpenProfile,
}) => {
  const { user, propriedade, propriedades, switchProperty, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
    { id: 'reservas', label: 'Reservas', icon: BookOpen },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'guia', label: 'Guia', icon: HelpCircle },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo, Property Selector & Desktop Navigation */}
            <div className="flex items-center gap-6 lg:gap-8">
              <div
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer select-none group"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-blue-700 transition-colors">
                  S
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-800">
                    Stay<span className="text-blue-600">Pro</span>
                  </span>
                </div>
              </div>

              {/* Property Selector Switcher */}
              <div className="relative">
                <button
                  onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-semibold transition-all max-w-[200px] sm:max-w-[240px]"
                  title="Clique para alternar de imóvel ou cadastrar outro"
                >
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{propriedade?.nome || 'Meu Imóvel'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-auto" />
                </button>

                {propertyDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPropertyDropdownOpen(false)} />
                    <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Seus Imóveis ({propriedades.length})
                        </span>
                        <span className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-200">
                          100% Gratuito
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
                        {propriedades.map((prop) => {
                          const isSelected = prop.id === propriedade?.id;
                          return (
                            <button
                              key={prop.id}
                              onClick={async () => {
                                setPropertyDropdownOpen(false);
                                if (!isSelected) {
                                  await switchProperty(prop.id);
                                }
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors text-left ${
                                isSelected
                                  ? 'bg-blue-50/80 text-blue-900 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate mr-2">
                                <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                                <div className="truncate">
                                  <p className="truncate leading-snug">{prop.nome}</p>
                                  {prop.endereco && (
                                    <p className="text-[10px] text-slate-400 font-normal truncate">{prop.endereco}</p>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 p-1 mt-1">
                        <button
                          onClick={() => {
                            setPropertyDropdownOpen(false);
                            setIsNewPropertyModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors text-left"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Cadastrar Novo Imóvel</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-500">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as ActiveTab)}
                      className={`h-16 flex items-center gap-2 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-blue-600 border-blue-600 font-semibold'
                          : 'text-slate-500 hover:text-slate-800 border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Section: Actions & User Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Help / Guide Quick Button */}
              <button
                onClick={() => setActiveTab('guia')}
                className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                  activeTab === 'guia'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title="Abrir Guia do Usuário e Ajuda"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span className="hidden xl:inline">Ajuda</span>
              </button>

              {/* Quick Action Buttons */}
              <button
                onClick={onOpenNewBlock}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                title="Marcar período indisponível para manutenção ou uso próprio"
              >
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>Bloquear</span>
              </button>

              <button
                onClick={onOpenNewReservation}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Reserva</span>
              </button>

              {/* User Profile & Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                      {user?.name || 'Administrador'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider capitalize">
                      {user?.role || 'Admin'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs shadow-2xs">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SP'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>

                      <div className="p-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenProfile();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <UserIcon className="w-4 h-4 text-slate-500" />
                          Meu Perfil & Segurança
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setActiveTab('usuarios');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <Users className="w-4 h-4 text-slate-500" />
                          Gerenciar Equipe
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setActiveTab('configuracoes');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <ShieldCheck className="w-4 h-4 text-slate-500" />
                          Auditoria & LGPD
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setActiveTab('guia');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                          Guia do Usuário & Ajuda
                        </button>
                      </div>

                      <div className="border-t border-slate-100 p-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          Sair do Stay Pro
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as ActiveTab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 px-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenNewBlock();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <Ban className="w-4 h-4 text-rose-500" />
                  Bloquear Datas
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* New Property Modal */}
      <NewPropertyModal
        isOpen={isNewPropertyModalOpen}
        onClose={() => setIsNewPropertyModalOpen(false)}
      />
    </>
  );
};

