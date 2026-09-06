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

export const DEFAULT_FIRESTORE_DATABASE_ID = 'ai-studio-staypro-8b62f2bf-79f5-4d3c-ad04-6af07de45f4b';

let firestoreInstance: Firestore | null = null;
let firebaseConfig: any = null;

function resolveDatabaseId(envDbId?: string, configDbId?: string): string {
  // Se o env for o valor corrompido 'defalt' ou 'default', prioriza o banco canônico Stay Pro
  const candidates = [configDbId, envDbId, DEFAULT_FIRESTORE_DATABASE_ID];
  for (const candidate of candidates) {
    if (candidate && candidate !== 'defalt' && candidate !== 'default' && candidate !== '(default)') {
      return candidate;
    }
  }
  return DEFAULT_FIRESTORE_DATABASE_ID;
}

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

  const resolvedDbId = resolveDatabaseId(process.env.FIRESTORE_DATABASE_ID, firebaseConfig?.firestoreDatabaseId);

  if (!firebaseConfig) {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'project-6d7775f6-2fcd-4966-b77',
      firestoreDatabaseId: resolvedDbId,
    };
  } else {
    firebaseConfig.firestoreDatabaseId = resolvedDbId;
  }

  return firebaseConfig;
}

export function getFirestoreDB(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  const config = loadFirebaseConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || config?.projectId;
  const databaseId = resolveDatabaseId(process.env.FIRESTORE_DATABASE_ID, config?.firestoreDatabaseId);

  if (!projectId) {
    console.warn('[Firebase Firestore] Project ID não configurado');
    return null;
  }

  try {
    const app = getApps().length === 0
      ? initializeApp({
          apiKey: config?.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyB5S-sxmwAHi3fDgrF0oKGsfMlJ2NY1IXU',
          projectId: projectId,
          authDomain: config?.authDomain || `${projectId}.firebaseapp.com`,
        })
      : getApp();

    firestoreInstance = getFirestore(app, databaseId);
    console.log(`[Firebase Firestore] Conectado com sucesso ao projeto "${projectId}" (Database: ${databaseId})`);
    return firestoreInstance;
  } catch (error) {
    console.error('[Firebase Firestore] Erro ao inicializar Firestore:', error);
    return null;
  }
}

/**
 * Carrega todos os dados de uma coleção do Firestore
 */
export async function loadCollectionFromFirestore<T = any>(collectionName: string): Promise<T[]> {
  const db = getFirestoreDB();
  if (!db) return [];

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: T[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return items;
  } catch (err: any) {
    console.error(`[Firebase Firestore] Falha ao ler coleção "${collectionName}":`, err.message);
    return [];
  }
}

/**
 * Salva ou atualiza um documento no Firestore
 */
export async function saveDocumentToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firebase Firestore] Falha ao salvar doc "${docId}" na coleção "${collectionName}":`, err.message);
    return false;
  }
}

/**
 * Remove um documento do Firestore
 */
export async function deleteDocumentFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    console.error(`[Firebase Firestore] Falha ao deletar doc "${docId}" na coleção "${collectionName}":`, err.message);
    return false;
  }
}

/**
 * Sincroniza em lote documentos para o Firestore
 */
export async function syncBatchToFirestore(collectionName: string, items: any[]): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db || !items || items.length === 0) return false;

  try {
    const batch = writeBatch(db);
    for (const item of items) {
      if (!item.id) continue;
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, sanitizeForFirestore(item), { merge: true });
    }
    await batch.commit();
    return true;
  } catch (err: any) {
    console.error(`[Firebase Firestore] Erro no batch commit para "${collectionName}":`, err.message);
    return false;
  }
}

/**
 * Sincroniza dados iniciais do Firestore na inicialização do servidor
 */
export async function syncInitialDataFromFirestore(localDb: any): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db) return false;

  try {
    const [cloudUsers, cloudProps, cloudReservas] = await Promise.all([
      loadCollectionFromFirestore('users'),
      loadCollectionFromFirestore('propriedades'),
      loadCollectionFromFirestore('reservas'),
    ]);

    let modified = false;

    if (cloudUsers.length > 0) {
      const userMap = new Map<string, any>(localDb.users.map((u: any) => [u.id, u]));
      for (const u of cloudUsers) {
        const existing = userMap.get(u.id) || {};
        userMap.set(u.id, Object.assign({}, existing, u));
      }
      localDb.users = Array.from(userMap.values());
      modified = true;
    }

    if (cloudProps.length > 0) {
      const propMap = new Map<string, any>(localDb.propriedades.map((p: any) => [p.id, p]));
      for (const p of cloudProps) {
        const existing = propMap.get(p.id) || {};
        propMap.set(p.id, Object.assign({}, existing, p));
      }
      localDb.propriedades = Array.from(propMap.values());
      modified = true;
    }

    if (cloudReservas.length > 0) {
      const resMap = new Map<string, any>(localDb.reservas.map((r: any) => [r.id, r]));
      for (const r of cloudReservas) {
        const existing = resMap.get(r.id) || {};
        resMap.set(r.id, Object.assign({}, existing, r));
      }
      localDb.reservas = Array.from(resMap.values());
      modified = true;
    }

    if (modified) {
      console.log(`[Firebase Firestore] Hidratado com sucesso: ${cloudUsers.length} usuários, ${cloudProps.length} imóveis, ${cloudReservas.length} reservas.`);
    }

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
