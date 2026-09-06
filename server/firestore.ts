import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import https from 'https';

export const DEFAULT_FIRESTORE_DATABASE_ID = '(default)';
export const NAMED_FIRESTORE_DATABASE_ID = 'ai-studio-staypro-8b62f2bf-79f5-4d3c-ad04-6af07de45f4b';

let namedFirestoreInstance: Firestore | null = null;
let defaultFirestoreInstance: Firestore | null = null;
let firebaseConfig: any = null;

export function loadFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      firebaseConfig = JSON.parse(raw);
    } catch (e) {
      console.error('[Firebase] Erro ao ler firebase-applet-config.json:', e);
    }
  }

  if (!firebaseConfig) {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'project-6d7775f6-2fcd-4966-b77',
      apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU',
      firestoreDatabaseId: '(default)',
    };
  }

  return firebaseConfig;
}

function getFirebaseAppInstance() {
  const config = loadFirebaseConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config?.projectId || 'project-6d7775f6-2fcd-4966-b77';
  const apiKey = config?.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU';

  return getApps().length === 0
    ? initializeApp({
        apiKey: apiKey,
        projectId: projectId,
        authDomain: config?.authDomain || `${projectId}.firebaseapp.com`,
      })
    : getApp();
}

/**
 * Retorna as instâncias do Firestore ativas (Default e Nomeado)
 */
export function getAllFirestoreDBs(): Firestore[] {
  const dbs: Firestore[] = [];
  try {
    const app = getFirebaseAppInstance();

    if (!defaultFirestoreInstance) {
      try {
        defaultFirestoreInstance = getFirestore(app);
        console.log(`[Firebase Firestore] Conectado ao banco padrão: "(default)"`);
      } catch (err) {
        console.warn('[Firebase Firestore] Aviso ao conectar ao (default):', err);
      }
    }
    if (defaultFirestoreInstance) dbs.push(defaultFirestoreInstance);

    if (!namedFirestoreInstance) {
      try {
        namedFirestoreInstance = getFirestore(app, NAMED_FIRESTORE_DATABASE_ID);
        console.log(`[Firebase Firestore] Conectado ao banco nomeado: "${NAMED_FIRESTORE_DATABASE_ID}"`);
      } catch (err) {
        // Banco nomeado opcional
      }
    }
    if (namedFirestoreInstance && namedFirestoreInstance !== defaultFirestoreInstance) {
      dbs.push(namedFirestoreInstance);
    }
  } catch (error) {
    console.error('[Firebase Firestore] Erro ao obter instâncias do Firestore:', error);
  }
  return dbs;
}

export function getFirestoreDB(): Firestore | null {
  const dbs = getAllFirestoreDBs();
  return dbs.length > 0 ? dbs[0] : null;
}

// ----------------------------------------------------
// REST API HELPERS (Garante persistência direta via HTTPS)
// ----------------------------------------------------
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(fieldVal: any): any {
  if (!fieldVal) return null;
  if ('stringValue' in fieldVal) return fieldVal.stringValue;
  if ('booleanValue' in fieldVal) return fieldVal.booleanValue;
  if ('integerValue' in fieldVal) return parseInt(fieldVal.integerValue, 10);
  if ('doubleValue' in fieldVal) return parseFloat(fieldVal.doubleValue);
  if ('nullValue' in fieldVal) return null;
  if ('arrayValue' in fieldVal) return (fieldVal.arrayValue?.values || []).map(fromFirestoreValue);
  if ('mapValue' in fieldVal) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(fieldVal.mapValue?.fields || {})) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

function firestoreRestRequest(pathName: string, method: string, payload?: any): Promise<{ status: number; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const dataStr = payload ? JSON.stringify(payload) : null;
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 200, data: body ? JSON.parse(body) : {} });
        } catch (e) {
          resolve({ status: res.statusCode || 200, data: { raw: body } });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

/**
 * Salva diretamente via REST HTTPS no banco (default) e nomeado
 */
async function saveViaRest(collectionName: string, docId: string, data: any): Promise<boolean> {
  const config = loadFirebaseConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config?.projectId || 'project-6d7775f6-2fcd-4966-b77';
  const apiKey = config?.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU';

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }

  const databases = ['(default)', NAMED_FIRESTORE_DATABASE_ID];
  let anySuccess = false;

  for (const dbId of databases) {
    const patchPath = `/v1/projects/${projectId}/databases/${encodeURIComponent(dbId)}/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;
    const res = await firestoreRestRequest(patchPath, 'PATCH', { fields });
    if (res.status === 200) {
      anySuccess = true;
    }
  }

  return anySuccess;
}

/**
 * Deleta diretamente via REST HTTPS
 */
async function deleteViaRest(collectionName: string, docId: string): Promise<boolean> {
  const config = loadFirebaseConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config?.projectId || 'project-6d7775f6-2fcd-4966-b77';
  const apiKey = config?.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU';

  const databases = ['(default)', NAMED_FIRESTORE_DATABASE_ID];
  let anySuccess = false;

  for (const dbId of databases) {
    const delPath = `/v1/projects/${projectId}/databases/${encodeURIComponent(dbId)}/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;
    const res = await firestoreRestRequest(delPath, 'DELETE');
    if (res.status === 200) {
      anySuccess = true;
    }
  }

  return anySuccess;
}

/**
 * Carrega todos os dados de uma coleção do Firestore (via SDK com fallback REST)
 */
export async function loadCollectionFromFirestore<T = any>(collectionName: string): Promise<T[]> {
  const dbs = getAllFirestoreDBs();
  
  // 1. Tenta carregar via SDK
  for (const db of dbs) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      if (snapshot.size > 0) {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        return items;
      }
    } catch (err: any) {
      console.warn(`[Firebase Firestore SDK] Falha ao ler coleção "${collectionName}":`, err.message);
    }
  }

  // 2. Fallback via REST API no banco (default)
  try {
    const config = loadFirebaseConfig();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config?.projectId || 'project-6d7775f6-2fcd-4966-b77';
    const apiKey = config?.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU';

    const listPath = `/v1/projects/${projectId}/databases/%28default%29/documents/${collectionName}?key=${apiKey}`;
    const res = await firestoreRestRequest(listPath, 'GET');
    if (res.status === 200 && res.data?.documents) {
      const items: T[] = res.data.documents.map((d: any) => {
        const docId = d.name.split('/').pop();
        const obj: any = { id: docId };
        for (const [k, v] of Object.entries(d.fields || {})) {
          obj[k] = fromFirestoreValue(v);
        }
        return obj;
      });
      return items;
    }
  } catch (err: any) {
    console.error(`[Firebase Firestore REST] Erro ao carregar "${collectionName}":`, err.message);
  }

  return [];
}

/**
 * Salva ou atualiza um documento no Firestore (Dual-Channel: SDK + REST)
 */
export async function saveDocumentToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  const cleanData = sanitizeForFirestore(data);
  let sdkSuccess = false;

  // 1. Executa via Firebase SDK
  const dbs = getAllFirestoreDBs();
  if (dbs.length > 0) {
    const results = await Promise.allSettled(
      dbs.map(async (db) => {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, cleanData, { merge: true });
      })
    );
    sdkSuccess = results.some((r) => r.status === 'fulfilled');
  }

  // 2. Executa via REST direto garantindo persistência HTTPS imediata
  const restSuccess = await saveViaRest(collectionName, docId, cleanData);

  const finalSuccess = sdkSuccess || restSuccess;
  if (finalSuccess) {
    console.log(`[Firebase Firestore] ✅ Documento "${docId}" salvo com sucesso na coleção "${collectionName}" (SDK: ${sdkSuccess}, REST: ${restSuccess})`);
  } else {
    console.error(`[Firebase Firestore] ❌ Falha ao salvar documento "${docId}" na coleção "${collectionName}"`);
  }

  return finalSuccess;
}

/**
 * Remove um documento do Firestore (Dual-Channel: SDK + REST)
 */
export async function deleteDocumentFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  let sdkSuccess = false;

  // 1. SDK Delete
  const dbs = getAllFirestoreDBs();
  if (dbs.length > 0) {
    const results = await Promise.allSettled(
      dbs.map(async (db) => {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
      })
    );
    sdkSuccess = results.some((r) => r.status === 'fulfilled');
  }

  // 2. REST Delete
  const restSuccess = await deleteViaRest(collectionName, docId);

  const finalSuccess = sdkSuccess || restSuccess;
  if (finalSuccess) {
    console.log(`[Firebase Firestore] 🗑️ Documento "${docId}" excluído com sucesso da coleção "${collectionName}"`);
  }

  return finalSuccess;
}

/**
 * Sincroniza em lote documentos para o Firestore
 */
export async function syncBatchToFirestore(collectionName: string, items: any[]): Promise<boolean> {
  if (!items || items.length === 0) return true;

  let anySuccess = false;
  for (const item of items) {
    if (!item.id) continue;
    const ok = await saveDocumentToFirestore(collectionName, item.id, item);
    if (ok) anySuccess = true;
  }

  return anySuccess;
}

/**
 * Sincroniza dados iniciais do Firestore na inicialização do servidor.
 */
export async function syncInitialDataFromFirestore(localDb: any): Promise<boolean> {
  try {
    const [cloudUsers, cloudProps, cloudReservas, cloudLogs] = await Promise.all([
      loadCollectionFromFirestore('users'),
      loadCollectionFromFirestore('propriedades'),
      loadCollectionFromFirestore('reservas'),
      loadCollectionFromFirestore('logs'),
    ]);

    let modified = false;

    // Sincroniza Usuários
    if (cloudUsers.length > 0) {
      localDb.users = cloudUsers;
      modified = true;
    } else if (localDb.users && localDb.users.length > 0) {
      console.log(`[Firebase Firestore] Inicializando coleção "users" no Firestore (${localDb.users.length} registros)...`);
      await syncBatchToFirestore('users', localDb.users);
    }

    // Sincroniza Propriedades
    if (cloudProps.length > 0) {
      localDb.propriedades = cloudProps;
      modified = true;
    } else if (localDb.propriedades && localDb.propriedades.length > 0) {
      console.log(`[Firebase Firestore] Inicializando coleção "propriedades" no Firestore (${localDb.propriedades.length} registros)...`);
      await syncBatchToFirestore('propriedades', localDb.propriedades);
    }

    // Sincroniza Reservas
    if (cloudReservas.length > 0) {
      localDb.reservas = cloudReservas;
      modified = true;
    } else if (localDb.reservas && localDb.reservas.length > 0) {
      console.log(`[Firebase Firestore] Inicializando coleção "reservas" no Firestore (${localDb.reservas.length} registros)...`);
      await syncBatchToFirestore('reservas', localDb.reservas);
    }

    // Sincroniza Logs de Auditoria
    if (cloudLogs.length > 0) {
      cloudLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      localDb.logs = cloudLogs;
      modified = true;
    } else if (localDb.logs && localDb.logs.length > 0) {
      console.log(`[Firebase Firestore] Inicializando coleção "logs" no Firestore (${Math.min(localDb.logs.length, 50)} registros)...`);
      await syncBatchToFirestore('logs', localDb.logs.slice(-50));
    }

    console.log(
      `[Firebase Firestore] Sincronização de dados ativa no Firestore: ` +
      `${localDb.users.length} usuários, ${localDb.propriedades.length} imóveis, ${localDb.reservas.length} reservas, ${localDb.logs.length} logs.`
    );

    return true;
  } catch (err: any) {
    console.error('[Firebase Firestore] Erro ao sincronizar dados iniciais:', err.message);
    return false;
  }
}

/**
 * Remove valores undefined que o Firestore rejeita
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
}
