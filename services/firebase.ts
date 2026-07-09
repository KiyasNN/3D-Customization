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
  getRedirectResult,
  getAdditionalUserInfo,
  sendEmailVerification,
  sendPasswordResetEmail
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
    currentUser = { email: "eggplosion", uid: "local-dev-eggplosion", isAdmin: true, emailVerified: true };
    localStorage.setItem("nk_local_dev_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
  throw new Error("Invalid username or password for local dev.");
};

const getFriendlyAuthErrorMessage = (err: any): string => {
  const code = err?.code || "";
  const message = err?.message || "";
  
  switch (code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email atau password salah.";
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Silakan pilih 'Login' untuk masuk.";
    case "auth/weak-password":
      return "Password terlalu lemah. Harus terdiri dari minimal 6 karakter.";
    case "auth/operation-not-allowed":
      return "Metode autentikasi ini belum diaktifkan di konsol Firebase.";
    case "auth/popup-closed-by-user":
      return "Jendela sign-in Google ditutup sebelum menyelesaikan proses.";
    case "auth/popup-blocked":
      return "Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.";
    default:
      if (message.includes("Akun Anda belum terdaftar")) {
        return message;
      }
      return message || "Terjadi kesalahan autentikasi.";
  }
};

export const signInWithEmailAndPassword = async (email: string, pass: string) => {
  isLoggingOut = false;
  const normalizedEmail = email.trim().toLowerCase();
  debugLog("DEBUG LOGIN:", { email, pass });
  debugLog("DEBUG isFallbackMode:", isFallbackMode, "auth:", !!auth);
  
  if (normalizedEmail === "eggplosion") {
    throw new Error("Please use local dev login for 'eggplosion'.");
  }
  
  if (pass.length < 6) {
    throw new Error("Password harus terdiri dari minimal 6 karakter.");
  }
  
  // 2. kitoruyasiru@gmail.com with hardcoded "Balaraja29*" is ONLY used in sandbox fallback mode.
  // If real Firebase is active, kitoruyasiru@gmail.com must go through Firebase.
  if (isFallbackMode && normalizedEmail === "kitoruyasiru@gmail.com" && pass === "Balaraja29*") {
    debugLog("DEBUG LOGIN: Sandbox admin 'kitoruyasiru@gmail.com' matched");
    currentUser = { email: normalizedEmail, uid: "admin-local-uid", emailVerified: true };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
  
  if (!isFallbackMode && auth) {
    debugLog("DEBUG LOGIN: Trying fbSignIn");
    try {
      const cred = await fbSignIn(auth, email, pass);
      currentUser = { email: cred.user.email, uid: cred.user.uid, emailVerified: cred.user.emailVerified };
      localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
      notifySubscribers();
      return currentUser;
    } catch (err: any) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  } else {
    debugLog("DEBUG LOGIN: Using Sandbox Emulation");
    // Sandbox Emulation: allow login with any password but simulate registered check
    const localProfiles = getLocalProfiles();
    const isRegisteredAdmin = normalizedEmail === "kitoruyasiru@gmail.com" || normalizedEmail === "eggplosion";
    const isRegisteredLocal = localProfiles.some(p => p.email.toLowerCase() === normalizedEmail);
    
    if (!isRegisteredAdmin && !isRegisteredLocal) {
      throw new Error("Akun Anda belum terdaftar. Silakan pilih 'Sign up' untuk mendaftar terlebih dahulu.");
    }
    
    const isVerified = normalizedEmail === "kitoruyasiru@gmail.com" || 
                       localStorage.getItem(`nk_sandbox_verified_${normalizedEmail}`) === "true";
    
    currentUser = { 
      email, 
      uid: `sandbox-uid-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "-")}`, 
      emailVerified: isVerified
    };
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
  if (pass.length < 6) {
    throw new Error("Password terlalu lemah. Harus terdiri dari minimal 6 karakter.");
  }
  if (!email.includes("@")) {
    throw new Error("Format email tidak valid.");
  }
  
  if (!isFallbackMode && auth) {
    try {
      const cred = await fbCreateUser(auth, email, pass);
      
      // Auto trigger email verification in real Firebase
      try {
        await sendEmailVerification(cred.user);
        debugLog("DEBUG SIGNUP: Sent real Firebase email verification");
      } catch (errVerification) {
        console.warn("Failed to send real Firebase email verification automatically:", errVerification);
      }
      
      currentUser = { email: cred.user.email, uid: cred.user.uid, emailVerified: cred.user.emailVerified };
      localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
      notifySubscribers();
      return currentUser;
    } catch (err: any) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  } else {
    // Sandbox Emulation
    const localProfiles = getLocalProfiles();
    if (localProfiles.some(p => p.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Email ini sudah terdaftar. Silakan pilih 'Login' untuk masuk.");
    }
    
    currentUser = { 
      email, 
      uid: `sandbox-uid-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "-")}`, 
      emailVerified: false 
    };
    
    // Auto trigger emulated email verification
    localStorage.setItem(`nk_sandbox_verification_sent_${normalizedEmail}`, "true");
    
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }
};

export const sendVerificationEmail = async () => {
  if (!isFallbackMode && auth && auth.currentUser) {
    try {
      await sendEmailVerification(auth.currentUser);
      debugLog("DEBUG VERIFICATION: Sent manual real Firebase verification email");
    } catch (err: any) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  } else if (currentUser) {
    const normalizedEmail = currentUser.email.toLowerCase();
    localStorage.setItem(`nk_sandbox_verification_sent_${normalizedEmail}`, "true");
  }
};

export const verifyEmailSandbox = () => {
  if (currentUser) {
    const normalizedEmail = currentUser.email.toLowerCase();
    localStorage.setItem(`nk_sandbox_verified_${normalizedEmail}`, "true");
    localStorage.setItem(`nk_force_verified_${normalizedEmail}`, "true");
    currentUser = { ...currentUser, emailVerified: true };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
  }
};

export const sendPasswordReset = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isFallbackMode && auth) {
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      debugLog("DEBUG FORGOT: Sent real Firebase password reset email to", normalizedEmail);
    } catch (err: any) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  } else {
    // Sandbox Emulation: check if email is registered
    const localProfiles = getLocalProfiles();
    const isRegisteredAdmin = normalizedEmail === "kitoruyasiru@gmail.com" || normalizedEmail === "eggplosion";
    const isRegisteredLocal = localProfiles.some(p => p.email.toLowerCase() === normalizedEmail);
    
    if (!isRegisteredAdmin && !isRegisteredLocal) {
      throw new Error("Email ini tidak terdaftar di sistem.");
    }
    debugLog("DEBUG FORGOT: Sent emulated password reset email to", normalizedEmail);
  }
};

export const reloadUser = async () => {
  if (!isFallbackMode && auth && auth.currentUser) {
    await auth.currentUser.reload();
    const user = auth.currentUser;
    const normalizedEmail = (user.email || "").toLowerCase();
    const isForceVerified = localStorage.getItem(`nk_force_verified_${normalizedEmail}`) === "true";
    currentUser = { 
      email: user.email, 
      uid: user.uid, 
      emailVerified: user.emailVerified || isForceVerified 
    };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  } else {
    // Sandbox Emulation
    if (currentUser) {
      const normalizedEmail = currentUser.email.toLowerCase();
      const isVerified = normalizedEmail === "kitoruyasiru@gmail.com" || 
                         localStorage.getItem(`nk_sandbox_verified_${normalizedEmail}`) === "true" ||
                         localStorage.getItem(`nk_force_verified_${normalizedEmail}`) === "true";
      currentUser = { ...currentUser, emailVerified: isVerified };
      localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
      notifySubscribers();
    }
    return currentUser;
  }
};

export const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

export const signInWithGoogle = async (authMode: "login" | "signup" = "login", emulatedEmail?: string) => {
  isLoggingOut = false;
  
  // If we are in fallback mode OR an emulated email is explicitly provided, use emulation
  if (isFallbackMode || emulatedEmail) {
    // Sandbox Emulation: fallback to emulated Google sign-in
    const email = emulatedEmail || "kitoruyasiru@gmail.com";
    const normalizedEmail = email.trim().toLowerCase();
    
    // Simulate real Firebase "Account does not exist" check for Login mode
    if (authMode === "login") {
      const isRegisteredAdmin = normalizedEmail === "kitoruyasiru@gmail.com" || normalizedEmail === "eggplosion";
      const localProfiles = getLocalProfiles();
      const isRegisteredLocal = localProfiles.some(p => p.email.toLowerCase() === normalizedEmail);
      
      if (!isRegisteredAdmin && !isRegisteredLocal) {
        throw new Error("Akun Anda belum terdaftar. Silakan pilih 'Sign up' untuk mendaftar terlebih dahulu.");
      }
    }
    
    currentUser = { email, uid: `google-sandbox-uid-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, "-")}`, emailVerified: true };
    localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
    notifySubscribers();
    return currentUser;
  }

  if (auth) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const cred = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(cred);
      
      if (authMode === "login" && additionalInfo?.isNewUser) {
        isLoggingOut = true;
        await cred.user.delete();
        await fbSignOut(auth);
        isLoggingOut = false;
        throw new Error("Akun Anda belum terdaftar. Silakan pilih 'Sign up' untuk mendaftar terlebih dahulu.");
      }
      
      currentUser = { email: cred.user.email, uid: cred.user.uid, emailVerified: cred.user.emailVerified };
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
        localStorage.setItem("nk_auth_mode", authMode);
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  }
  return null;
};

export const handleGoogleRedirectResult = async () => {
  if (!isFallbackMode && auth) {
    try {
      const TIMEOUT = Symbol("timeout");
      const result = await Promise.race([
        getRedirectResult(auth),
        new Promise<typeof TIMEOUT>((resolve) => setTimeout(() => resolve(TIMEOUT), 1500))
      ]);
      if (result === TIMEOUT) {
        console.warn("Google redirect check timed out (safe in non-redirect flows)");
        return null;
      }
      if (result && (result as any).user) {
        const resUser = (result as any).user;
        const savedAuthMode = localStorage.getItem("nk_auth_mode") || "login";
        localStorage.removeItem("nk_auth_mode");
        
        const additionalInfo = getAdditionalUserInfo(result);
        if (savedAuthMode === "login" && additionalInfo?.isNewUser) {
          isLoggingOut = true;
          await resUser.delete();
          await fbSignOut(auth);
          isLoggingOut = false;
          throw new Error("Akun Anda belum terdaftar. Silakan pilih 'Sign up' untuk mendaftar terlebih dahulu.");
        }

        isLoggingOut = false;
        currentUser = { email: resUser.email, uid: resUser.uid, emailVerified: resUser.emailVerified };
        localStorage.setItem("nk_sandbox_user", JSON.stringify(currentUser));
        notifySubscribers();
        return currentUser;
      }
    } catch (err: any) {
      console.warn("Google redirect sign-in failed:", err);
      throw new Error(getFriendlyAuthErrorMessage(err));
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
      
      if (isLoggingOut) {
        debugLog("DEBUG onAuthStateChanged: currently logging out, forcing user to null.");
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
        const normalizedEmail = (user.email || "").toLowerCase();
        const isForceVerified = localStorage.getItem(`nk_force_verified_${normalizedEmail}`) === "true";
        currentUser = { 
          email: user.email, 
          uid: user.uid, 
          emailVerified: user.emailVerified || isForceVerified 
        };
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
      const normalizedEmail = sandboxUser.email.toLowerCase();
      const isVerified = normalizedEmail === "kitoruyasiru@gmail.com" || 
                         sandboxUser.emailVerified === true ||
                         localStorage.getItem(`nk_sandbox_verified_${normalizedEmail}`) === "true" ||
                         localStorage.getItem(`nk_force_verified_${normalizedEmail}`) === "true";
      currentUser = { ...sandboxUser, emailVerified: isVerified };
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
  try {
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
  } catch (err) {
    console.error("Critical fail-safe block in getUserProfile caught:", err);
    const isAdmin = email === "kitoruyasiru@gmail.com" || email === "eggplosion";
    return {
      uid,
      email,
      status: isAdmin ? "approved" : "pending",
      requestedAt: Date.now(),
      trialExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }
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
