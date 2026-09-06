import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// ----------------------------------------------------
// 1.1 CRIPTOGRAFIA - PBKDF2 DERIVATION & MASTER KEY
// ----------------------------------------------------
const MASTER_KEY_RAW =
  process.env.ENCRYPTION_MASTER_KEY ||
  process.env.ENCRYPTION_KEY ||
  'dev_temp_encryption_key_32bytes_12345';
const PBKDF2_SALT = 'staypro-kdf-salt-secure-2026-br';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BYTES = 32; // 256 bits

// Derive a cryptographic 256-bit key from the master secret using PBKDF2
export const DERIVED_AES_KEY = crypto
  .pbkdf2Sync(MASTER_KEY_RAW, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, 'sha256')
  .toString('hex');

// JWT Secret Key (HMAC-SHA256)
export const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_temp_jwt_secret_48bytes_for_testing_only_1234567890';

if (!process.env.ENCRYPTION_MASTER_KEY) {
  console.warn(
    '[STAY PRO - SEGURANÇA] Usando ENCRYPTION_MASTER_KEY padrão/desenvolvimento. Defina ENCRYPTION_MASTER_KEY em produção.'
  );
}

export function signJWT(payload: Record<string, any>, expiresInMs = 15 * 60 * 1000): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp };

  const encodeBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const headerB64 = encodeBase64Url(header);
  const payloadB64 = encodeBase64Url(fullPayload);
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJWT<T = any>(token: string): { valid: boolean; payload?: T; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token não fornecido ou inválido' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Formato JWT inválido' };
  }

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) {
    return { valid: false, error: 'Assinatura JWT inválida ou adulterada' };
  }

  try {
    const payloadJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return { valid: false, error: 'Token JWT expirado', payload };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Falha ao decodificar payload JWT' };
  }
}

export function encryptData(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, DERIVED_AES_KEY).toString();
}

export function decryptData(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, DERIVED_AES_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || '***';
  } catch {
    return '***';
  }
}

export function sanitizeInput(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Remove < e > para evitar injeção XSS
    .trim();
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

// ----------------------------------------------------
// 1.2 VALIDAÇÃO DE POLÍTICA DE SENHAS
// ----------------------------------------------------
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

export function validatePasswordComplexity(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'A senha deve conter pelo menos uma letra maiúscula.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'A senha deve conter pelo menos uma letra minúscula.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'A senha deve conter pelo menos um número.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'A senha deve conter pelo menos um caractere especial (@, #, $, %, etc.).' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Esta senha é muito comum e vulnerável. Escolha uma senha mais forte.' };
  }
  if (/(.)\1{2,}/.test(password)) {
    return { valid: false, error: 'A senha não pode conter o mesmo caractere repetido 3 ou mais vezes seguidas.' };
  }
  return { valid: true };
}

// ----------------------------------------------------
// 1.3 2FA - AUTENTICAÇÃO DE DOIS FATORES (TOTP RFC 6238)
// ----------------------------------------------------
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTOTPCode(secret: string, timeStepWindow = 0): string {
  const key = base32ToBuffer(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30; // 30s window
  const counter = Math.floor(epoch / timeStep) + timeStepWindow;

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const code = (codeInt % 1000000).toString().padStart(6, '0');
  return code;
}

export function verifyTOTP(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.replace(/\s+/g, '');
  // Verifica a janela atual e ±1 janela anterior/posterior para tolerância de sincronia de relógio
  for (let window = -1; window <= 1; window++) {
    const expected = generateTOTPCode(secret, window);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = `${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    codes.push(code);
  }
  return codes;
}

// ----------------------------------------------------
// 1.4 CHECKSUM & HASHING
// ----------------------------------------------------
export function calculateChecksum(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ----------------------------------------------------
// 1.5 WEBHOOK DISPATCHER (SIEM / SLACK / TEAMS)
// ----------------------------------------------------
export async function dispatchWebhookAlert(
  webhookUrl: string,
  event: {
    tipo: string;
    risco: string;
    mensagem: string;
    ip: string;
    timestamp: string;
    detalhes?: any;
  }
): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    const payload = {
      app: 'Stay Pro Security Engine',
      environment: process.env.NODE_ENV || 'development',
      ...event,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StayPro-Security-SIEM/1.0',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error('[Stay Pro Webhook Error] Falha ao enviar alerta para SIEM/Webhook:', err);
    return false;
  }
}
