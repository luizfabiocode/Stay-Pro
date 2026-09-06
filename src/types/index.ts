export type UserRole = 'admin' | 'colaborador';
export type PlanType = 'gratuito' | 'basico' | 'profissional';
export type SecurityRiskLevel = 'Baixo' | 'Médio' | 'Alto';

export interface TwoFactorAuth {
  enabled: boolean;
  secret?: string;
  qrCodeUri?: string;
  backupCodes?: string[];
  lastVerifiedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  cpf?: string; // Encrypted in storage
  cpfDecrypted?: string;
  cpfEncrypted?: string;
  role: UserRole;
  plan: PlanType;
  reservasMes: number;
  propriedadeId?: string; // Active/selected property ID
  propriedadesIds: string[]; // List of all property IDs owned or assigned to this user
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  twoFactor?: TwoFactorAuth;
  twoFactorEnabled?: boolean;
  status?: 'active' | 'invited' | 'ativo' | 'pendente';
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
}

export interface Propriedade {
  id: string;
  nome: string;
  endereco: string;
  descricao: string;
  telefone?: string;
  telefoneContato?: string;
  diariaPadrao: number;
  taxaLimpeza: number;
  periodoMinimo: number; // default: 2 noites
  gapLimpeza: number; // default: 1 dia
  regrasCasa?: string | string[];
  checkInHorario?: string;
  checkOutHorario?: string;
  usuarioId: string; // ID of the owner user
  donoId: string; // Alias for backward compatibility
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'Pendente' | 'Confirmado' | 'Check-in' | 'Check-out' | 'Cancelado' | 'Bloqueado';
export type FinancialStatus = 'Pendente' | 'Sinal Pago' | 'Total Pago';
export type PaymentMethod = 'PIX' | 'Transferência' | 'Dinheiro' | 'Cartão';

export interface Reserva {
  id: string;
  codigo: string;
  hospede: string;
  telefone: string;
  email: string;
  qtdPessoas: number;
  cpf?: string; // Encrypted in DB
  cpfDecrypted?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  valorTotal: number;
  sinalPago: boolean;
  valorSinal: number;
  saldoRestante: number;
  dataSinal?: string;
  dataSaldo?: string;
  formaPagamentoSinal?: PaymentMethod;
  formaPagamentoSaldo?: PaymentMethod;
  formaPagamento?: PaymentMethod;
  status: ReservationStatus;
  statusFinanceiro: FinancialStatus;
  observacoes?: string;
  motivoBloqueio?: string;
  propriedadeId: string;
  usuarioId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  usuarioId?: string;
  usuarioNome?: string;
  usuarioEmail?: string;
  userName?: string;
  userEmail?: string;
  acao?: string;
  action?: string;
  detalhes?: string;
  details?: string;
  ip: string;
  userAgent: string;
  sessionId?: string;
  risco?: SecurityRiskLevel;
  riskLevel?: SecurityRiskLevel;
  locationEstimate?: string;
  isAlert?: boolean;
  timestamp: string;
}

export interface SecurityAlert {
  id: string;
  type?: 'BRUTE_FORCE' | 'NEW_DEVICE' | 'UNUSUAL_LOCATION' | 'MULTIPLE_SESSIONS' | 'HIGH_RISK_ACTION';
  tipo?: string;
  title?: string;
  mensagem?: string;
  description?: string;
  risco?: SecurityRiskLevel;
  riskLevel?: SecurityRiskLevel;
  ip: string;
  userAgent?: string;
  timestamp: string;
  resolved?: boolean;
  resolvido?: boolean;
}

export interface BackupItem {
  id: string;
  nomeArquivo: string;
  filename?: string;
  tamanhoFormatado?: string;
  size?: number;
  encrypted?: boolean;
  checksumSha256?: string;
  checksum?: string;
  recordsCount?: {
    users: number;
    propriedades: number;
    reservas: number;
    logs: number;
  };
  createdAt: string;
  expiresAt?: string;
}

export interface AuthToken {
  id: string;
  usuarioId: string;
  token: string;
  tipo: 'confirmacao' | 'recuperacao' | 'convite' | 'refresh';
  expiracao: string;
  usado: boolean;
  revoked?: boolean;
  email?: string;
  propriedadeId?: string;
  propriedadesIds?: string[];
}

export interface DashboardStats {
  reservasMesCount: number;
  faturamentoMes: number;
  taxaOcupacao: number; // in percentage e.g. 65%
  diasOcupadosMes: number;
  diasTotaisMes: number;
  pendentesSinalCount: number;
  pendentesSinalValor: number;
  proximosCheckIns: Reserva[];
  proximosCheckOuts: Reserva[];
  limiteReservasPlano: number;
  reservasUtilizadasPlano: number;
  planoAtual: PlanType;
}

export interface MonthlyReportData {
  mesAno: string; // "2026-08"
  mesNome: string; // "Agosto 2026"
  totalReservas: number;
  faturamentoBruto: number;
  faturamentoSinal?: number;
  faturamentoSaldo?: number;
  faturamentoSinais?: number;
  faturamentoSaldos?: number;
  mediaDiaria: number; // ADR
  totalNoites?: number;
  diasOcupados?: number;
  diasTotaisMes?: number;
  taxaOcupacao: number;
  porFormaPagamento: Record<string, number>;
  porStatus: Record<string, number>;
  reservasPorStatus?: {
    status: ReservationStatus;
    count: number;
    valor: number;
  }[];
  reservasPorPagamento?: {
    metodo: PaymentMethod;
    count: number;
    valor: number;
  }[];
  reservas: Reserva[];
}

export interface PlanDetails {
  id: PlanType;
  nome: string;
  preco: string;
  periodo: string;
  limiteReservas: number | 'Ilimitado';
  limiteUsuarios: number | 'Ilimitado';
  destaque?: boolean;
  recursos: string[];
}
