// AuthSystem — gère l'authentification Firebase (Google Sign-In).
// Le SDK Firebase compat est chargé en global via index.html.
// Ce module utilise firebase.auth() directement.

import { FIREBASE_CONFIG } from '../data/firebase-config.js';

class AuthSystemImpl {
  constructor() {
    this.user = null;
    this.ready = false;
    this._readyCallbacks = [];
    this._init();
  }

  _init() {
    // Init Firebase app (si pas déjà fait).
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    this.auth = firebase.auth();
    this.db = firebase.firestore();

    // Écoute les changements d'auth (login, logout, session restore).
    this.auth.onAuthStateChanged((user) => {
      this.user = user;
      this.ready = true;
      // Appelle tous les callbacks en attente.
      for (const cb of this._readyCallbacks) cb(user);
      this._readyCallbacks = [];
    });
  }

  /**
   * Attend que l'auth soit prête (session restore). Retourne le user ou null.
   */
  waitForAuth() {
    return new Promise((resolve) => {
      if (this.ready) return resolve(this.user);
      this._readyCallbacks.push(resolve);
    });
  }

  /**
   * Lance le popup Google Sign-In. Retourne le user connecté.
   */
  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await this.auth.signInWithPopup(provider);
      this.user = result.user;
      return this.user;
    } catch (error) {
      console.error('[AuthSystem] Google Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Déconnecte l'utilisateur.
   */
  async signOut() {
    await this.auth.signOut();
    this.user = null;
  }

  /**
   * Retourne les infos du user connecté (ou null).
   */
  getUser() {
    return this.user
      ? {
          uid: this.user.uid,
          displayName: this.user.displayName,
          email: this.user.email,
          photoURL: this.user.photoURL,
        }
      : null;
  }

  isLoggedIn() {
    return !!this.user;
  }

  // ─── Firestore helpers ──────────────────────────────────────────────

  /**
   * Sauvegarde des données dans Firestore sous saves/{uid}.
   */
  async cloudSave(data) {
    if (!this.user) return false;
    try {
      await this.db.collection('saves').doc(this.user.uid).set({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        displayName: this.user.displayName || '',
      });
      return true;
    } catch (error) {
      console.error('[AuthSystem] cloudSave failed:', error);
      return false;
    }
  }

  /**
   * Charge les données depuis Firestore.
   */
  async cloudLoad() {
    if (!this.user) return null;
    try {
      const doc = await this.db.collection('saves').doc(this.user.uid).get();
      if (!doc.exists) return null;
      return doc.data();
    } catch (error) {
      console.error('[AuthSystem] cloudLoad failed:', error);
      return null;
    }
  }

  /**
   * Supprime toutes les données du joueur (reset compte).
   */
  async cloudReset() {
    if (!this.user) return;
    try {
      await this.db.collection('saves').doc(this.user.uid).delete();
    } catch (error) {
      console.error('[AuthSystem] cloudReset failed:', error);
    }
  }
}

export const AuthSystem = new AuthSystemImpl();
