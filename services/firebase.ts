import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs 
} from "firebase/firestore";

const hasRealConfig = !!import.meta.env.VITE_FIREBASE_API_KEY && 
                      import.meta.env.VITE_FIREBASE_API_KEY !== "your_firebase_api_key" &&
                      !import.meta.env.VITE_FIREBASE_API_KEY.includes("dummy");

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key-for-preview",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-project-id.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:1234567890abcdef"
};

let app;
let auth: any = null;
let db: any = null;
let isFallbackMode = true;

if (hasRealConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFallbackMode = false;
    console.log("Firebase Auth & Firestore initialized with real credentials.");
  } catch (error) {
    console.warn("Firebase failed to initialize with provided config, falling back to sandbox mode.", error);
  }
}

// In-memory emulated subscribers for sandbox mode
const subscribers: Array<(user: any) => void> = [];
let currentUser: any = null;

// Try to restore session from localStorage for persistence in sandbox mode
if (isFallbackMode) {
  try {
    const saved = localStorage.getItem("nk_sandbox_user");
    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Local storage read failed", e);
  }
}

const notifySubscribers = () => {
  subscribers.forEach(cb => cb(currentUser));
};

export const signInWithEmailAndPassword = async (email: string, pass: string) => {
  if (!isFallbackMode && auth) {
    const cred = await fbSignIn(auth, email, pass);
    return { email: cred.user.email, uid: cred.user.uid };
  } else {
    // Sandbox Emulation: allow login with any password
    currentUser = { email, uid: `sandbox-uid-${Date.now()}` };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
};

export const createUserWithEmailAndPassword = async (email: string, pass: string) => {
  if (!isFallbackMode && auth) {
    const cred = await fbCreateUser(auth, email, pass);
    return { email: cred.user.email, uid: cred.user.uid };
  } else {
    // Sandbox Emulation
    currentUser = { email, uid: `sandbox-uid-${Date.now()}` };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
};

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const signInWithGoogle = async (emulatedEmail?: string) => {
  if (!isFallbackMode && auth) {
    const provider = new GoogleAuthProvider();

    try {
      const cred = await signInWithPopup(auth, provider);
      return { email: cred.user.email, uid: cred.user.uid };
    } catch (err: any) {
      const code = err?.code || "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw err;
    }
  } else {
    // Sandbox Emulation: fallback to emulated Google sign-in
    const email = emulatedEmail || "kitoruyasiru@gmail.com";
    currentUser = { email, uid: `google-sandbox-uid-${Date.now()}` };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
};

export const handleGoogleRedirectResult = async () => {
  if (!isFallbackMode && auth) {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        return { email: result.user.email, uid: result.user.uid };
      }
    } catch (err) {
      console.warn("Google redirect sign-in failed:", err);
    }
  }
  return null;
};

export const signOut = async () => {
  if (!isFallbackMode && auth) {
    await fbSignOut(auth);
  } else {
    currentUser = null;
    localStorage.removeItem("nk_sandbox_user");
    notifySubscribers();
  }
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  if (!isFallbackMode && auth) {
    return fbOnAuthStateChanged(auth, (user) => {
      if (user) {
        callback({ email: user.email, uid: user.uid });
      } else {
        callback(null);
      }
    });
  } else {
    subscribers.push(callback);
    // Fire initially
    callback(currentUser);
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx > -1) subscribers.splice(idx, 1);
    };
  }
};

export interface UserProfile {
  uid: string;
  email: string;
  status: 'pending' | 'approved' | 'blocked';
  requestedAt: number;
}

const LOCAL_PROFILES_KEY = "nk_user_profiles_cache";

const getLocalProfiles = (): UserProfile[] => {
  try {
    const data = localStorage.getItem(LOCAL_PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read local profiles cache", e);
    return [];
  }
};

const saveLocalProfiles = (profiles: UserProfile[]) => {
  try {
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error("Failed to write local profiles cache", e);
  }
};

export const getUserProfile = async (uid: string, email: string): Promise<UserProfile> => {
  const isAdmin = email === "kitoruyasiru@gmail.com";
  const defaultStatus = isAdmin ? "approved" : "pending";

  let profile: UserProfile | null = null;

  if (!isFallbackMode && db) {
    try {
      const docRef = doc(db, "user_profiles", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn("Firestore getUserProfile failed, falling back to local cache:", e);
    }
  }

  if (!profile) {
    const local = getLocalProfiles();
    const found = local.find(p => p.uid === uid);
    if (found) {
      profile = found;
    }
  }

  if (!profile) {
    profile = {
      uid,
      email,
      status: defaultStatus,
      requestedAt: Date.now()
    };

    if (!isFallbackMode && db) {
      try {
        const docRef = doc(db, "user_profiles", uid);
        await setDoc(docRef, profile);
      } catch (e) {
        console.warn("Firestore save of new profile failed:", e);
      }
    }

    const local = getLocalProfiles();
    local.push(profile);
    saveLocalProfiles(local);
  }

  if (isAdmin && profile.status !== "approved") {
    profile.status = "approved";
    if (!isFallbackMode && db) {
      try {
        const docRef = doc(db, "user_profiles", uid);
        await setDoc(docRef, { status: "approved" }, { merge: true });
      } catch (e) {}
    }
    const local = getLocalProfiles();
    const idx = local.findIndex(p => p.uid === uid);
    if (idx > -1) {
      local[idx].status = "approved";
      saveLocalProfiles(local);
    }
  }

  return profile;
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  let firestoreProfiles: UserProfile[] = [];

  if (!isFallbackMode && db) {
    try {
      const querySnapshot = await getDocs(collection(db, "user_profiles"));
      querySnapshot.forEach((doc) => {
        firestoreProfiles.push(doc.data() as UserProfile);
      });
    } catch (e) {
      console.warn("Firestore getAllUserProfiles failed, using local cache:", e);
    }
  }

  const local = getLocalProfiles();
  const mergedMap = new Map<string, UserProfile>();

  local.forEach(p => mergedMap.set(p.uid, p));
  firestoreProfiles.forEach(p => mergedMap.set(p.uid, p));

  const result = Array.from(mergedMap.values());
  saveLocalProfiles(result);

  return result.sort((a, b) => b.requestedAt - a.requestedAt);
};

export const updateUserStatus = async (uid: string, status: 'approved' | 'blocked'): Promise<void> => {
  if (!isFallbackMode && db) {
    try {
      const docRef = doc(db, "user_profiles", uid);
      await setDoc(docRef, { status }, { merge: true });
    } catch (e) {
      console.warn("Firestore updateUserStatus failed:", e);
    }
  }

  const local = getLocalProfiles();
  const idx = local.findIndex(p => p.uid === uid);
  if (idx > -1) {
    local[idx].status = status;
  } else {
    local.push({
      uid,
      email: "",
      status,
      requestedAt: Date.now()
    });
  }
  saveLocalProfiles(local);
};

export { auth, db, isFallbackMode };
