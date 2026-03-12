import { createClient } from '@supabase/supabase-js';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  projectId: "alpfr-splunk-integration",
  appId: "1:200624997525:web:d2e0ba2e84c9faa094879c",
  storageBucket: "alpfr-splunk-integration.firebasestorage.app",
  apiKey: "AIzaSyAMu05dAHKj8h7xyHgkVL_whkL6mN8XUE4",
  authDomain: "alpfr-splunk-integration.firebaseapp.com",
  messagingSenderId: "200624997525",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const supabaseUrl = "https://auth-proxy-200624997525.us-central1.run.app";
export const supabaseAnonKey = "dummy-anon-key";

const customFetch = async (url, options = {}) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    };
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
             resolve({ data: { session: { user: { id: user.uid, email: user.email } } } });
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
      return { data: null, error: { message: e.message } };
    }
  },
  signUp: async ({ email, password }) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { data: { user: { id: credential.user.uid, email: credential.user.email } }, error: null };
    } catch(e) {
      return { data: null, error: { message: e.message } };
    }
  },
  signOut: async () => {
    await firebaseSignOut(auth);
    return { error: null };
  }
};

export const supabase = new Proxy(_supabase, {
  get(target, prop) {
    if (prop === 'auth') {
      return mockAuth;
    }
    return target[prop];
  }
});
