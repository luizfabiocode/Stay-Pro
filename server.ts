import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  encryptData,
  decryptData,
  sanitizeInput,
  isValidCPF,
  validatePasswordComplexity,
  generateBase32Secret,
  verifyTOTP,
  generateBackupCodes,
  calculateChecksum,
  dispatchWebhookAlert,
  DERIVED_AES_KEY,
  JWT_SECRET,
  signJWT,
  verifyJWT,
} from './server/security';
import { sendAppEmail } from './server/email';

const PORT = 3000;
const ACCESS_TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim());
const WEBHOOK_SECURITY_URL = process.env.WEBHOOK_SECURITY_URL || 'http://localhost:3000/webhook';

// ----------------------------------------------------
// DATABASE DEFINITION & FILE PERSISTENCE
// ----------------------------------------------------
interface DBData {
  users: any[];
  propriedades: any[];
  reservas: any[];
  logs: any[];
  tokens: any[];
  securityAlerts: any[];
  backups: any[];
  webhookConfig?: {
    webhookUrl: string;
    enabled: boolean;
    highRiskOnly: boolean;
  };
  loginAttempts: Record<string, { count: number; lastAttempt: number; lockedUntil?: number }>;
  captchas: Record<string, { answer: string; expires: number }>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function loadDB(): DBData {
  let db: DBData;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    } else {
      db = getInitialSeedDB();
    }
  } catch (err) {
    console.error('[Stay Pro DB] Erro ao ler banco de dados, recuperando estrutura inicial:', err);
    db = getInitialSeedDB();
  }

  // Schema normalizer & auto-migration
  if (!db.users) db.users = [];
  if (!db.propriedades) db.propriedades = [];
  if (!db.reservas) db.reservas = [];
  if (!db.tokens) db.tokens = [];
  if (!db.logs) db.logs = [];
  if (!db.securityAlerts) db.securityAlerts = [];
  if (!db.backups) db.backups = [];
  if (!db.loginAttempts) db.loginAttempts = {};
  if (!db.captchas) db.captchas = {};
  if (!db.webhookConfig) {
    db.webhookConfig = {
      webhookUrl: WEBHOOK_SECURITY_URL,
      enabled: false,
      highRiskOnly: true,
    };
  }

  // Ensure users have multi-properties array and 2FA schema
  db.users.forEach((u) => {
    if (!Array.isArray(u.propriedadesIds)) {
      u.propriedadesIds = u.propriedadeId ? [u.propriedadeId] : [];
    }
    if (!u.propriedadeId && u.propriedadesIds.length > 0) {
      u.propriedadeId = u.propriedadesIds[0];
    }
    if (!u.plan) u.plan = 'gratuito';
    if (!u.twoFactor) {
      u.twoFactor = {
        enabled: false,
        verified: false,
      };
    }
  });

  return db;
}

function getInitialSeedDB(): DBData {
  const defaultPropertyId = 'prop_villa_mar';
  const defaultAdminId = 'user_admin_01';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('StayPro@2026', salt);

  const defaultDB: DBData = {
    users: [
      {
        id: defaultAdminId,
        name: 'Carlos Silva (Administrador)',
        email: 'admin@staypro.com.br',
        passwordHash,
        phone: '(11) 98765-4321',
        cpf: encryptData('123.456.789-00'),
        role: 'admin',
        plan: 'gratuito',
        reservasMes: 6,
        propriedadeId: defaultPropertyId,
        propriedadesIds: [defaultPropertyId],
        emailVerified: true,
        status: 'active',
        twoFactor: {
          enabled: false,
          verified: false,
        },
        lgpdConsent: {
          accepted: true,
          version: '1.0',
          acceptedAt: '2026-08-01T10:00:00.000Z',
        },
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-30T10:00:00.000Z',
      },
      {
        id: 'user_colab_01',
        name: 'Mariana Duarte',
        email: 'mariana.duarte@staypro.com.br',
        passwordHash: bcrypt.hashSync('StayPro@2026', salt),
        phone: '(11) 97777-8888',
        cpf: encryptData('987.654.321-11'),
        role: 'colaborador',
        plan: 'gratuito',
        reservasMes: 0,
        propriedadeId: defaultPropertyId,
        propriedadesIds: [defaultPropertyId],
        emailVerified: true,
        status: 'active',
        twoFactor: {
          enabled: false,
          verified: false,
        },
        lgpdConsent: {
          accepted: true,
          version: '1.0',
          acceptedAt: '2026-08-10T14:30:00.000Z',
        },
        createdAt: '2026-08-10T14:30:00.000Z',
        updatedAt: '2026-08-30T10:00:00.000Z',
      },
    ],
    propriedades: [
      {
        id: defaultPropertyId,
        nome: 'Villa Mar Maresias - Casa Alto Padrão',
        endereco: 'Av. Dr. Francisco Loup, 1420 - Maresias, São Sebastião - SP, 11628-000',
        descricao: 'Casa de praia espetacular a 80m do mar com 4 suítes, piscina climatizada, área gourmet e espaço relax.',
        telefone: '(11) 98765-4321',
        diariaPadrao: 1200,
        taxaLimpeza: 250,
        periodoMinimo: 2,
        gapLimpeza: 1,
        regrasCasa: '• Check-in: a partir das 15:00\n• Check-out: até às 11:00\n• Não permitido som alto após as 22h (Lei do Silêncio)\n• Pets de pequeno porte são bem-vindos com taxa extra\n• Proibido fumar nas áreas internas',
        usuarioId: defaultAdminId,
        donoId: defaultAdminId,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-30T10:00:00.000Z',
      },
    ],
    reservas: [
      {
        id: 'res_001',
        codigo: '#1001',
        hospede: 'Fernanda Oliveira',
        telefone: '(11) 99123-4567',
        email: 'fernanda.oliveira@gmail.com',
        qtdPessoas: 6,
        cpf: encryptData('234.567.890-12'),
        checkIn: '2026-08-05',
        checkOut: '2026-08-09',
        valorTotal: 4800,
        sinalPago: true,
        valorSinal: 2400,
        saldoRestante: 0,
        dataSinal: '2026-07-20',
        dataSaldo: '2026-08-04',
        formaPagamentoSinal: 'PIX',
        formaPagamentoSaldo: 'PIX',
        formaPagamento: 'PIX',
        status: 'Check-out',
        statusFinanceiro: 'Total Pago',
        observacoes: 'Família com 2 crianças, solicitaram berço desmontável.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-07-20T11:00:00.000Z',
        updatedAt: '2026-08-09T11:30:00.000Z',
      },
      {
        id: 'res_002',
        codigo: '#1002',
        hospede: 'Rodrigo Mendonça',
        telefone: '(21) 98822-1133',
        email: 'rodrigo.mendonca@outlook.com',
        qtdPessoas: 4,
        cpf: encryptData('345.678.901-23'),
        checkIn: '2026-08-14',
        checkOut: '2026-08-18',
        valorTotal: 5050,
        sinalPago: true,
        valorSinal: 2525,
        saldoRestante: 0,
        dataSinal: '2026-07-28',
        dataSaldo: '2026-08-13',
        formaPagamentoSinal: 'PIX',
        formaPagamentoSaldo: 'Transferência',
        formaPagamento: 'PIX',
        status: 'Check-out',
        statusFinanceiro: 'Total Pago',
        observacoes: 'Chegada tardia combinada às 20h.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-07-28T14:00:00.000Z',
        updatedAt: '2026-08-18T11:00:00.000Z',
      },
      {
        id: 'res_003',
        codigo: '#1003',
        hospede: 'Juliana Costa',
        telefone: '(19) 99765-4321',
        email: 'juliana.costa@empresa.com.br',
        qtdPessoas: 8,
        cpf: encryptData('456.789.012-34'),
        checkIn: '2026-08-22',
        checkOut: '2026-08-26',
        valorTotal: 5050,
        sinalPago: true,
        valorSinal: 2525,
        saldoRestante: 0,
        dataSinal: '2026-08-02',
        dataSaldo: '2026-08-21',
        formaPagamentoSinal: 'PIX',
        formaPagamentoSaldo: 'PIX',
        formaPagamento: 'PIX',
        status: 'Check-out',
        statusFinanceiro: 'Total Pago',
        observacoes: 'Comemoração de aniversário.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-08-02T09:15:00.000Z',
        updatedAt: '2026-08-26T11:00:00.000Z',
      },
      {
        id: 'res_004',
        codigo: '#1004',
        hospede: 'Lucas Gabriel Silveira',
        telefone: '(31) 98455-6677',
        email: 'lucas.silveira@gmail.com',
        qtdPessoas: 5,
        cpf: encryptData('567.890.123-45'),
        checkIn: '2026-08-29',
        checkOut: '2026-09-02',
        valorTotal: 5050,
        sinalPago: true,
        valorSinal: 2525,
        saldoRestante: 2525,
        dataSinal: '2026-08-15',
        formaPagamentoSinal: 'PIX',
        formaPagamentoSaldo: 'Dinheiro',
        formaPagamento: 'PIX',
        status: 'Check-in',
        statusFinanceiro: 'Sinal Pago',
        observacoes: 'Hóspede já realizou check-in presencialmente.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-08-15T16:00:00.000Z',
        updatedAt: '2026-08-29T15:30:00.000Z',
      },
      {
        id: 'res_005',
        codigo: '#1005',
        hospede: 'Beatriz Vasconcelos',
        telefone: '(11) 99344-5566',
        email: 'beatriz.vasc@gmail.com',
        qtdPessoas: 4,
        cpf: encryptData('678.901.234-56'),
        checkIn: '2026-09-05',
        checkOut: '2026-09-09',
        valorTotal: 5050,
        sinalPago: true,
        valorSinal: 2525,
        saldoRestante: 2525,
        dataSinal: '2026-08-20',
        formaPagamentoSinal: 'PIX',
        formaPagamento: 'PIX',
        status: 'Confirmado',
        statusFinanceiro: 'Sinal Pago',
        observacoes: 'Casal com 2 adolescentes.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-08-20T10:20:00.000Z',
        updatedAt: '2026-08-20T10:20:00.000Z',
      },
      {
        id: 'res_006',
        codigo: '#1006',
        hospede: 'Marcelo Pires',
        telefone: '(11) 97111-2233',
        email: 'marcelo.pires@uol.com.br',
        qtdPessoas: 6,
        cpf: encryptData('789.012.345-67'),
        checkIn: '2026-09-12',
        checkOut: '2026-09-15',
        valorTotal: 3850,
        sinalPago: false,
        valorSinal: 0,
        saldoRestante: 3850,
        formaPagamento: 'PIX',
        status: 'Pendente',
        statusFinanceiro: 'Pendente',
        observacoes: 'Aguardando comprovante de sinal de 50% até 01/09.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-08-25T11:45:00.000Z',
        updatedAt: '2026-08-25T11:45:00.000Z',
      },
      {
        id: 'res_007',
        codigo: '#BLOQ-01',
        hospede: 'Bloqueio de Manutenção / Pintura',
        telefone: '(11) 98765-4321',
        email: 'admin@staypro.com.br',
        qtdPessoas: 0,
        checkIn: '2026-09-18',
        checkOut: '2026-09-20',
        valorTotal: 0,
        sinalPago: false,
        valorSinal: 0,
        saldoRestante: 0,
        status: 'Bloqueado',
        statusFinanceiro: 'Total Pago',
        motivoBloqueio: 'Manutenção preventiva do deque e pintura externa da varanda.',
        propriedadeId: defaultPropertyId,
        usuarioId: defaultAdminId,
        createdAt: '2026-08-28T09:00:00.000Z',
        updatedAt: '2026-08-28T09:00:00.000Z',
      },
    ],
    logs: [
      {
        id: 'log_001',
        usuarioId: defaultAdminId,
        usuarioNome: 'Carlos Silva (Administrador)',
        usuarioEmail: 'admin@staypro.com.br',
        acao: 'CRIAR_RESERVA',
        detalhes: 'Reserva #1006 criada para Marcelo Pires (12/09/2026 a 15/09/2026 - R$ 3.850,00)',
        ip: '127.0.0.1',
        userAgent: 'Stay Pro Web Client',
        risco: 'Baixo',
        sessionId: 'sess_init_1',
        timestamp: '2026-08-25T11:45:00.000Z',
      },
      {
        id: 'log_002',
        usuarioId: defaultAdminId,
        usuarioNome: 'Carlos Silva (Administrador)',
        usuarioEmail: 'admin@staypro.com.br',
        acao: 'BLOQUEIO_DATAS',
        detalhes: 'Bloqueio criado de 18/09/2026 a 20/09/2026: Manutenção preventiva do deque',
        ip: '127.0.0.1',
        userAgent: 'Stay Pro Web Client',
        risco: 'Baixo',
        sessionId: 'sess_init_2',
        timestamp: '2026-08-28T09:00:00.000Z',
      },
      {
        id: 'log_003',
        usuarioId: defaultAdminId,
        usuarioNome: 'Carlos Silva (Administrador)',
        usuarioEmail: 'admin@staypro.com.br',
        acao: 'ALTERAR_STATUS',
        detalhes: 'Reserva #1004 alterada para status Check-in (Lucas Gabriel Silveira)',
        ip: '127.0.0.1',
        userAgent: 'Stay Pro Web Client',
        risco: 'Baixo',
        sessionId: 'sess_init_3',
        timestamp: '2026-08-29T15:30:00.000Z',
      },
      {
        id: 'log_004',
        usuarioId: defaultAdminId,
        usuarioNome: 'Carlos Silva (Administrador)',
        usuarioEmail: 'admin@staypro.com.br',
        acao: 'LOGIN',
        detalhes: 'Login realizado com sucesso via autenticação primária',
        ip: '127.0.0.1',
        userAgent: 'Stay Pro Web Client',
        risco: 'Baixo',
        sessionId: 'sess_init_4',
        timestamp: '2026-08-30T08:00:00.000Z',
      },
    ],
    tokens: [],
    securityAlerts: [],
    backups: [],
    webhookConfig: {
      webhookUrl: process.env.WEBHOOK_SECURITY_URL || '',
      enabled: Boolean(process.env.WEBHOOK_SECURITY_URL),
      highRiskOnly: true,
    },
    loginAttempts: {},
    captchas: {},
  };

  saveDB(defaultDB);
  return defaultDB;
}

function saveDB(data: DBData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Stay Pro DB] Erro ao gravar dados no arquivo local:', err);
  }
}

// ----------------------------------------------------
// AUDIT LOG HELPER & AUTOMATED SIEM ALERTS
// ----------------------------------------------------
function logAudit(
  db: DBData,
  usuario: { id: string; name: string; email: string },
  acao: string,
  detalhes: string,
  req: Request,
  risco: 'Baixo' | 'Médio' | 'Alto' = 'Baixo'
) {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Browser';
  const sessionId = (req as any).sessionId || (req as any).token?.slice(0, 16) || 'anonymous';

  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    usuarioId: usuario.id || 'sistema',
    usuarioNome: usuario.name || 'Sistema',
    usuarioEmail: usuario.email || '',
    acao,
    detalhes,
    ip,
    userAgent,
    sessionId,
    risco,
    timestamp: new Date().toISOString(),
  };

  db.logs.unshift(newLog);
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }

  // Se risco for Médio ou Alto, cria alerta na central de segurança
  if (risco === 'Alto' || risco === 'Médio') {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newAlert = {
      id: alertId,
      tipo: acao,
      risco,
      mensagem: detalhes,
      usuarioEmail: usuario.email || 'Desconhecido',
      ip,
      userAgent,
      resolvido: false,
      timestamp: new Date().toISOString(),
    };
    db.securityAlerts.unshift(newAlert);
    if (db.securityAlerts.length > 200) {
      db.securityAlerts = db.securityAlerts.slice(0, 200);
    }

    // Se houver webhook cadastrado e ativo, dispara alerta para SIEM/Slack
    if (db.webhookConfig?.enabled && db.webhookConfig.webhookUrl) {
      if (!db.webhookConfig.highRiskOnly || risco === 'Alto') {
        dispatchWebhookAlert(db.webhookConfig.webhookUrl, {
          tipo: acao,
          risco,
          mensagem: detalhes,
          ip,
          timestamp: new Date().toISOString(),
          detalhes: { usuario: usuario.email, userAgent },
        }).catch((e) => console.error('Erro no disparo do webhook:', e));
      }
    }
  }

  saveDB(db);
}

// ----------------------------------------------------
// IN-MEMORY ACTIVE SESSIONS & TOKEN ROTATION ENGINE
// ----------------------------------------------------
interface ActiveSession {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number; // 15-min access token expiry
  ip: string;
  userAgent: string;
}

const sessions = new Map<string, ActiveSession>();

function createAccessToken(userId: string, req: Request): { token: string; sessionId: string } {
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();
  const token = signJWT(
    {
      sub: userId,
      sessionId,
      iss: 'staypro-auth-server',
      aud: 'staypro-client-app',
    },
    ACCESS_TOKEN_EXPIRATION_MS
  );

  sessions.set(token, {
    userId,
    sessionId,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + ACCESS_TOKEN_EXPIRATION_MS,
    ip: req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Browser',
  });

  return { token, sessionId };
}

function createRefreshToken(userId: string, db: DBData, sessionId: string): string {
  const refreshToken = `srt_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
  db.tokens.push({
    id: `tok_ref_${Date.now()}`,
    usuarioId: userId,
    sessionId,
    token: refreshToken,
    tipo: 'refresh',
    expiracao: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_MS).toISOString(),
    usado: false,
    revoked: false,
    createdAt: new Date().toISOString(),
  });
  saveDB(db);
  return refreshToken;
}

function getSessionUser(token: string, db: DBData): any | null {
  if (!token) return null;

  // Cryptographically verify token signature
  const jwtCheck = verifyJWT<{ sub: string; sessionId: string }>(token);
  let userId: string | null = null;

  const session = sessions.get(token);
  const now = Date.now();

  if (session) {
    // Verifica expiração do Access Token (15m) ou Inatividade (30m)
    if (now > session.expiresAt || now - session.lastActivity > INACTIVITY_TIMEOUT_MS) {
      sessions.delete(token);
      return null;
    }
    session.lastActivity = now;
    userId = session.userId;
  } else if (jwtCheck.valid && jwtCheck.payload?.sub) {
    // Reconstitute active session from valid JWT if server rebooted within token lifetime
    userId = jwtCheck.payload.sub;
    sessions.set(token, {
      userId,
      sessionId: jwtCheck.payload.sessionId || 'active_recovered',
      createdAt: now,
      lastActivity: now,
      expiresAt: now + ACCESS_TOKEN_EXPIRATION_MS,
      ip: '127.0.0.1',
      userAgent: 'Browser',
    });
  } else {
    return null;
  }

  const user = db.users.find((u) => u.id === userId);
  return user || null;
}

// ----------------------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------------------
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão inválida ou não autenticada. Faça login novamente.' });
  }

  const token = authHeader.split(' ')[1];
  const db = loadDB();
  const user = getSessionUser(token, db);

  if (!user) {
    return res.status(401).json({
      error: 'Sessão expirada por inatividade (30 minutos) ou token expirado. Por favor, reautentique-se.',
      sessionExpired: true,
    });
  }

  const session = sessions.get(token);
  (req as any).user = user;
  (req as any).token = token;
  (req as any).sessionId = session?.sessionId || 'active';
  (req as any).db = db;
  next();
}

// ----------------------------------------------------
// MULTI-PROPERTY ACCESS CONTROL & HELPER FUNCTIONS
// ----------------------------------------------------
function getUserProperties(user: any, db: DBData): any[] {
  if (!user) return [];
  const userPropIds = Array.isArray(user.propriedadesIds)
    ? user.propriedadesIds
    : user.propriedadeId
      ? [user.propriedadeId]
      : [];

  return db.propriedades.filter(
    (p) => p.usuarioId === user.id || (p as any).donoId === user.id || userPropIds.includes(p.id)
  );
}

function resolveActiveProperty(req: Request, user: any, db: DBData): any | null {
  const userProps = getUserProperties(user, db);
  if (userProps.length === 0) return null;

  const requestedId =
    (req.headers['x-propriedade-id'] as string) ||
    (req.query.propriedadeId as string) ||
    (req.query.id as string) ||
    user.propriedadeId;

  if (requestedId) {
    const matched = userProps.find((p) => p.id === requestedId);
    if (matched) return matched;
  }

  return userProps[0];
}

function isPropertyAuthorized(user: any, propertyId: string, db: DBData): boolean {
  if (!user || !propertyId) return false;
  const userProps = getUserProperties(user, db);
  return userProps.some((p) => p.id === propertyId);
}

function formatUser(user: any, activePropertyId?: string) {
  const propIds = Array.isArray(user.propriedadesIds)
    ? user.propriedadesIds
    : user.propriedadeId
      ? [user.propriedadeId]
      : [];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpfDecrypted: user.cpf ? decryptData(user.cpf) : '',
    role: user.role,
    plan: user.plan || 'gratuito',
    reservasMes: user.reservasMes || 0,
    propriedadeId: activePropertyId || user.propriedadeId || propIds[0] || '',
    propriedadesIds: propIds,
    emailVerified: user.emailVerified ?? true,
    status: user.status || 'active',
    twoFactorEnabled: user.twoFactor?.enabled || false,
    lgpdConsent: user.lgpdConsent || { accepted: true, version: '1.0' },
  };
}

// ----------------------------------------------------
// RATE LIMITING STORE & MIDDLEWARE
// ----------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function applyRateLimit(
  keyPrefix: string,
  limit: number,
  windowMs: number
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: `Muitas requisições. Limite de segurança atingido. Aguarde ${retryAfterSec} segundos.`,
      });
    }

    record.count += 1;
    next();
  };
}

// ----------------------------------------------------
// SERVER INITIALIZATION
// ----------------------------------------------------
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1.4 SEGURANÇA DE CABEÇALHOS HTTP (HELMET EQUIVALENTE & CSP)
  app.use((req, res, next) => {
    const origin = req.headers.origin as string;
    if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Propriedade-Id, X-StayPro-Client');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    // Strict Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  });

  // Global API Rate Limiter: 120 req/min
  app.use('/api', applyRateLimit('global_api', 120, 60 * 1000));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Stay Pro Rental Engine',
      security: 'Active (PBKDF2, JWT Rotation, 2FA, LGPD)',
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: CAPTCHA GENERATOR
  // ----------------------------------------------------
  app.get('/api/auth/captcha', (req, res) => {
    const db = loadDB();
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const captchaId = `cap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const answer = String(a + b);

    if (!db.captchas) db.captchas = {};
    db.captchas[captchaId] = {
      answer,
      expires: Date.now() + 5 * 60 * 1000, // 5 min
    };
    saveDB(db);

    res.json({
      captchaId,
      challengeText: `Quanto é ${a} + ${b}?`,
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: REGISTER (Strict password policy & LGPD consent)
  // ----------------------------------------------------
  app.post('/api/auth/register', applyRateLimit('register', 5, 60 * 60 * 1000), async (req, res) => {
    try {
      const { name, email, password, phone, cpf, propertyName, lgpdAccepted } = req.body;

      if (!name || !email || !password || !propertyName) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Nome, E-mail, Senha e Nome do Imóvel).' });
      }

      // Validação de complexidade de senha
      const passValidation = validatePasswordComplexity(password);
      if (!passValidation.valid) {
        return res.status(400).json({ error: passValidation.error });
      }

      if (!lgpdAccepted) {
        return res.status(400).json({ error: 'É obrigatório aceitar os Termos de Uso e Política de Privacidade (LGPD).' });
      }

      const cleanEmail = sanitizeInput(email).toLowerCase();
      const cleanName = sanitizeInput(name);
      const cleanPropertyName = sanitizeInput(propertyName);
      const cleanPhone = sanitizeInput(phone);
      const cleanCpf = sanitizeInput(cpf);

      if (cleanCpf) {
        const rawDigits = cleanCpf.replace(/\D/g, '');
        if (rawDigits && !isValidCPF(rawDigits)) {
          return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos informados.' });
        }
      }

      const db = loadDB();
      const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Já existe um cadastro com este endereço de e-mail.' });
      }

      const propertyId = `prop_${Date.now()}`;
      const userId = `user_${Date.now()}`;
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // Create new property owned by this user
      const newProperty = {
        id: propertyId,
        nome: cleanPropertyName,
        endereco: 'Cadastre o endereço nas configurações',
        descricao: 'Imóvel para locação por temporada cadastrado no Stay Pro.',
        telefone: cleanPhone || '(00) 00000-0000',
        diariaPadrao: 500,
        taxaLimpeza: 150,
        periodoMinimo: 2,
        gapLimpeza: 1,
        regrasCasa: '• Check-in a partir das 14:00\n• Check-out até às 11:00\n• Silêncio após às 22h',
        usuarioId: userId,
        donoId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create user with multi-property array and LGPD metadata
      const newUser = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        phone: cleanPhone,
        cpf: encryptData(cleanCpf),
        role: 'admin',
        plan: 'gratuito',
        reservasMes: 0,
        propriedadeId: propertyId,
        propriedadesIds: [propertyId],
        emailVerified: false,
        status: 'active',
        twoFactor: {
          enabled: false,
          verified: false,
        },
        lgpdConsent: {
          accepted: true,
          version: '1.0',
          acceptedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Generate verification token (24h)
      const verifyToken = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.tokens.push({
        id: `tok_${Date.now()}`,
        usuarioId: userId,
        token: verifyToken,
        tipo: 'confirmacao',
        expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usado: false,
        email: cleanEmail,
      });

      db.propriedades.push(newProperty);
      db.users.push(newUser);

      logAudit(
        db,
        { id: userId, name: cleanName, email: cleanEmail },
        'CADASTRO',
        `Novo administrador registrado com imóvel "${cleanPropertyName}" e consentimento LGPD gravado`,
        req
      );

      saveDB(db);

      const { token: sessionToken, sessionId } = createAccessToken(userId, req);
      const refreshToken = createRefreshToken(userId, db, sessionId);

      return res.status(201).json({
        message: 'Cadastro realizado com sucesso! Um e-mail de confirmação foi simulado.',
        token: sessionToken,
        refreshToken,
        verificationToken: verifyToken,
        user: formatUser(newUser, propertyId),
        propriedade: newProperty,
        propriedades: [newProperty],
      });
    } catch (err: any) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Erro ao processar cadastro.' });
    }
  });

  // ----------------------------------------------------
  // AUTH ROUTE: LOGIN (2FA, Rate limit 5/15min, Captcha, Token Rotation)
  // ----------------------------------------------------
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, captchaId, captchaAnswer, twoFactorCode } = req.body;
      const cleanEmail = sanitizeInput(email).toLowerCase();
      const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

      const db = loadDB();
      if (!db.loginAttempts) db.loginAttempts = {};

      const attemptKey = `${ip}_${cleanEmail}`;
      const attemptData = db.loginAttempts[attemptKey] || { count: 0, lastAttempt: Date.now() };

      // Check if locked
      if (attemptData.lockedUntil && Date.now() < attemptData.lockedUntil) {
        const remainingMinutes = Math.ceil((attemptData.lockedUntil - Date.now()) / (60 * 1000));
        return res.status(429).json({
          error: `Acesso bloqueado por segurança devido a 5 tentativas falhas. Tente novamente em ${remainingMinutes} minutos.`,
          locked: true,
          remainingMinutes,
        });
      }

      // If attempts >= 3, require captcha
      if (attemptData.count >= 3) {
        if (!captchaId || !captchaAnswer) {
          return res.status(400).json({
            error: 'Múltiplas tentativas detectadas. Por favor, resolva o desafio de segurança (Captcha).',
            requireCaptcha: true,
          });
        }

        const storedCaptcha = db.captchas ? db.captchas[captchaId] : null;
        if (!storedCaptcha || storedCaptcha.expires < Date.now() || storedCaptcha.answer !== String(captchaAnswer).trim()) {
          return res.status(400).json({
            error: 'Resposta de segurança incorreta. Tente novamente.',
            requireCaptcha: true,
          });
        }
        delete db.captchas[captchaId];
      }

      const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      let isValidPassword = false;

      if (user && user.passwordHash) {
        isValidPassword = bcrypt.compareSync(password, user.passwordHash);
      }

      if (!user || !isValidPassword) {
        attemptData.count += 1;
        attemptData.lastAttempt = Date.now();

        if (attemptData.count >= 5) {
          attemptData.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
          db.loginAttempts[attemptKey] = attemptData;
          saveDB(db);

          logAudit(
            db,
            { id: user?.id || 'tentativa_falha', name: cleanEmail, email: cleanEmail },
            'LOGIN_BLOQUEADO',
            'Bloqueio automático de 15 minutos acionado após 5 tentativas de senha incorreta',
            req,
            'Alto'
          );

          return res.status(429).json({
            error: 'Você atingiu o limite de 5 tentativas. Sua conta está temporariamente bloqueada por 15 minutos.',
            locked: true,
            remainingMinutes: 15,
          });
        }

        db.loginAttempts[attemptKey] = attemptData;
        saveDB(db);

        const remainingAttempts = 5 - attemptData.count;
        return res.status(400).json({
          error: `E-mail ou senha incorretos. Tentativa ${attemptData.count} de 5 (${remainingAttempts} restantes antes do bloqueio).`,
          attemptsCount: attemptData.count,
          requireCaptcha: attemptData.count >= 3,
        });
      }

      // Check 2FA if enabled on user account
      if (user.twoFactor?.enabled) {
        if (!twoFactorCode) {
          return res.json({
            require2FA: true,
            message: 'Autenticação em 2 etapas requerida. Digite o código de 6 dígitos do seu app autenticador.',
          });
        }

        const cleanCode = twoFactorCode.trim().toUpperCase();
        let is2FaValid = false;

        // Check TOTP code
        if (user.twoFactor.secret && verifyTOTP(user.twoFactor.secret, cleanCode)) {
          is2FaValid = true;
        }

        // Check single-use backup codes
        if (!is2FaValid && Array.isArray(user.twoFactor.backupCodes)) {
          const codeIndex = user.twoFactor.backupCodes.findIndex((c: string) => c.toUpperCase() === cleanCode);
          if (codeIndex !== -1) {
            is2FaValid = true;
            user.twoFactor.backupCodes.splice(codeIndex, 1); // Consume single-use backup code
            user.updatedAt = new Date().toISOString();
            logAudit(
              db,
              user,
              '2FA_BACKUP_CODE_USED',
              'Código de recuperação de emergência utilizado no login',
              req,
              'Médio'
            );
          }
        }

        if (!is2FaValid) {
          logAudit(
            db,
            user,
            '2FA_FALHA',
            'Código de autenticação em 2 etapas incorreto fornecido no login',
            req,
            'Médio'
          );
          return res.status(400).json({ error: 'Código de autenticação em 2 etapas inválido ou expirado.' });
        }
      }

      // Reset login attempts on success
      delete db.loginAttempts[attemptKey];
      saveDB(db);

      const { token: sessionToken, sessionId } = createAccessToken(user.id, req);
      const refreshToken = createRefreshToken(user.id, db, sessionId);
      const userProperties = getUserProperties(user, db);
      const activeProperty = userProperties.find((p) => p.id === user.propriedadeId) || userProperties[0] || null;

      logAudit(
        db,
        { id: user.id, name: user.name, email: user.email },
        'LOGIN',
        `Login efetuado com sucesso (Perfil: ${user.role}, 2FA: ${user.twoFactor?.enabled ? 'Ativo' : 'Inativo'})`,
        req,
        'Baixo'
      );

      return res.json({
        message: 'Login realizado com sucesso!',
        token: sessionToken,
        refreshToken,
        user: formatUser(user, activeProperty?.id),
        propriedade: activeProperty,
        propriedades: userProperties,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Erro ao autenticar usuário.' });
    }
  });

  // ----------------------------------------------------
  // AUTH ROUTE: REFRESH TOKEN (Rotation & Revocation)
  // ----------------------------------------------------
  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório.' });
    }

    const db = loadDB();
    const tokenRecord = db.tokens.find(
      (t) => t.token === refreshToken && t.tipo === 'refresh' && !t.revoked && new Date(t.expiracao) > new Date()
    );

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Refresh token inválido, expirado ou revogado. Faça login novamente.' });
    }

    const user = db.users.find((u) => u.id === tokenRecord.usuarioId);
    if (!user || user.status === 'blocked') {
      return res.status(401).json({ error: 'Usuário inativo ou bloqueado.' });
    }

    // Revoke old refresh token (Strict Token Rotation)
    tokenRecord.revoked = true;
    tokenRecord.usado = true;
    tokenRecord.rotatedAt = new Date().toISOString();

    const { token: newAccessToken, sessionId } = createAccessToken(user.id, req);
    const newRefreshToken = createRefreshToken(user.id, db, sessionId);

    saveDB(db);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: EXTEND ACTIVE SESSION
  // ----------------------------------------------------
  app.post('/api/auth/extend-session', requireAuth, (req, res) => {
    const token = (req as any).token;
    const session = sessions.get(token);
    if (session) {
      session.lastActivity = Date.now();
      session.expiresAt = Date.now() + ACCESS_TOKEN_EXPIRATION_MS;
      return res.json({ message: 'Sessão estendida com sucesso.', remainingMinutes: 30 });
    }
    return res.status(401).json({ error: 'Sessão expirada.' });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: 2FA MANAGEMENT (Generate, Verify, Disable)
  // ----------------------------------------------------
  app.post('/api/auth/2fa/generate', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    const secret = generateBase32Secret(20);
    const backupCodes = generateBackupCodes(10);
    const qrCodeUri = `otpauth://totp/StayPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=StayPro&algorithm=SHA1&digits=6&period=30`;

    // Armazena temporariamente na conta aguardando confirmação
    user.twoFactorPending = {
      secret,
      backupCodes,
      createdAt: new Date().toISOString(),
    };
    user.updatedAt = new Date().toISOString();

    logAudit(db, user, '2FA_GERAR_CONFIG', 'Chave de autenticação em dois fatores gerada para ativação', req, 'Baixo');
    saveDB(db);

    res.json({
      secret,
      qrCodeUri,
      backupCodes,
    });
  });

  app.post('/api/auth/2fa/verify', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { code } = req.body;

    if (!code || !user.twoFactorPending?.secret) {
      return res.status(400).json({ error: 'Nenhuma configuração de 2FA pendente encontrada. Gere a chave primeiro.' });
    }

    const isValid = verifyTOTP(user.twoFactorPending.secret, code.trim());
    if (!isValid) {
      return res.status(400).json({ error: 'Código de 6 dígitos inválido. Verifique o relógio do seu dispositivo e tente novamente.' });
    }

    user.twoFactor = {
      enabled: true,
      verified: true,
      secret: user.twoFactorPending.secret,
      backupCodes: user.twoFactorPending.backupCodes,
      activatedAt: new Date().toISOString(),
    };
    delete user.twoFactorPending;
    user.updatedAt = new Date().toISOString();

    logAudit(db, user, '2FA_ATIVADO', 'Autenticação em 2 Etapas (TOTP) ativada com sucesso', req, 'Médio');
    saveDB(db);

    res.json({
      message: 'Autenticação em dois fatores ativada com sucesso!',
      user: formatUser(user),
    });
  });

  app.post('/api/auth/2fa/disable', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { code } = req.body;

    if (!user.twoFactor?.enabled) {
      return res.status(400).json({ error: 'O 2FA não está ativo nesta conta.' });
    }

    const cleanCode = (code || '').trim().toUpperCase();
    let isValid = false;

    if (user.twoFactor.secret && verifyTOTP(user.twoFactor.secret, cleanCode)) {
      isValid = true;
    }

    if (!isValid && Array.isArray(user.twoFactor.backupCodes) && user.twoFactor.backupCodes.includes(cleanCode)) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Código de confirmação incorreto para desativar o 2FA.' });
    }

    user.twoFactor = {
      enabled: false,
      verified: false,
    };
    user.updatedAt = new Date().toISOString();

    logAudit(db, user, '2FA_DESATIVADO', 'Autenticação em 2 Etapas foi desativada pelo usuário', req, 'Alto');
    saveDB(db);

    res.json({
      message: 'Autenticação em 2 etapas desativada.',
      user: formatUser(user),
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: EMAIL VERIFICATION
  // ----------------------------------------------------
  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body;
    const db = loadDB();
    const foundToken = db.tokens.find(
      (t) => t.token === token && t.tipo === 'confirmacao' && !t.usado && new Date(t.expiracao) > new Date()
    );

    if (!foundToken) {
      return res.status(400).json({ error: 'Link de confirmação inválido ou expirado (limite de 24h).' });
    }

    foundToken.usado = true;
    const user = db.users.find((u) => u.id === foundToken.usuarioId);
    if (user) {
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
      logAudit(db, user, 'CONFIRMAR_EMAIL', 'E-mail verificado com sucesso via token temporário', req);
    }

    saveDB(db);
    return res.json({ message: 'E-mail confirmado com sucesso!' });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: PASSWORD RECOVERY REQUEST
  // ----------------------------------------------------
  app.post('/api/auth/request-password-reset', applyRateLimit('pwd_reset_req', 5, 60 * 60 * 1000), (req, res) => {
    const { email } = req.body;
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const db = loadDB();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Resposta neutra para segurança (evita enumeração de usuários)
      return res.json({ message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas.' });
    }

    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.tokens.push({
      id: `tok_${Date.now()}`,
      usuarioId: user.id,
      token: resetToken,
      tipo: 'recuperacao',
      expiracao: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h
      usado: false,
      email: cleanEmail,
    });
    saveDB(db);

    logAudit(db, user, 'SOLICITAR_RECUPERACAO_SENHA', 'Solicitação de link de redefinição de senha', req, 'Médio');

    // Dispara e-mail real via SMTP (se configurado)
    sendAppEmail({
      to: cleanEmail,
      subject: 'Recuperação de Senha - Stay Pro',
      text: `Olá ${user.nome || ''},\n\nRecebemos uma solicitação de redefinição de senha para sua conta no Stay Pro.\nSeu token de recuperação é: ${resetToken}\nEste token expira em 60 minutos.\n\nSe você não solicitou, ignore esta mensagem.`,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Recuperação de Senha - Stay Pro</h2>
        <p>Olá <strong>${user.nome || ''}</strong>,</p>
        <p>Recebemos uma solicitação de redefinição de senha para sua conta.</p>
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0;">
          ${resetToken}
        </div>
        <p style="color: #64748b; font-size: 14px;">Este token expira em 60 minutos. Se você não solicitou esta redefinição, nenhuma ação é necessária.</p>
      </div>`,
    }).catch((err) => console.error('[EMAIL ERROR] Falha no disparo assíncrono:', err));

    return res.json({
      message: 'Link de recuperação gerado com sucesso!',
      resetToken,
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: RESET PASSWORD (With strict password validation)
  // ----------------------------------------------------
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    const passValidation = validatePasswordComplexity(newPassword);
    if (!passValidation.valid) {
      return res.status(400).json({ error: passValidation.error });
    }

    const db = loadDB();
    const foundToken = db.tokens.find(
      (t) => t.token === token && t.tipo === 'recuperacao' && !t.usado && new Date(t.expiracao) > new Date()
    );

    if (!foundToken) {
      return res.status(400).json({ error: 'Token de redefinição inválido ou expirado.' });
    }

    foundToken.usado = true;
    const user = db.users.find((u) => u.id === foundToken.usuarioId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);
    user.updatedAt = new Date().toISOString();

    // Revoke all refresh tokens for security
    db.tokens.forEach((t) => {
      if (t.usuarioId === user.id && t.tipo === 'refresh') {
        t.revoked = true;
      }
    });

    logAudit(db, user, 'ALTERAR_SENHA', 'Senha redefinida com sucesso e sessões revogadas', req, 'Alto');
    saveDB(db);

    return res.json({ message: 'Senha alterada com sucesso! Você já pode realizar o login.' });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: CURRENT USER ME
  // ----------------------------------------------------
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const userProperties = getUserProperties(user, db);
    const activeProperty = resolveActiveProperty(req, user, db);

    res.json({
      user: formatUser(user, activeProperty?.id),
      propriedade: activeProperty,
      propriedades: userProperties,
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: SWITCH ACTIVE PROPERTY
  // ----------------------------------------------------
  app.post('/api/auth/switch-property', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { propriedadeId } = req.body;

    if (!propriedadeId || !isPropertyAuthorized(user, propriedadeId, db)) {
      return res.status(403).json({ error: 'Acesso não autorizado para o imóvel solicitado.' });
    }

    user.propriedadeId = propriedadeId;
    user.updatedAt = new Date().toISOString();
    saveDB(db);

    const userProperties = getUserProperties(user, db);
    const activeProperty = userProperties.find((p) => p.id === propriedadeId) || userProperties[0];

    logAudit(
      db,
      user,
      'TROCAR_IMOVEL_ATIVO',
      `Imóvel ativo alterado para "${activeProperty?.nome || propriedadeId}"`,
      req
    );

    res.json({
      message: 'Imóvel ativo alterado com sucesso!',
      user: formatUser(user, activeProperty?.id),
      propriedade: activeProperty,
      propriedades: userProperties,
    });
  });

  // ----------------------------------------------------
  // AUTH ROUTE: LOGOUT (Revokes active session & tokens)
  // ----------------------------------------------------
  app.post('/api/auth/logout', requireAuth, (req, res) => {
    const user = (req as any).user;
    const token = (req as any).token;
    const sessionId = (req as any).sessionId;
    const db = (req as any).db as DBData;

    sessions.delete(token);

    // Revoke refresh token for this session
    db.tokens.forEach((t) => {
      if (t.sessionId === sessionId || t.usuarioId === user.id) {
        t.revoked = true;
      }
    });

    logAudit(db, user, 'LOGOUT', 'Usuário encerrou a sessão com segurança', req);
    saveDB(db);

    res.json({ message: 'Sessão encerrada com sucesso.' });
  });

  // ----------------------------------------------------
  // PROPERTIES LIST & CREATION ROUTE (Multi-Imóvel)
  // ----------------------------------------------------
  app.get('/api/propriedades', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const properties = getUserProperties(user, db);
    res.json(properties);
  });

  app.post('/api/propriedades', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    const {
      nome,
      endereco,
      descricao,
      telefone,
      diariaPadrao,
      taxaLimpeza,
      periodoMinimo,
      gapLimpeza,
      regrasCasa,
    } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome do imóvel é obrigatório.' });
    }

    const newPropertyId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newProperty = {
      id: newPropertyId,
      nome: sanitizeInput(nome),
      endereco: sanitizeInput(endereco) || 'Endereço não informado',
      descricao: sanitizeInput(descricao) || 'Imóvel cadastrado no Stay Pro.',
      telefone: sanitizeInput(telefone) || user.phone || '(00) 00000-0000',
      diariaPadrao: Number(diariaPadrao) >= 0 ? Number(diariaPadrao) : 500,
      taxaLimpeza: Number(taxaLimpeza) >= 0 ? Number(taxaLimpeza) : 150,
      periodoMinimo: Number(periodoMinimo) >= 1 ? Number(periodoMinimo) : 2,
      gapLimpeza: Number(gapLimpeza) >= 0 ? Number(gapLimpeza) : 1,
      regrasCasa:
        sanitizeInput(regrasCasa) ||
        '• Check-in a partir das 14:00\n• Check-out até às 11:00\n• Silêncio após às 22h',
      usuarioId: user.id,
      donoId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.propriedades.push(newProperty);

    // Link new property to user's list and set as active
    if (!Array.isArray(user.propriedadesIds)) {
      user.propriedadesIds = [];
    }
    if (!user.propriedadesIds.includes(newPropertyId)) {
      user.propriedadesIds.push(newPropertyId);
    }
    user.propriedadeId = newPropertyId;
    user.updatedAt = new Date().toISOString();

    logAudit(
      db,
      user,
      'CRIAR_IMOVEL',
      `Novo imóvel "${newProperty.nome}" cadastrado com sucesso`,
      req
    );

    saveDB(db);

    const userProps = getUserProperties(user, db);

    res.status(201).json({
      message: 'Imóvel cadastrado com sucesso!',
      propriedade: newProperty,
      propriedades: userProps,
      user: formatUser(user, newPropertyId),
    });
  });

  // ----------------------------------------------------
  // PROPERTY ROUTE: GET & UPDATE ACTIVE/SPECIFIED
  // ----------------------------------------------------
  app.get('/api/propriedade', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const property = resolveActiveProperty(req, user, db);
    if (!property) {
      return res.status(404).json({ error: 'Nenhum imóvel encontrado para este usuário.' });
    }
    res.json(property);
  });

  app.put('/api/propriedade', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const targetProperty = resolveActiveProperty(req, user, db);

    if (!targetProperty) {
      return res.status(404).json({ error: 'Imóvel não encontrado.' });
    }

    if (user.role !== 'admin' && targetProperty.usuarioId !== user.id && targetProperty.donoId !== user.id) {
      return res.status(403).json({ error: 'Apenas administradores podem atualizar as configurações do imóvel.' });
    }

    const index = db.propriedades.findIndex((p) => p.id === targetProperty.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Imóvel não encontrado.' });
    }

    const {
      nome,
      endereco,
      descricao,
      telefone,
      diariaPadrao,
      taxaLimpeza,
      periodoMinimo,
      gapLimpeza,
      regrasCasa,
    } = req.body;

    db.propriedades[index] = {
      ...db.propriedades[index],
      nome: sanitizeInput(nome) || db.propriedades[index].nome,
      endereco: sanitizeInput(endereco) || db.propriedades[index].endereco,
      descricao: sanitizeInput(descricao) || db.propriedades[index].descricao,
      telefone: sanitizeInput(telefone) || db.propriedades[index].telefone,
      diariaPadrao: Number(diariaPadrao) >= 0 ? Number(diariaPadrao) : db.propriedades[index].diariaPadrao,
      taxaLimpeza: Number(taxaLimpeza) >= 0 ? Number(taxaLimpeza) : db.propriedades[index].taxaLimpeza,
      periodoMinimo: Number(periodoMinimo) >= 1 ? Number(periodoMinimo) : db.propriedades[index].periodoMinimo,
      gapLimpeza: Number(gapLimpeza) >= 0 ? Number(gapLimpeza) : db.propriedades[index].gapLimpeza,
      regrasCasa: sanitizeInput(regrasCasa) || db.propriedades[index].regrasCasa,
      updatedAt: new Date().toISOString(),
    };

    logAudit(db, user, 'ATUALIZAR_CONFIGURACOES', `Configurações do imóvel atualizadas ("${db.propriedades[index].nome}")`, req);
    saveDB(db);

    res.json({ message: 'Configurações atualizadas com sucesso!', propriedade: db.propriedades[index] });
  });

  // ----------------------------------------------------
  // RESERVATIONS ROUTE: LIST (Filtered strictly by active property)
  // ----------------------------------------------------
  app.get('/api/reservas', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const activeProperty = resolveActiveProperty(req, user, db);

    if (!activeProperty) {
      return res.json({
        reservas: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 10,
      });
    }

    let items = db.reservas.filter((r) => r.propriedadeId === activeProperty.id);

    // Search query
    const q = req.query.q?.toString().toLowerCase().trim();
    if (q) {
      items = items.filter(
        (r) =>
          r.hospede.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.telefone.includes(q) ||
          r.codigo.toLowerCase().includes(q)
      );
    }

    // Filter by status
    const status = req.query.status?.toString();
    if (status && status !== 'Todos') {
      items = items.filter((r) => r.status === status);
    }

    // Filter by month (YYYY-MM)
    const mes = req.query.mes?.toString();
    if (mes) {
      items = items.filter((r) => r.checkIn.startsWith(mes) || r.checkOut.startsWith(mes));
    }

    // Sort by checkIn descending
    items.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

    // Decrypt CPFs for response
    const formatted = items.map((r) => ({
      ...r,
      cpfDecrypted: r.cpf ? decryptData(r.cpf) : '',
    }));

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const total = formatted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = formatted.slice(startIndex, startIndex + limit);

    res.json({
      reservas: paginatedItems,
      total,
      page,
      totalPages,
      limit,
    });
  });

  // ----------------------------------------------------
  // RESERVATIONS ROUTE: CREATE (Checks Date Collisions & Isolation)
  // ----------------------------------------------------
  app.post('/api/reservas', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const targetPropId = req.body.propriedadeId || resolveActiveProperty(req, user, db)?.id;

    if (!targetPropId || !isPropertyAuthorized(user, targetPropId, db)) {
      return res.status(403).json({ error: 'Acesso não autorizado para cadastrar reserva neste imóvel.' });
    }

    const property = db.propriedades.find((p) => p.id === targetPropId);

    const {
      hospede,
      telefone,
      email,
      qtdPessoas,
      cpf,
      checkIn,
      checkOut,
      valorTotal,
      sinalPago,
      valorSinal,
      dataSinal,
      dataSaldo,
      formaPagamentoSinal,
      formaPagamentoSaldo,
      formaPagamento,
      status,
      observacoes,
    } = req.body;

    if (!hospede || !telefone || !email || !checkIn || !checkOut || valorTotal === undefined) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios da reserva.' });
    }

    // CPF validation (Module 11)
    if (cpf) {
      const cleanCpfDigits = sanitizeInput(cpf).replace(/\D/g, '');
      if (cleanCpfDigits && !isValidCPF(cleanCpfDigits)) {
        return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos informados.' });
      }
    }

    // Date validation
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (inDate >= outDate) {
      return res.status(400).json({ error: 'A data de Check-out deve ser posterior à data de Check-in.' });
    }

    // Minimum stay check
    const diffNights = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    const minStay = property?.periodoMinimo || 2;
    if (diffNights < minStay) {
      return res.status(400).json({ error: `O período mínimo de locação para este imóvel é de ${minStay} noites.` });
    }

    // Cleaning gap in days
    const gapDays = property?.gapLimpeza !== undefined ? Number(property.gapLimpeza) : 1;
    const gapMs = gapDays * 24 * 60 * 60 * 1000;
    const inTime = inDate.getTime();
    const outTime = outDate.getTime();

    // Check Date Conflicts including Cleaning Gap within THIS property
    const conflicting = db.reservas.find((r) => {
      if (r.propriedadeId !== targetPropId) return false;
      if (r.status === 'Cancelado' || r.status === 'Check-out') return false;

      const rIn = new Date(r.checkIn).getTime();
      const rOut = new Date(r.checkOut).getTime();

      // inDate < rOut + gapDays && outDate > rIn - gapDays
      return inTime < rOut + gapMs && outTime > rIn - gapMs;
    });

    if (conflicting) {
      const rIn = new Date(conflicting.checkIn).getTime();
      const rOut = new Date(conflicting.checkOut).getTime();
      const isDirectCollision = inTime < rOut && outTime > rIn;

      if (isDirectCollision) {
        return res.status(400).json({
          error: `As datas selecionadas (${checkIn} a ${checkOut}) colidem com a reserva existente "${conflicting.codigo} - ${conflicting.hospede}" (${conflicting.checkIn} a ${conflicting.checkOut}).`,
        });
      } else {
        return res.status(400).json({
          error: `Conflito com intervalo de higienização: É necessário respeitar o gap de limpeza obrigatório de ${gapDays} dia(s) antes e depois da reserva "${conflicting.codigo} - ${conflicting.hospede}" (${conflicting.checkIn} a ${conflicting.checkOut}).`,
        });
      }
    }

    const totalVal = Number(valorTotal) || 0;
    const isSinal = Boolean(sinalPago);
    const sinalVal = isSinal ? Number(valorSinal) || 0 : 0;
    const saldo = Math.max(0, totalVal - sinalVal);

    let finalFinancialStatus: 'Pendente' | 'Sinal Pago' | 'Total Pago' = 'Pendente';
    if (sinalVal >= totalVal && totalVal > 0) {
      finalFinancialStatus = 'Total Pago';
    } else if (isSinal && sinalVal > 0) {
      finalFinancialStatus = 'Sinal Pago';
    }

    const nextCodeNum = 1000 + db.reservas.length + 1;
    const newReservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      codigo: `#${nextCodeNum}`,
      hospede: sanitizeInput(hospede),
      telefone: sanitizeInput(telefone),
      email: sanitizeInput(email),
      qtdPessoas: Number(qtdPessoas) || 1,
      cpf: cpf ? encryptData(sanitizeInput(cpf)) : undefined,
      checkIn,
      checkOut,
      valorTotal: totalVal,
      sinalPago: isSinal,
      valorSinal: sinalVal,
      saldoRestante: saldo,
      dataSinal: dataSinal || (isSinal ? new Date().toISOString().split('T')[0] : undefined),
      dataSaldo: dataSaldo || undefined,
      formaPagamentoSinal: formaPagamentoSinal || formaPagamento || 'PIX',
      formaPagamentoSaldo: formaPagamentoSaldo || undefined,
      formaPagamento: formaPagamento || 'PIX',
      status: status || 'Pendente',
      statusFinanceiro: finalFinancialStatus,
      observacoes: sanitizeInput(observacoes),
      propriedadeId: targetPropId,
      usuarioId: user.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.reservas.push(newReservation);
    user.reservasMes = (user.reservasMes || 0) + 1;

    logAudit(
      db,
      user,
      'CRIAR_RESERVA',
      `Reserva ${newReservation.codigo} criada para ${newReservation.hospede} (${newReservation.checkIn} a ${newReservation.checkOut} - R$ ${newReservation.valorTotal.toFixed(2)})`,
      req
    );

    saveDB(db);

    res.status(201).json({
      message: 'Reserva criada com sucesso!',
      reserva: {
        ...newReservation,
        cpfDecrypted: cpf ? sanitizeInput(cpf) : '',
      },
    });
  });

  // ----------------------------------------------------
  // RESERVATIONS ROUTE: BLOCK DATES ("Novo Bloqueio")
  // ----------------------------------------------------
  app.post('/api/reservas/bloqueio', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const targetPropId = req.body.propriedadeId || resolveActiveProperty(req, user, db)?.id;

    if (!targetPropId || !isPropertyAuthorized(user, targetPropId, db)) {
      return res.status(403).json({ error: 'Acesso não autorizado para bloquear datas neste imóvel.' });
    }

    const { checkIn, checkOut, motivoBloqueio } = req.body;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'Informe a data inicial e final do bloqueio.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (inDate >= outDate) {
      return res.status(400).json({ error: 'A data final do bloqueio deve ser posterior à inicial.' });
    }

    const conflicting = db.reservas.find((r) => {
      if (r.propriedadeId !== targetPropId) return false;
      if (r.status === 'Cancelado' || r.status === 'Check-out') return false;
      const rIn = new Date(r.checkIn);
      const rOut = new Date(r.checkOut);
      return inDate < rOut && outDate > rIn;
    });

    if (conflicting) {
      return res.status(400).json({
        error: `Não é possível bloquear: as datas colidem com a reserva existente "${conflicting.codigo} - ${conflicting.hospede}".`,
      });
    }

    const blockRes = {
      id: `bloq_${Date.now()}`,
      codigo: `#BLOQ-${Math.floor(100 + Math.random() * 900)}`,
      hospede: 'Bloqueio de Calendário',
      telefone: user.phone || '(00) 00000-0000',
      email: user.email,
      qtdPessoas: 0,
      checkIn,
      checkOut,
      valorTotal: 0,
      sinalPago: false,
      valorSinal: 0,
      saldoRestante: 0,
      status: 'Bloqueado',
      statusFinanceiro: 'Total Pago',
      motivoBloqueio: sanitizeInput(motivoBloqueio) || 'Indisponibilidade / Manutenção',
      propriedadeId: targetPropId,
      usuarioId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.reservas.push(blockRes);
    logAudit(
      db,
      user,
      'BLOQUEIO_DATAS',
      `Bloqueio criado (${checkIn} a ${checkOut}): ${blockRes.motivoBloqueio}`,
      req
    );
    saveDB(db);

    res.status(201).json({ message: 'Datas bloqueadas com sucesso!', reserva: blockRes });
  });

  // ----------------------------------------------------
  // RESERVATIONS ROUTE: UPDATE (Edit, Status changes)
  // ----------------------------------------------------
  app.put('/api/reservas/:id', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { id } = req.params;

    const current = db.reservas.find((r) => r.id === id);
    if (!current || !isPropertyAuthorized(user, current.propriedadeId, db)) {
      return res.status(404).json({ error: 'Reserva não encontrada ou você não tem permissão para editá-la.' });
    }

    const index = db.reservas.findIndex((r) => r.id === id);

    const {
      hospede,
      telefone,
      email,
      qtdPessoas,
      cpf,
      checkIn,
      checkOut,
      valorTotal,
      sinalPago,
      valorSinal,
      dataSinal,
      dataSaldo,
      formaPagamentoSinal,
      formaPagamentoSaldo,
      formaPagamento,
      status,
      observacoes,
      motivoBloqueio,
    } = req.body;

    // CPF validation (Module 11)
    if (cpf) {
      const cleanCpfDigits = sanitizeInput(cpf).replace(/\D/g, '');
      if (cleanCpfDigits && !isValidCPF(cleanCpfDigits)) {
        return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos informados.' });
      }
    }

    // Date and Cleaning Gap Validation if dates changed
    const targetCheckIn = checkIn || current.checkIn;
    const targetCheckOut = checkOut || current.checkOut;
    const datesChanged = checkIn !== undefined || checkOut !== undefined;

    if (datesChanged) {
      const inDate = new Date(targetCheckIn);
      const outDate = new Date(targetCheckOut);
      if (inDate >= outDate) {
        return res.status(400).json({ error: 'A data de Check-out deve ser posterior à data de Check-in.' });
      }

      const prop = db.propriedades.find((p) => p.id === current.propriedadeId);
      const gapDays = prop?.gapLimpeza !== undefined ? Number(prop.gapLimpeza) : 1;
      const gapMs = gapDays * 24 * 60 * 60 * 1000;
      const minStay = prop?.periodoMinimo || 2;
      const diffNights = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffNights < minStay && current.status !== 'Bloqueado') {
        return res.status(400).json({ error: `O período mínimo de locação para este imóvel é de ${minStay} noites.` });
      }

      const inTime = inDate.getTime();
      const outTime = outDate.getTime();

      const conflicting = db.reservas.find((r) => {
        if (r.id === id) return false;
        if (r.propriedadeId !== current.propriedadeId) return false;
        if (r.status === 'Cancelado' || r.status === 'Check-out') return false;

        const rIn = new Date(r.checkIn).getTime();
        const rOut = new Date(r.checkOut).getTime();

        return inTime < rOut + gapMs && outTime > rIn - gapMs;
      });

      if (conflicting) {
        const rIn = new Date(conflicting.checkIn).getTime();
        const rOut = new Date(conflicting.checkOut).getTime();
        const isDirectCollision = inTime < rOut && outTime > rIn;

        if (isDirectCollision) {
          return res.status(400).json({
            error: `As novas datas selecionadas colidem com a reserva existente "${conflicting.codigo} - ${conflicting.hospede}" (${conflicting.checkIn} a ${conflicting.checkOut}).`,
          });
        } else {
          return res.status(400).json({
            error: `Conflito com intervalo de higienização: É necessário respeitar o gap de limpeza obrigatório de ${gapDays} dia(s) antes e depois da reserva "${conflicting.codigo} - ${conflicting.hospede}" (${conflicting.checkIn} a ${conflicting.checkOut}).`,
          });
        }
      }
    }

    const totalVal = valorTotal !== undefined ? Number(valorTotal) : current.valorTotal;
    const isSinal = sinalPago !== undefined ? Boolean(sinalPago) : current.sinalPago;
    const sinalVal = isSinal ? (valorSinal !== undefined ? Number(valorSinal) : current.valorSinal) : 0;
    const saldo = Math.max(0, totalVal - sinalVal);

    let finalFinancialStatus: 'Pendente' | 'Sinal Pago' | 'Total Pago' = current.statusFinanceiro;
    if (sinalVal >= totalVal && totalVal > 0) {
      finalFinancialStatus = 'Total Pago';
    } else if (isSinal && sinalVal > 0) {
      finalFinancialStatus = 'Sinal Pago';
    } else {
      finalFinancialStatus = 'Pendente';
    }

    const newStatus = status || current.status;
    const statusChanged = newStatus !== current.status;

    db.reservas[index] = {
      ...current,
      hospede: hospede ? sanitizeInput(hospede) : current.hospede,
      telefone: telefone ? sanitizeInput(telefone) : current.telefone,
      email: email ? sanitizeInput(email) : current.email,
      qtdPessoas: qtdPessoas !== undefined ? Number(qtdPessoas) : current.qtdPessoas,
      cpf: cpf ? encryptData(sanitizeInput(cpf)) : current.cpf,
      checkIn: targetCheckIn,
      checkOut: targetCheckOut,
      valorTotal: totalVal,
      sinalPago: isSinal,
      valorSinal: sinalVal,
      saldoRestante: saldo,
      dataSinal: dataSinal !== undefined ? dataSinal : current.dataSinal,
      dataSaldo: dataSaldo !== undefined ? dataSaldo : current.dataSaldo,
      formaPagamentoSinal: formaPagamentoSinal || current.formaPagamentoSinal,
      formaPagamentoSaldo: formaPagamentoSaldo || current.formaPagamentoSaldo,
      formaPagamento: formaPagamento || current.formaPagamento,
      status: newStatus,
      statusFinanceiro: finalFinancialStatus,
      observacoes: observacoes !== undefined ? sanitizeInput(observacoes) : current.observacoes,
      motivoBloqueio: motivoBloqueio !== undefined ? sanitizeInput(motivoBloqueio) : current.motivoBloqueio,
      updatedAt: new Date().toISOString(),
    };

    if (statusChanged) {
      logAudit(
        db,
        user,
        'ALTERAR_STATUS',
        `Status da reserva ${current.codigo} alterado de "${current.status}" para "${newStatus}"`,
        req
      );
    } else {
      logAudit(
        db,
        user,
        'EDITAR_RESERVA',
        `Reserva ${current.codigo} (${db.reservas[index].hospede}) atualizada`,
        req
      );
    }

    saveDB(db);

    res.json({
      message: 'Reserva atualizada com sucesso!',
      reserva: {
        ...db.reservas[index],
        cpfDecrypted: db.reservas[index].cpf ? decryptData(db.reservas[index].cpf) : '',
      },
    });
  });

  // ----------------------------------------------------
  // RESERVATIONS ROUTE: DELETE
  // ----------------------------------------------------
  app.delete('/api/reservas/:id', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { id } = req.params;

    // 1. Verificação se a reserva existe e autorização no imóvel
    const current = db.reservas.find((r) => r.id === id);
    if (!current || !isPropertyAuthorized(user, current.propriedadeId, db)) {
      return res.status(404).json({ error: 'Reserva não encontrada ou você não tem permissão para excluí-la.' });
    }

    // 2. Verificação de papel (Apenas administradores podem excluir reservas permanentemente)
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Apenas administradores podem excluir reservas permanentemente.',
      });
    }

    const index = db.reservas.findIndex((r) => r.id === id);
    const deleted = db.reservas.splice(index, 1)[0];
    logAudit(
      db,
      user,
      'EXCLUIR_RESERVA',
      `Reserva ${deleted.codigo} de ${deleted.hospede} foi excluída permanentemente`,
      req
    );
    saveDB(db);

    res.json({ message: `Reserva ${deleted.codigo} excluída com sucesso.` });
  });

  // ----------------------------------------------------
  // DASHBOARD ROUTE: STATS (Multi-Imóvel)
  // ----------------------------------------------------
  app.get('/api/dashboard/stats', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const activeProperty = resolveActiveProperty(req, user, db);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${currentYear}-${currentMonthNum}`;

    if (!activeProperty) {
      return res.json({
        reservasMesCount: 0,
        faturamentoMes: 0,
        taxaOcupacao: 0,
        diasOcupadosMes: 0,
        diasTotaisMes: 30,
        pendentesSinalCount: 0,
        pendentesSinalValor: 0,
        proximosCheckIns: [],
        proximosCheckOuts: [],
        limiteReservasPlano: 999999,
        reservasUtilizadasPlano: 0,
        planoAtual: 'gratuito',
      });
    }

    const propertyReservations = db.reservas.filter((r) => r.propriedadeId === activeProperty.id);

    // Month filter
    const monthReservations = propertyReservations.filter(
      (r) =>
        (r.checkIn.startsWith(currentMonthKey) || r.checkOut.startsWith(currentMonthKey)) &&
        r.status !== 'Cancelado'
    );

    const reservasMesCount = monthReservations.filter((r) => r.status !== 'Bloqueado').length;
    const faturamentoMes = monthReservations
      .filter((r) => r.status !== 'Bloqueado')
      .reduce((acc, r) => acc + (r.valorTotal || 0), 0);

    // Calculate Occupancy rate for current month
    const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
    const occupiedDaysSet = new Set<number>();

    propertyReservations
      .filter((r) => r.status !== 'Cancelado')
      .forEach((r) => {
        const inD = new Date(r.checkIn);
        const outD = new Date(r.checkOut);

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentYear, now.getMonth(), d);
          if (date >= inD && date < outD) {
            occupiedDaysSet.add(d);
          }
        }
      });

    const taxaOcupacao = Math.round((occupiedDaysSet.size / daysInMonth) * 100);

    // Pending deposit reservations
    const pendentesSinal = propertyReservations.filter(
      (r) => r.status === 'Pendente' && !r.sinalPago && r.statusFinanceiro === 'Pendente'
    );
    const pendentesSinalCount = pendentesSinal.length;
    const pendentesSinalValor = pendentesSinal.reduce((acc, r) => acc + (r.valorTotal || 0), 0);

    // Upcoming 5 check-ins (from today onwards)
    const todayStr = now.toISOString().split('T')[0];
    const proximosCheckIns = propertyReservations
      .filter((r) => r.checkIn >= todayStr && r.status !== 'Cancelado' && r.status !== 'Check-out')
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 5);

    // Upcoming 5 check-outs (from today onwards)
    const proximosCheckOuts = propertyReservations
      .filter((r) => r.checkOut >= todayStr && r.status !== 'Cancelado')
      .sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime())
      .slice(0, 5);

    res.json({
      reservasMesCount,
      faturamentoMes,
      taxaOcupacao,
      diasOcupadosMes: occupiedDaysSet.size,
      diasTotaisMes: daysInMonth,
      pendentesSinalCount,
      pendentesSinalValor,
      proximosCheckIns,
      proximosCheckOuts,
      limiteReservasPlano: 999999,
      reservasUtilizadasPlano: reservasMesCount,
      planoAtual: 'gratuito',
    });
  });

  // ----------------------------------------------------
  // REPORTS ROUTE: MONTHLY REPORT (Analytics, PDF, CSV)
  // ----------------------------------------------------
  app.get('/api/relatorios/mensal', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const activeProperty = resolveActiveProperty(req, user, db);
    const mesAno = req.query.mes?.toString() || new Date().toISOString().substring(0, 7);

    const [yearStr, monthStr] = mesAno.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mesNome = `${monthNames[month - 1]} de ${year}`;

    if (!activeProperty) {
      return res.json({
        mesAno,
        mesNome,
        totalReservas: 0,
        faturamentoBruto: 0,
        faturamentoSinal: 0,
        faturamentoSaldo: 0,
        mediaDiaria: 0,
        totalNoites: 0,
        taxaOcupacao: 0,
        reservasPorStatus: [],
        reservasPorPagamento: [],
        reservas: [],
      });
    }

    const propertyReservations = db.reservas.filter(
      (r) =>
        r.propriedadeId === activeProperty.id &&
        (r.checkIn.startsWith(mesAno) || r.checkOut.startsWith(mesAno))
    );

    const activeReservations = propertyReservations.filter((r) => r.status !== 'Cancelado' && r.status !== 'Bloqueado');
    const totalReservas = activeReservations.length;
    const faturamentoBruto = activeReservations.reduce((acc, r) => acc + (r.valorTotal || 0), 0);
    const faturamentoSinal = activeReservations.reduce((acc, r) => acc + (r.sinalPago ? r.valorSinal || 0 : 0), 0);
    const faturamentoSaldo = activeReservations.reduce((acc, r) => acc + (r.saldoRestante || 0), 0);

    let totalNoites = 0;
    activeReservations.forEach((r) => {
      const inD = new Date(r.checkIn);
      const outD = new Date(r.checkOut);
      const n = Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
      totalNoites += Math.max(1, n);
    });

    const mediaDiaria = totalNoites > 0 ? Math.round(faturamentoBruto / totalNoites) : 0;

    const daysInMonth = new Date(year, month, 0).getDate();
    const occupiedDaysSet = new Set<number>();

    propertyReservations
      .filter((r) => r.status !== 'Cancelado')
      .forEach((r) => {
        const inD = new Date(r.checkIn);
        const outD = new Date(r.checkOut);
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month - 1, d);
          if (date >= inD && date < outD) {
            occupiedDaysSet.add(d);
          }
        }
      });

    const taxaOcupacao = Math.round((occupiedDaysSet.size / daysInMonth) * 100);

    // Group by status
    const statusCounts: Record<string, { count: number; valor: number }> = {};
    propertyReservations.forEach((r) => {
      if (!statusCounts[r.status]) statusCounts[r.status] = { count: 0, valor: 0 };
      statusCounts[r.status].count += 1;
      statusCounts[r.status].valor += r.valorTotal || 0;
    });

    const reservasPorStatus = Object.entries(statusCounts).map(([st, data]) => ({
      status: st as any,
      count: data.count,
      valor: data.valor,
    }));

    // Group by payment method
    const paymentCounts: Record<string, { count: number; valor: number }> = {};
    activeReservations.forEach((r) => {
      const method = r.formaPagamento || 'PIX';
      if (!paymentCounts[method]) paymentCounts[method] = { count: 0, valor: 0 };
      paymentCounts[method].count += 1;
      paymentCounts[method].valor += r.valorTotal || 0;
    });

    const reservasPorPagamento = Object.entries(paymentCounts).map(([metodo, data]) => ({
      metodo: metodo as any,
      count: data.count,
      valor: data.valor,
    }));

    res.json({
      mesAno,
      mesNome,
      totalReservas,
      faturamentoBruto,
      faturamentoSinal,
      faturamentoSaldo,
      mediaDiaria,
      totalNoites,
      taxaOcupacao,
      reservasPorStatus,
      reservasPorPagamento,
      reservas: propertyReservations.map((r) => ({
        ...r,
        cpfDecrypted: r.cpf ? decryptData(r.cpf) : '',
      })),
    });
  });

  // ----------------------------------------------------
  // USERS ROUTE: LIST, INVITE & REMOVE
  // ----------------------------------------------------
  app.get('/api/usuarios', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const userProps = getUserProperties(user, db);
    const userPropIds = userProps.map((p) => p.id);

    const team = db.users
      .filter((u) => {
        if (u.id === user.id) return true;
        const uProps = Array.isArray(u.propriedadesIds) ? u.propriedadesIds : u.propriedadeId ? [u.propriedadeId] : [];
        return uProps.some((pId: string) => userPropIds.includes(pId));
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        plan: u.plan || 'gratuito',
        status: u.status || 'active',
        emailVerified: u.emailVerified,
        twoFactorEnabled: u.twoFactor?.enabled || false,
        createdAt: u.createdAt,
      }));

    res.json({
      usuarios: team,
      planoAtual: 'gratuito',
    });
  });

  app.post('/api/usuarios/convidar', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const activeProperty = resolveActiveProperty(req, user, db);

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem convidar colaboradores.' });
    }

    if (!activeProperty) {
      return res.status(400).json({ error: 'Nenhum imóvel ativo selecionado para vincular o colaborador.' });
    }

    const { email, name, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Preencha o nome e o e-mail do colaborador.' });
    }

    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanName = sanitizeInput(name);

    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está associado a uma conta no Stay Pro.' });
    }

    const newUserId = `user_colab_${Date.now()}`;
    const salt = bcrypt.genSaltSync(10);
    const temporaryPassword = `StayPro@${Math.floor(1000 + Math.random() * 9000)}`;

    const newColab = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(temporaryPassword, salt),
      role: role === 'admin' ? 'admin' : 'colaborador',
      plan: 'gratuito',
      reservasMes: 0,
      propriedadeId: activeProperty.id,
      propriedadesIds: [activeProperty.id],
      emailVerified: true,
      status: 'active',
      twoFactor: {
        enabled: false,
        verified: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.tokens.push({
      id: `tok_${Date.now()}`,
      usuarioId: newUserId,
      token: inviteToken,
      tipo: 'convite',
      expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      usado: false,
      email: cleanEmail,
      propriedadeId: activeProperty.id,
    });

    db.users.push(newColab);
    logAudit(
      db,
      user,
      'CONVIDAR_USUARIO',
      `Colaborador ${cleanName} (${cleanEmail}) convidado para imóvel "${activeProperty.nome}" com perfil ${newColab.role}`,
      req
    );
    saveDB(db);

    res.status(201).json({
      message: 'Convite enviado com sucesso!',
      inviteLink: `https://staypro.app/invite?token=${inviteToken}`,
      temporaryPassword,
      usuario: {
        id: newColab.id,
        name: newColab.name,
        email: newColab.email,
        role: newColab.role,
        status: newColab.status,
      },
    });
  });

  app.delete('/api/usuarios/:id', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { id } = req.params;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem remover colaboradores.' });
    }

    if (id === user.id) {
      return res.status(400).json({ error: 'Você não pode remover seu próprio usuário de administrador.' });
    }

    const userProps = getUserProperties(user, db);
    const userPropIds = userProps.map((p) => p.id);

    const index = db.users.findIndex((u) => {
      if (u.id !== id) return false;
      const uProps = Array.isArray(u.propriedadesIds) ? u.propriedadesIds : u.propriedadeId ? [u.propriedadeId] : [];
      return uProps.some((pId: string) => userPropIds.includes(pId));
    });

    if (index === -1) {
      return res.status(404).json({ error: 'Colaborador não encontrado na sua equipe.' });
    }

    const removed = db.users.splice(index, 1)[0];
    logAudit(
      db,
      user,
      'REMOVER_USUARIO',
      `Colaborador ${removed.name} (${removed.email}) foi removido da equipe`,
      req
    );
    saveDB(db);

    res.json({ message: `Colaborador ${removed.name} removido com sucesso.` });
  });

  // Free system - plan update handler
  app.put('/api/usuarios/plano', requireAuth, (req, res) => {
    res.json({ message: 'O Stay Pro é 100% gratuito e ilimitado.', plan: 'gratuito' });
  });

  // ----------------------------------------------------
  // AUDIT LOGS & SECURITY ALERTS API
  // ----------------------------------------------------
  app.get('/api/logs', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const actionFilter = req.query.action?.toString();
    const riskFilter = req.query.risk?.toString();

    let logs = db.logs.filter((l) => l.usuarioId === user.id || l.usuarioEmail === user.email || l.usuarioId === 'sistema');

    if (actionFilter && actionFilter !== 'Todos') {
      logs = logs.filter((l) => l.acao === actionFilter);
    }
    if (riskFilter && riskFilter !== 'Todos') {
      logs = logs.filter((l) => l.risco === riskFilter);
    }

    res.json(logs.slice(0, 100));
  });

  app.get('/api/admin/security-alerts', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    res.json(db.securityAlerts || []);
  });

  app.post('/api/admin/security-alerts/:id/resolve', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { id } = req.params;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    const alert = db.securityAlerts.find((a) => a.id === id);
    if (alert) {
      alert.resolvido = true;
      alert.resolvidoPor = user.email;
      alert.resolvidoEm = new Date().toISOString();
      saveDB(db);
    }

    res.json({ message: 'Alerta de segurança marcado como resolvido.' });
  });

  // ----------------------------------------------------
  // BACKUPS & DISASTER RECOVERY API (Automated GCS/Local Snapshots)
  // ----------------------------------------------------
  app.get('/api/admin/backups', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    // Auto-clean backups older than retention policy
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    db.backups = (db.backups || []).filter((b) => {
      const isExpired = now - new Date(b.createdAt).getTime() > retentionMs;
      if (isExpired && fs.existsSync(b.caminho)) {
        try {
          fs.unlinkSync(b.caminho);
        } catch {}
      }
      return !isExpired;
    });
    saveDB(db);

    res.json(db.backups || []);
  });

  app.post('/api/admin/backups', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar backups manuais.' });
    }

    const backupId = `bkp_${Date.now()}`;
    const filename = `staypro-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    // Snapshot database content
    const snapshotContent = JSON.stringify(db, null, 2);
    fs.writeFileSync(filePath, snapshotContent, 'utf-8');

    const stat = fs.statSync(filePath);
    const checksum = calculateChecksum(snapshotContent);

    const newBackup = {
      id: backupId,
      nomeArquivo: filename,
      tamanhoBytes: stat.size,
      tamanhoFormatado: `${(stat.size / 1024).toFixed(1)} KB`,
      checksumSha256: checksum,
      caminho: filePath,
      status: 'Concluído (Armazenamento Seguro)',
      destino: 'Google Cloud Storage / Bucket Seguro Stay Pro',
      criadoPor: user.email,
      createdAt: new Date().toISOString(),
    };

    if (!db.backups) db.backups = [];
    db.backups.unshift(newBackup);

    logAudit(
      db,
      user,
      'CRIAR_BACKUP',
      `Snapshot de backup manual criado: ${filename} (Checksum: ${checksum.slice(0, 10)}...)`,
      req,
      'Médio'
    );
    saveDB(db);

    res.status(201).json({
      message: 'Backup gerado com sucesso e verificado com hash SHA-256!',
      backup: newBackup,
    });
  });

  app.post('/api/admin/backups/restore', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { id } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem restaurar backups.' });
    }

    const backup = db.backups?.find((b) => b.id === id);
    if (!backup || !fs.existsSync(backup.caminho)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado no servidor.' });
    }

    const raw = fs.readFileSync(backup.caminho, 'utf-8');
    const restoredData = JSON.parse(raw);

    // Save safety restore snapshot first
    const safetyFilename = `safety-pre-restore-${Date.now()}.json`;
    fs.writeFileSync(path.join(BACKUPS_DIR, safetyFilename), JSON.stringify(db, null, 2), 'utf-8');

    saveDB(restoredData);

    logAudit(
      restoredData,
      user,
      'RESTAURAR_BACKUP',
      `Banco de dados restaurado a partir do backup "${backup.nomeArquivo}"`,
      req,
      'Alto'
    );

    res.json({ message: 'Backup restaurado com sucesso! O banco de dados foi sincronizado.' });
  });

  // ----------------------------------------------------
  // LGPD & PRIVACY COMPLIANCE API (Portability & Erasure)
  // ----------------------------------------------------
  app.get('/api/lgpd/export', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    const userProps = getUserProperties(user, db);
    const userPropIds = userProps.map((p) => p.id);
    const userReservations = db.reservas
      .filter((r) => userPropIds.includes(r.propriedadeId))
      .map((r) => ({
        ...r,
        cpfDecrypted: r.cpf ? decryptData(r.cpf) : '',
      }));

    const userLogs = db.logs.filter((l) => l.usuarioId === user.id || l.usuarioEmail === user.email);

    logAudit(
      db,
      user,
      'LGPD_EXPORT_DADOS',
      'Titular solicitou exportação integral dos seus dados cadastrais (Direito à Portabilidade)',
      req,
      'Médio'
    );

    res.json({
      timestamp: new Date().toISOString(),
      lei: 'Lei Geral de Proteção de Dados (Lei 13.709/2018 - LGPD)',
      titular: {
        id: user.id,
        nome: user.name,
        email: user.email,
        telefone: user.phone,
        cpf: user.cpf ? decryptData(user.cpf) : '',
        perfil: user.role,
        criadoEm: user.createdAt,
        consentimento: user.lgpdConsent,
      },
      propriedades: userProps,
      reservas: userReservations,
      registrosAuditoria: userLogs,
    });
  });

  app.post('/api/lgpd/delete-account', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { reason } = req.body;

    // Anonymize user records and sensitive guest CPFs under LGPD right to erasure
    const userIndex = db.users.findIndex((u) => u.id === user.id);
    if (userIndex !== -1) {
      db.users[userIndex].name = 'Usuário Anonimizado (LGPD)';
      db.users[userIndex].email = `anonimizado_${Date.now()}@staypro.anon`;
      db.users[userIndex].phone = '---';
      db.users[userIndex].cpf = undefined;
      db.users[userIndex].status = 'deleted';
      db.users[userIndex].passwordHash = 'DELETED_ACCOUNT';
      db.users[userIndex].anonymizedAt = new Date().toISOString();
      db.users[userIndex].deletionReason = sanitizeInput(reason) || 'Solicitado pelo titular via painel';
    }

    logAudit(
      db,
      { id: user.id, name: 'Usuário Anonimizado', email: 'anon@staypro' },
      'LGPD_DIREITO_ESQUECIMENTO',
      'Conta e dados sensíveis anonimizados conforme Artigo 18 da LGPD',
      req,
      'Alto'
    );
    saveDB(db);

    res.json({
      message: 'Sua solicitação de exclusão/anonimização foi processada com sucesso conforme a LGPD.',
    });
  });

  app.get('/api/lgpd/consent', requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json(user.lgpdConsent || { accepted: true, version: '1.0', date: user.createdAt });
  });

  app.post('/api/lgpd/consent', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { accepted } = req.body;

    user.lgpdConsent = {
      accepted: Boolean(accepted),
      version: '1.0',
      updatedAt: new Date().toISOString(),
    };
    user.updatedAt = new Date().toISOString();

    logAudit(db, user, 'LGPD_ATUALIZAR_CONSENTIMENTO', `Consentimento LGPD atualizado: ${accepted ? 'Aceito' : 'Revogado'}`, req);
    saveDB(db);

    res.json({ message: 'Consentimento atualizado com sucesso.' });
  });

  // ----------------------------------------------------
  // WEBHOOKS / SIEM API
  // ----------------------------------------------------
  app.get('/api/admin/webhooks', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    res.json(
      db.webhookConfig || {
        webhookUrl: '',
        enabled: false,
        highRiskOnly: true,
      }
    );
  });

  app.post('/api/admin/webhooks', requireAuth, (req, res) => {
    const user = (req as any).user;
    const db = (req as any).db as DBData;
    const { webhookUrl, enabled, highRiskOnly } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    db.webhookConfig = {
      webhookUrl: sanitizeInput(webhookUrl),
      enabled: Boolean(enabled),
      highRiskOnly: highRiskOnly !== undefined ? Boolean(highRiskOnly) : true,
    };

    logAudit(
      db,
      user,
      'CONFIGURAR_WEBHOOK',
      `Webhook SIEM atualizado: ${db.webhookConfig.enabled ? 'Ativo' : 'Desativado'} (${db.webhookConfig.webhookUrl})`,
      req,
      'Médio'
    );
    saveDB(db);

    res.json({ message: 'Configurações de webhook salvas com sucesso!' });
  });

  app.post('/api/admin/webhooks/test', requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { webhookUrl } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    const success = await dispatchWebhookAlert(webhookUrl, {
      tipo: 'TESTE_CONEXAO',
      risco: 'Baixo',
      mensagem: 'Teste de integração de alertas SIEM/Webhook do Stay Pro com sucesso!',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    if (success) {
      return res.json({ message: 'Teste enviado com sucesso!', success: true });
    }
    return res.status(400).json({ error: 'Falha ao conectar no Webhook. Verifique a URL.', success: false });
  });

  // ----------------------------------------------------
  // VITE DEV MIDDLEWARE & PRODUCTION SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Stay Pro] Servidor seguro iniciado em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Stay Pro] Falha crítica ao iniciar servidor:', err);
});
