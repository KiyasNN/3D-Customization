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

export function safeJSONParse<T>(raw: any, fallback: T): T {
  if (raw === undefined || raw === null) return fallback;
  const str = String(raw).trim();
  if (str === "" || str === "undefined" || str === "null") return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    const safeArgs = args.map(a => {
      if (a === undefined) return "(undefined)";
      if (typeof a === "function") return `[Function: ${a.name || "anonymous"}]`;
      return a;
    });
    console.log(...safeArgs);
  }
};

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
    try {
      db = getFirestore(app);
    } catch (e) {
      console.warn("Firestore initialization failed, disabling Firestore features.", e);
      db = null;
    }
    isFallbackMode = false;
    console.log("Firebase Auth & Firestore initialized with real credentials.");
  } catch (error) {
    console.warn("Firebase failed to initialize with provided config, falling back to sandbox mode.", error);
  }
}

// In-memory emulated subscribers for sandbox mode
const subscribers: Array<(user: any) => void> = [];
let currentUser: any = null;
let isLoggingOut = false;
let isStartupSigningOut = false;

// Do not auto-login on startup. The first page should always be the login page first.
try {
  localStorage.removeItem("nk_sandbox_user");
  localStorage.removeItem("nk_local_dev_user");
} catch (e) {}

// Asynchronously ensure Firebase Auth is also signed out on startup if present
if (typeof window !== "undefined") {
  isStartupSigningOut = true;
  if (!isFallbackMode && auth) {
    fbSignOut(auth)
      .catch(() => {})
      .finally(() => {
        isStartupSigningOut = false;
        notifySubscribers();
      });
  } else {
    isStartupSigningOut = false;
  }
}

const notifySubscribers = () => {
  debugLog("DEBUG notifySubscribers: subscribers count", subscribers.length);
  // Shallow copy to prevent issues if a callback alters the subscribers list during iteration
  const list = [...subscribers];
  list.forEach(cb => {
      debugLog("DEBUG notifySubscribers: calling subscriber", cb);
      try {
        const result = cb(currentUser) as any;
        if (result && typeof result.catch === 'function') {
          result.catch((err: any) => {
            console.error("Asynchronous error in subscriber callback:", err.stack || err);
          });
        }
      } catch (err: any) {
        console.error("Error in subscriber callback:", err.stack || err);
      }
  });
};

export const signInLocalDev = async (email: string, pass: string) => {
  isLoggingOut = false;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === "eggplosion" && pass === "Balaraja29*") {
    debugLog("DEBUG LOGIN: Local dev 'eggplosion' matched via signInLocalDev");
    currentUser = { email: "eggplosion", uid: "local-dev-eggplosion", isAdmin: true };
    localStorage.setItem("nk_local_dev_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
  throw new Error("Invalid username or password for local dev.");
};

export const signInWithEmailAndPassword = async (email: string, pass: string) => {
  isLoggingOut = false;
  const normalizedEmail = email.trim().toLowerCase();
  debugLog("DEBUG LOGIN:", { email, pass });
  debugLog("DEBUG isFallbackMode:", isFallbackMode, "auth:", !!auth);
  
  if (normalizedEmail === "eggplosion") {
    throw new Error("Please use local dev login for 'eggplosion'.");
  }
  
  // 2. kitoruyasiru@gmail.com with hardcoded "Balaraja29*" is ONLY used in sandbox fallback mode.
  // If real Firebase is active, kitoruyasiru@gmail.com must go through Firebase.
  if (isFallbackMode && normalizedEmail === "kitoruyasiru@gmail.com" && pass === "Balaraja29*") {
    debugLog("DEBUG LOGIN: Sandbox admin 'kitoruyasiru@gmail.com' matched");
    currentUser = { email: normalizedEmail, uid: "admin-local-uid" };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
  
  if (!isFallbackMode && auth) {
    debugLog("DEBUG LOGIN: Trying fbSignIn");
    const cred = await fbSignIn(auth, email, pass);
    currentUser = { email: cred.user.email, uid: cred.user.uid };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  } else {
    debugLog("DEBUG LOGIN: Using Sandbox Emulation");
    // Sandbox Emulation: allow login with any password
    currentUser = { email, uid: `sandbox-uid-${Date.now()}` };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
};

export const createUserWithEmailAndPassword = async (email: string, pass: string) => {
  isLoggingOut = false;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === "eggplosion") {
    throw new Error("Local dev account 'eggplosion' is already registered.");
  }
  if (!isFallbackMode && auth) {
    const cred = await fbCreateUser(auth, email, pass);
    currentUser = { email: cred.user.email, uid: cred.user.uid };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
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
  isLoggingOut = false;
  if (!isFallbackMode && auth) {
    const provider = new GoogleAuthProvider();

    try {
      const cred = await signInWithPopup(auth, provider);
      currentUser = { email: cred.user.email, uid: cred.user.uid };
      localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
      notifySubscribers();
      return currentUser;
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
        isLoggingOut = false;
        currentUser = { email: result.user.email, uid: result.user.uid };
        localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
        notifySubscribers();
        return currentUser;
      }
    } catch (err) {
      console.warn("Google redirect sign-in failed:", err);
    }
  }
  return null;
};

export const signOut = async () => {
  debugLog("DEBUG SIGN OUT CALLED");
  isLoggingOut = true;
  currentUser = null;
  localStorage.removeItem("nk_sandbox_user");
  localStorage.removeItem("nk_local_dev_user");
  
  // Instant local state update
  notifySubscribers();
  
  if (!isFallbackMode && auth) {
    fbSignOut(auth)
      .catch((e) => {
        console.warn("Firebase fbSignOut failed or was already signed out:", e);
      })
      .finally(() => {
        isLoggingOut = false;
        notifySubscribers();
      });
  } else {
    isLoggingOut = false;
  }
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  debugLog("DEBUG ON_AUTH_STATE_CHANGED CALLED!!!");
  debugLog("DEBUG onAuthStateChanged: adding subscriber");
  let unsubscribeFirebase: any = null;
  
  const safeInvokeCallback = (userVal: any) => {
    try {
      const result = callback(userVal) as any;
      if (result && typeof result.catch === 'function') {
        result.catch((err: any) => {
          console.error("Asynchronous error inside onAuthStateChanged callback invocation:", err.stack || err);
        });
      }
    } catch (err: any) {
      console.error("Error inside onAuthStateChanged callback invocation:", err.stack || err);
    }
  };

  if (!isFallbackMode && auth) {
    debugLog("DEBUG onAuthStateChanged: setting firebase listener");
    unsubscribeFirebase = fbOnAuthStateChanged(auth, (user) => {
      debugLog("DEBUG onAuthStateChanged: firebase listener triggered", user);
      
      if (isLoggingOut || isStartupSigningOut) {
        debugLog("DEBUG onAuthStateChanged: currently logging out or in startup signout, forcing user to null.");
        currentUser = null;
        safeInvokeCallback(null);
        return;
      }
      
      // CRITICAL: If currently logged in as local dev "eggplosion", 
      // we must NOT let the Firebase Auth state change event
      // overwrite our local dev session!
      const localDevUser = safeJSONParse<any>(localStorage.getItem("nk_local_dev_user"), null);
      if ((currentUser && currentUser.email === "eggplosion") || (localDevUser && localDevUser.email === "eggplosion")) {
        debugLog("DEBUG onAuthStateChanged: keeping local dev 'eggplosion' session active.");
        if (localDevUser && localDevUser.email === "eggplosion" && (!currentUser || currentUser.email !== "eggplosion")) {
          currentUser = localDevUser;
        }
        safeInvokeCallback(currentUser);
        return;
      }

      if (user) {
        currentUser = { email: user.email, uid: user.uid };
        safeInvokeCallback(currentUser);
      } else {
        currentUser = null;
        safeInvokeCallback(null);
      }
    });
  }

  subscribers.push(callback);
  debugLog("DEBUG onAuthStateChanged: subscribers count", subscribers.length);
  
  // Fire initially
  const localDevUser = safeJSONParse<any>(localStorage.getItem("nk_local_dev_user"), null);
  if (localDevUser && localDevUser.email === "eggplosion") {
    currentUser = localDevUser;
  } else if (!currentUser) {
    const sandboxUser = safeJSONParse<any>(localStorage.getItem("nk_sandbox_user"), null);
    if (sandboxUser) {
      currentUser = sandboxUser;
    }
  }
  
  safeInvokeCallback(currentUser);
  
  return () => {
    if (unsubscribeFirebase) unsubscribeFirebase();
    const idx = subscribers.indexOf(callback);
    if (idx > -1) subscribers.splice(idx, 1);
  };
};

export interface UserProfile {
  uid: string;
  email: string;
  status: 'pending' | 'approved' | 'blocked';
  requestedAt: number;
  trialExpiresAt?: number;
}

const LOCAL_PROFILES_KEY = "nk_user_profiles_cache";

const getLocalProfiles = (): UserProfile[] => {
  return safeJSONParse<UserProfile[]>(localStorage.getItem(LOCAL_PROFILES_KEY), []);
};

const saveLocalProfiles = (profiles: UserProfile[]) => {
  try {
    if (!profiles) {
      localStorage.removeItem(LOCAL_PROFILES_KEY);
      return;
    }
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error("Failed to write local profiles cache", e);
  }
};

export const getUserProfile = async (uid: string, email: string): Promise<UserProfile> => {
  debugLog("DEBUG getUserProfile called:", { uid, email });
  if (uid === "admin-local-uid") {
    debugLog("DEBUG getUserProfile: returning admin profile");
    return { uid, email, status: "approved", requestedAt: Date.now() };
  }
  const isAdmin = email === "kitoruyasiru@gmail.com" || email === "eggplosion";
  const defaultStatus = isAdmin ? "approved" : "pending";

  let profile: UserProfile | null = null;
  let readTimedOut = false; // distinguish "timed out" from "confirmed doesn't exist"

  if (!isFallbackMode && db) {
    try {
      const docRef = doc(db, "user_profiles", uid);
      const TIMEOUT = Symbol("timeout");
      const docSnap = await Promise.race([
        getDoc(docRef),
        new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), 1200))
      ]);
      if (docSnap === TIMEOUT) {
        readTimedOut = true;
      } else if (docSnap && docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      }
      // else: read genuinely resolved and the doc really doesn't exist - safe to create below
    } catch (e) {
      console.warn("Firestore getUserProfile failed, falling back to local cache:", e);
      readTimedOut = true; // treat errors the same as "unknown", not "confirmed missing"
    }
  }

  if (!profile) {
    const local = getLocalProfiles();
    const found = local.find(p => p.uid === uid);
    if (found) {
      profile = found;
    }
  }

  // Only create (and persist) a brand-new default profile when we're CONFIDENT
  // none exists yet. If the read merely timed out/errored, we don't know that -
  // writing a fresh "pending" profile here could silently downgrade/clobber an
  // already-approved user whose read was just slow.
  if (!profile && !readTimedOut) {
    profile = {
      uid,
      email,
      status: defaultStatus,
      requestedAt: Date.now(),
      trialExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };

    if (!isFallbackMode && db) {
      try {
        const docRef = doc(db, "user_profiles", uid);
        Promise.race([
          setDoc(docRef, profile),
          new Promise((resolve) => setTimeout(resolve, 1000))
        ]).catch((e) => console.warn("Firestore setDoc background/timeout issue:", e));
      } catch (e) {
        console.warn("Firestore save of new profile failed:", e);
      }
    }

    const local = getLocalProfiles();
    local.push(profile);
    saveLocalProfiles(local);

  } else if (!profile && readTimedOut) {
    // Genuinely unknown right now (slow/offline) - return a transient in-memory
    // profile WITHOUT writing anything to Firestore, so we never overwrite a
    // real profile we just failed to read in time.
    profile = {
      uid,
      email,
      status: defaultStatus,
      requestedAt: Date.now(),
      trialExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }

  // At this point profile is always set: either read from Firestore, found in
  // local cache, freshly created, or filled in as a transient timeout fallback.
  const resolvedProfile = profile as UserProfile;

  if (isAdmin && resolvedProfile.status !== "approved") {
    resolvedProfile.status = "approved";
    if (!isFallbackMode && db) {
      try {
        const docRef = doc(db, "user_profiles", uid);
        Promise.race([
          setDoc(docRef, { status: "approved" }, { merge: true }),
          new Promise((resolve) => setTimeout(resolve, 1000))
        ]).catch(() => {});
      } catch (e) {}
    }
    const local = getLocalProfiles();
    const idx = local.findIndex(p => p.uid === uid);
    if (idx > -1) {
      local[idx].status = "approved";
      saveLocalProfiles(local);
    }
  }

  return resolvedProfile;
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  let firestoreProfiles: UserProfile[] = [];

  if (!isFallbackMode && db) {
    try {
      const querySnapshot = await Promise.race([
        getDocs(collection(db, "user_profiles")),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (querySnapshot) {
        querySnapshot.forEach((doc) => {
          firestoreProfiles.push(doc.data() as UserProfile);
        });
      }
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
