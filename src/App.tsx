import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header, ActiveTab } from './components/Header';
import { OnboardingBanner } from './components/OnboardingBanner';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { ReservationsView } from './components/ReservationsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';
import { UserGuideView } from './components/UserGuideView';
import { ReservationModal } from './components/ReservationModal';
import { BlockModal } from './components/BlockModal';
import { ProfileModal } from './components/ProfileModal';
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import { AuthScreen } from './components/AuthScreen';
import { Reserva } from './types';
import { RefreshCw } from 'lucide-react';

const MainApplication: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals state
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservaToEdit, setReservaToEdit] = useState<Reserva | null>(null);
  const [preselectedCheckIn, setPreselectedCheckIn] = useState<string | undefined>(undefined);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [preselectedBlockDate, setPreselectedBlockDate] = useState<string | undefined>(undefined);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Trigger refresh in subcomponents if needed
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleDataChanged = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    const handlePropChanged = () => {
      handleDataChanged();
    };
    window.addEventListener('staypro:property-changed', handlePropChanged);
    return () => {
      window.removeEventListener('staypro:property-changed', handlePropChanged);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">Carregando Stay Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleOpenNewReservation = (preselectedDate?: string) => {
    setReservaToEdit(null);
    setPreselectedCheckIn(preselectedDate);
    setIsReservationModalOpen(true);
  };

  const handleEditReservation = (reserva: Reserva) => {
    setReservaToEdit(reserva);
    setPreselectedCheckIn(undefined);
    setIsReservationModalOpen(true);
  };

  const handleOpenNewBlock = (preselectedDate?: string) => {
    setPreselectedBlockDate(preselectedDate);
    setIsBlockModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Fixed/Sticky Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewReservation={() => handleOpenNewReservation()}
        onOpenNewBlock={() => handleOpenNewBlock()}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Onboarding Banner for first-time or new properties */}
        <OnboardingBanner
          setActiveTab={setActiveTab}
          onOpenNewReservation={() => handleOpenNewReservation()}
          onOpenInvite={() => setActiveTab('usuarios')}
        />

        {/* View Routing */}
        {activeTab === 'dashboard' && (
          <DashboardView
            key={`dash_${refreshTrigger}`}
            setActiveTab={setActiveTab}
            onOpenNewReservation={() => handleOpenNewReservation()}
            onOpenNewBlock={() => handleOpenNewBlock()}
            onSelectReservation={handleEditReservation}
          />
        )}

        {activeTab === 'calendario' && (
          <CalendarView
            key={`cal_${refreshTrigger}`}
            onOpenNewReservation={handleOpenNewReservation}
            onOpenNewBlock={handleOpenNewBlock}
            onEditReservation={handleEditReservation}
          />
        )}

        {activeTab === 'reservas' && (
          <ReservationsView
            key={`res_${refreshTrigger}`}
            onOpenNewReservation={() => handleOpenNewReservation()}
            onOpenNewBlock={() => handleOpenNewBlock()}
            onEditReservation={handleEditReservation}
          />
        )}

        {activeTab === 'relatorios' && <ReportsView key={`rep_${refreshTrigger}`} />}

        {activeTab === 'configuracoes' && <SettingsView key={`cfg_${refreshTrigger}`} />}

        {activeTab === 'usuarios' && (
          <UsersView
            key={`usr_${refreshTrigger}`}
          />
        )}

        {activeTab === 'guia' && (
          <UserGuideView
            setActiveTab={setActiveTab}
            onOpenNewReservation={() => handleOpenNewReservation()}
            onOpenNewBlock={() => handleOpenNewBlock()}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Stay Pro • Gestão de Locação por Temporada. 100% Gratuito & Ilimitado.</p>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={() => setActiveTab('guia')}
              className="text-blue-600 hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              Guia do Usuário
            </button>
            <span>•</span>
            <span>Conformidade LGPD</span>
            <span>•</span>
            <span>Criptografia AES-256</span>
            <span>•</span>
            <span>Google Cloud Run Ready</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        onSuccess={handleDataChanged}
        reservaToEdit={reservaToEdit}
        preselectedCheckIn={preselectedCheckIn}
      />

      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={handleDataChanged}
        preselectedDate={preselectedBlockDate}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SessionTimeoutModal />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApplication />
      </AuthProvider>
    </ToastProvider>
  );
}
