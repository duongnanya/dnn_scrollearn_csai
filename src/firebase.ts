import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { env, isFirebaseConfigured } from './config/env';
import type { FeedItem, UserSettings } from './types';
import { DEFAULT_SETTINGS as defaultSettings } from './types';

const app = isFirebaseConfigured ? initializeApp(env.firebase) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export { onAuthStateChanged, type User };

export const signInGoogle = () => {
  if (!auth) throw new Error('Firebase chưa cấu hình');
  return signInWithPopup(auth, new GoogleAuthProvider());
};

export const signInGuest = () => {
  if (!auth) throw new Error('Firebase chưa cấu hình');
  return signInAnonymously(auth);
};

export const signInEmail = (email: string, password: string) => {
  if (!auth) throw new Error('Firebase chưa cấu hình');
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpEmail = (email: string, password: string) => {
  if (!auth) throw new Error('Firebase chưa cấu hình');
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  if (!auth) throw new Error('Firebase chưa cấu hình');
  return signOut(auth);
};

const feedCol = (uid: string) => (db ? collection(db, 'users', uid, 'feed') : null);
const settingsDoc = (uid: string) => (db ? doc(db, 'users', uid, 'settings', 'profile') : null);

export const subscribeFeed = (uid: string, cb: (items: FeedItem[]) => void): Unsubscribe => {
  const col = feedCol(uid);
  if (!col) { cb([]); return () => {}; }
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedItem)));
  });
};

export const saveFeedItem = async (uid: string, item: FeedItem) => {
  const col = feedCol(uid);
  if (!col) return;
  await setDoc(doc(col, item.id), item);
};

export const updateFeedItem = async (uid: string, id: string, data: Partial<FeedItem>) => {
  const col = feedCol(uid);
  if (!col) return;
  await updateDoc(doc(col, id), data);
};

export const deleteFeedItem = async (uid: string, id: string) => {
  const col = feedCol(uid);
  if (!col) return;
  await deleteDoc(doc(col, id));
};

export const getSettings = async (uid: string): Promise<UserSettings> => {
  const ref = settingsDoc(uid);
  if (!ref) return defaultSettings;
  const snap = await getDoc(ref);
  return snap.exists() ? { ...defaultSettings, ...snap.data() } as UserSettings : defaultSettings;
};

export const saveSettings = async (uid: string, settings: UserSettings) => {
  const ref = settingsDoc(uid);
  if (!ref) return;
  await setDoc(ref, settings);
};

export const subscribeSettings = (uid: string, cb: (s: UserSettings) => void): Unsubscribe => {
  const ref = settingsDoc(uid);
  if (!ref) { cb(defaultSettings); return () => {}; }
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? { ...defaultSettings, ...snap.data() } as UserSettings : defaultSettings);
  });
};

export { isFirebaseConfigured };
