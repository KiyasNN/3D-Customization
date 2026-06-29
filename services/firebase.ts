import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  getDocs,
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Safe check if firebase is real or placeholder
const isFirebasePlayground = !firebaseConfig.apiKey || firebaseConfig.apiKey === "";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global Firestore Error Handler matching the mandatory Skill spec
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Startup (Critical Constraint in Skill)
export async function testConnection() {
  if (isFirebasePlayground) {
    console.log("Firebase is running in placeholder mode. Setup is in progress.");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Server offline.");
    }
  }
}

// Auth API Helpers
export const loginWithGoogle = async () => {
  if (isFirebasePlayground) {
    // If Firebase configuration is not completed yet, simulate login for development
    return {
      uid: "mock-uid-123",
      email: "kitoruyasiru@gmail.com",
      displayName: "Mock Handshake",
      photoURL: "https://lh3.googleusercontent.com/a/mock",
      emailVerified: true
    };
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const handleRedirectResult = async () => {
  if (isFirebasePlayground) {
    return null;
  }
  const result = await getRedirectResult(auth);
  return result?.user || null;
};

export const logoutUser = async () => {
  if (isFirebasePlayground) {
    return;
  }
  await signOut(auth);
};

// Firestore Profile Management
export const syncUserProfile = async (user: FirebaseUser | any) => {
  if (isFirebasePlayground) return;
  
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Create profile
      await setDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } else {
      // Update last active
      await updateDoc(userRef, {
        lastActive: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};
