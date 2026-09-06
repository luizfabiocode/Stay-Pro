import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Shield,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Key,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCPF, formatPhone } from '../utils/security';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { success, error, info } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA Challenge State
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Captcha & Security States
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Verification & Reset States
  const [verificationModalToken, setVerificationModalToken] = useState<string | null>(null);
  const [resetTokenReceived, setResetTokenReceived] = useState<string | null>(null);
  const [newPasswordAfterReset, setNewPasswordAfterReset] = useState('');

  // Lockout countdown effect
  useEffect(() => {
    if (lockoutTimer && lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const loadCaptcha = async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaId(data.captchaId);
      setCaptchaChallenge(data.challengeText);
      setCaptchaAnswer('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer) {
      error('Conta Bloqueada', `Aguarde ${lockoutTimer}s antes de tentar novamente.`);
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        email,
        password,
        captchaId: captchaRequired ? captchaId : undefined,
        captchaAnswer: captchaRequired ? captchaAnswer : undefined,
        twoFactorCode: is2FAStep ? twoFactorCode : undefined,
      });

      if (res?.require2FA) {
        setIs2FAStep(true);
        info('Autenticação em 2 Etapas', 'Digite o código de 6 dígitos do seu aplicativo autenticador.');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Tentativas restantes') || msg.includes('Captcha')) {
        setCaptchaRequired(true);
        loadCaptcha();
      }
      if (msg.includes('Bloqueado') || msg.includes('bloqueada')) {
        setLockoutTimer(900); // 15 min lock
      }
      error('Falha no Login', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      error('Senha Fraca', 'A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (!lgpdAccepted) {
      error('Termos Obrigatórios', 'Você deve aceitar a Política de Privacidade e Termos da LGPD.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        password,
        phone,
        cpf,
        propertyName: propertyName || 'Meu Imóvel de Temporada',
        lgpdAccepted,
      });

      if (res.verificationToken) {
        setVerificationModalToken(res.verificationToken);
      }
    } catch (err: any) {
      error('Falha no Cadastro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Informe o e-mail', 'Preencha o e-mail cadastrado.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email);
      success('Link de Redefinição', res.message);
      if (res.resetToken) {
        setResetTokenReceived(res.resetToken);
      }
    } catch (err: any) {
      error('Erro ao recuperar', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetTokenReceived || newPasswordAfterReset.length < 8) {
      error('Senha inválida', 'A nova senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        token: resetTokenReceived,
        newPassword: newPasswordAfterReset,
      });
      success('Senha alterada!', 'Faça login com sua nova credencial.');
      setResetTokenReceived(null);
      setMode('login');
    } catch (err: any) {
      error('Erro ao redefinir', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateEmailVerification = async (token: string) => {
    try {
      await authApi.verifyEmail(token);
      success('E-mail Confirmado!', 'Sua conta foi validada com sucesso.');
      setVerificationModalToken(null);
    } catch (err: any) {
      error('Erro ao verificar', err.message);
    }
  };

  // Password strength gauge
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return score;
  };

  const passScore = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Subtle Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Stay<span className="text-blue-500">Pro</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Gestão Profissional de Locação por Temporada
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          {/* Lockout Banner */}
          {lockoutTimer && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong>Bloqueio de Segurança Ativo:</strong> Excesso de tentativas falhas. Aguarde{' '}
                <span className="font-bold">{Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s</span>.
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          {!is2FAStep && (
            <div className="flex border-b border-slate-200 mb-6 pb-2 gap-4 text-xs sm:text-sm font-semibold">
              <button
                onClick={() => {
                  setMode('login');
                  setIs2FAStep(false);
                }}
                className={`pb-2 transition-colors relative ${
                  mode === 'login'
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setMode('register');
                  setIs2FAStep(false);
                }}
                className={`pb-2 transition-colors relative ${
                  mode === 'register'
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Criar Conta (Grátis)
              </button>
              <button
                onClick={() => {
                  setMode('forgot');
                  setIs2FAStep(false);
                }}
                className={`pb-2 transition-colors relative ${
                  mode === 'forgot'
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Recuperar Senha
              </button>
            </div>
          )}

          {/* 2FA CHALLENGE STEP */}
          {is2FAStep && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Autenticação em 2 Etapas (2FA)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Digite o código de 6 dígitos gerado pelo Google Authenticator ou seu código de emergência.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Autenticação / Código Backup
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Ex: 123456 ou ABCD-EF12"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-lg font-bold tracking-widest text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !twoFactorCode.trim()}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Validando...' : 'Verificar e Acessar Conta'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIs2FAStep(false);
                    setTwoFactorCode('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
                >
                  ← Voltar para login normal
                </button>
              </div>
            </form>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && !is2FAStep && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dynamic Captcha Challenge */}
              {captchaRequired && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Verificação Anti-Robô (3 falhas)
                    </span>
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Novo
                    </button>
                  </div>
                  <div className="bg-slate-200/80 p-2.5 rounded-lg font-mono text-center text-sm font-bold text-slate-900 tracking-wider">
                    {captchaChallenge}
                  </div>
                  <input
                    type="text"
                    required
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Digite o resultado acima..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!lockoutTimer}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Acessando...' : 'Entrar no Stay Pro'}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Cadastre-se grátis
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && !is2FAStep && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@exemplo.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Imóvel Principal *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="Ex: Casa Praia Grande"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefone (opcional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CPF (opcional)
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha (mínimo 8 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha forte"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passScore < 50 ? 'bg-rose-500' : passScore < 75 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${passScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {passScore < 50 ? 'Senha curta' : passScore < 75 ? 'Senha média' : 'Senha forte e segura'}
                    </span>
                  </div>
                )}
              </div>

              {/* LGPD Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    required
                    checked={lgpdAccepted}
                    onChange={(e) => setLgpdAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    Li e concordo com os <strong>Termos de Uso</strong> e <strong>Política de Privacidade LGPD</strong> com criptografia de dados.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Criando Conta...' : 'Cadastrar e Começar Grátis'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && !is2FAStep && (
            <div className="space-y-4">
              {!resetTokenReceived ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Informe seu e-mail cadastrado. Nós enviaremos instruções e um token seguro para redefinir sua senha.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Seu E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Token de Redefinição Ativo
                  </div>
                  <p className="text-xs text-blue-700">
                    Digite sua nova senha abaixo para redefinir o acesso:
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova Senha (min 8 caracteres)
                    </label>
                    <input
                      type="password"
                      value={newPasswordAfterReset}
                      onChange={(e) => setNewPasswordAfterReset(e.target.value)}
                      placeholder="Nova senha segura"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPasswordConfirm}
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Confirmar Nova Senha
                  </button>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  ← Voltar para o Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Email Verification Modal */}
      {verificationModalToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Confirmação de E-mail</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Enviamos um link de confirmação com validade temporária de 24 horas para o seu e-mail.
            </p>

            <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Simulador de Link (1-Click):</p>
              <button
                onClick={() => handleSimulateEmailVerification(verificationModalToken)}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span>Validar E-mail Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
