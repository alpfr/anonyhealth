import { createClient } from '@supabase/supabase-js';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";

// Firebase config from environment variables (fallback to hardcoded for dev only)
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "alpfr-splunk-integration",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:200624997525:web:d2e0ba2e84c9faa094879c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "alpfr-splunk-integration.firebasestorage.app",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAMu05dAHKj8h7xyHgkVL_whkL6mN8XUE4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "alpfr-splunk-integration.firebaseapp.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "200624997525",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://auth-proxy-200624997525.us-central1.run.app";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy-anon-key";

const customFetch = async (url, options = {}) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`
      };
    } catch (err) {
      console.error("Failed to get Firebase ID token:", err);
    }
  }
  return fetch(url, options);
};

const _supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});

// Mock Supabase Auth with Firebase Auth to avoid refactoring UI
const mockAuth = {
  getSession: async () => {
    return new Promise((resolve) => {
       const unsubscribe = onAuthStateChanged(auth, user => {
          unsubscribe();
          if (user) {
             resolve({ data: { session: { user: { id: user.uid, email: user.email }, access_token: null } } });
          } else {
             resolve({ data: { session: null } });
          }
       });
    });
  },
  onAuthStateChange: (callback) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
       if (user) {
         callback('SIGNED_IN', { user: { id: user.uid, email: user.email } });
       } else {
         callback('SIGNED_OUT', null);
       }
    });
    return { data: { subscription: { unsubscribe } } };
  },
  signInWithPassword: async ({ email, password }) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: { id: credential.user.uid, email: credential.user.email } }, error: null };
    } catch(e) {
      return { data: null, error: { message: mapFirebaseError(e.code) } };
    }
  },
  signUp: async ({ email, password }) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { data: { user: { id: credential.user.uid, email: credential.user.email } }, error: null };
    } catch(e) {
      return { data: null, error: { message: mapFirebaseError(e.code) } };
    }
  },
  signOut: async () => {
    await firebaseSignOut(auth);
    return { error: null };
  }
};

/**
 * Map Firebase error codes to user-friendly messages.
 */
const mapFirebaseError = (code) => {
  const errorMap = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/invalid-credential": "Invalid credentials. Please try again.",
  };
  return errorMap[code] || "Authentication failed. Please try again.";
};

export const supabase = new Proxy(_supabase, {
  get(target, prop) {
    if (prop === 'auth') {
      return mockAuth;
    }
    return target[prop];
  }
});
