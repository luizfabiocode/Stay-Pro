export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

/**
 * Validação de CPF com algoritmo matemático de dígitos verificadores (Módulo 11)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Rejeita sequências de números repetidos (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação de telefone no padrão brasileiro: (xx) 9xxxx-xxxx ou (xx) xxxx-xxxx
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  if (clean.length !== 10 && clean.length !== 11) return false;
  const ddd = parseInt(clean.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (clean.length === 11 && clean.charAt(2) !== '9') return false;
  return true;
}

/**
 * Validação rigorosa de formato de e-mail (RFC 5322 simplificado)
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

/**
 * Lista negra de senhas comuns e fracas
 */
const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'senha123',
  'qwerty',
  'staypro',
  'staypro123',
  'admin123',
  'admin@123',
  '11111111',
  '00000000',
  'brasil123',
]);

export interface PasswordStrength {
  score: number; // 0 to 100
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente';
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    notCommon: boolean;
    noRepetitive: boolean;
  };
  isValid: boolean;
  message?: string;
}

/**
 * Avaliador de complexidade de senha conforme diretrizes de segurança
 */
export function evaluatePassword(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
    noRepetitive: !/(.)\1{2,}/.test(password), // bloqueia sequências repetitivas com 3+ caracteres (ex: aaaa, 111)
  };

  let passed = 0;
  if (checks.minLength) passed++;
  if (checks.hasUppercase) passed++;
  if (checks.hasLowercase) passed++;
  if (checks.hasNumber) passed++;
  if (checks.hasSpecial) passed++;
  if (checks.notCommon) passed++;
  if (checks.noRepetitive) passed++;

  const isValid =
    checks.minLength &&
    checks.hasUppercase &&
    checks.hasLowercase &&
    checks.hasNumber &&
    checks.hasSpecial &&
    checks.notCommon &&
    checks.noRepetitive;

  let score = Math.round((passed / 7) * 100);
  let label: PasswordStrength['label'] = 'Muito Fraca';
  let color = 'bg-rose-500';

  if (score >= 90) {
    label = 'Excelente';
    color = 'bg-emerald-500';
  } else if (score >= 70) {
    label = 'Forte';
    color = 'bg-teal-500';
  } else if (score >= 50) {
    label = 'Média';
    color = 'bg-amber-500';
  } else if (score >= 30) {
    label = 'Fraca';
    color = 'bg-orange-500';
  }

  let message = '';
  if (!checks.minLength) message = 'A senha deve ter no mínimo 8 caracteres.';
  else if (!checks.notCommon) message = 'Esta senha é muito comum e insegura.';
  else if (!checks.noRepetitive) message = 'Evite repetir o mesmo caractere mais de 2 vezes seguidas.';
  else if (!checks.hasUppercase) message = 'Inclua pelo menos uma letra maiúscula.';
  else if (!checks.hasLowercase) message = 'Inclua pelo menos uma letra minúscula.';
  else if (!checks.hasNumber) message = 'Inclua pelo menos um número.';
  else if (!checks.hasSpecial) message = 'Inclua pelo menos um símbolo especial (@, #, $, etc.).';

  return {
    score,
    label,
    color,
    checks,
    isValid,
    message,
  };
}

export function maskCPF(cpf?: string): string {
  if (!cpf) return '---';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '•••.•••.•••-••';
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [user, domain] = email.split('@');
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1 ? `${domainParts[0][0]}***.${domainParts.slice(1).join('.')}` : domain;
  return `${maskedUser}@${maskedDomain}`;
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateTimeBR(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  const diffTime = outD.getTime() - inD.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getStatusColor(status: string): { bg: string; text: string; border: string; badge: string } {
  switch (status) {
    case 'Confirmado':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: 'text-emerald-700',
        border: 'border-emerald-300',
        badge: 'bg-emerald-500 text-white',
      };
    case 'Pendente':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        text: 'text-amber-700',
        border: 'border-amber-300',
        badge: 'bg-amber-500 text-white',
      };
    case 'Check-in':
      return {
        bg: 'bg-sky-50 text-sky-700 border-sky-200',
        text: 'text-sky-700',
        border: 'border-sky-300',
        badge: 'bg-sky-500 text-white',
      };
    case 'Check-out':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        text: 'text-indigo-700',
        border: 'border-indigo-300',
        badge: 'bg-indigo-500 text-white',
      };
    case 'Bloqueado':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'text-rose-700',
        border: 'border-rose-300',
        badge: 'bg-rose-500 text-white',
      };
    case 'Cancelado':
    default:
      return {
        bg: 'bg-slate-100 text-slate-600 border-slate-200',
        text: 'text-slate-600',
        border: 'border-slate-300',
        badge: 'bg-slate-400 text-white',
      };
  }
}

