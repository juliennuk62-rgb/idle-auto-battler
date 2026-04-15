// MultiTabGuard — détecte l'ouverture du jeu dans plusieurs onglets simultanément.
//
// Problème identifié par Launch Checklist : 2 onglets ouverts = le dernier save
// écrase le premier → perte de progression.
//
// Solution : BroadcastChannel pour échanger "hello" entre onglets du même user.
// Si plusieurs sessions actives détectées, on affiche un Toast warning.
//
// Ne bloque PAS la sauvegarde — juste un warning explicite pour l'utilisateur,
// qui peut choisir de fermer l'autre onglet.

import { Toast } from '../ui/ToastSystem.js';

const CHANNEL_NAME = 'idle-autobattler-tabs';
const PING_INTERVAL_MS = 8000;      // ping toutes les 8s pour tester la présence
const DETECT_WINDOW_MS = 3000;      // 3s de fenêtre pour entendre les autres

class MultiTabGuardImpl {
  constructor() {
    this._sessionId = this._makeSessionId();
    this._knownSessions = new Set(); // autres sessionIds actifs
    this._warningShown = false;
    this._channel = null;
    this._pingTimer = null;
  }

  _makeSessionId() {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /**
   * Démarre la surveillance. Appelé après login au boot.
   */
  start() {
    // Pas de BroadcastChannel dans certains navigateurs anciens → no-op
    if (typeof BroadcastChannel === 'undefined') return;

    this._channel = new BroadcastChannel(CHANNEL_NAME);
    this._channel.onmessage = (evt) => this._handleMessage(evt.data);

    // Annonce notre présence + attend 3s pour entendre les autres
    this._broadcast({ type: 'hello', from: this._sessionId });
    setTimeout(() => this._checkConflict(), DETECT_WINDOW_MS);

    // Ping régulier pour maintenir la présence détectable
    this._pingTimer = setInterval(() => {
      this._broadcast({ type: 'ping', from: this._sessionId });
    }, PING_INTERVAL_MS);

    // Au unload, informer les autres onglets qu'on part
    window.addEventListener('pagehide', () => {
      this._broadcast({ type: 'bye', from: this._sessionId });
    });
  }

  _broadcast(msg) {
    try { this._channel?.postMessage(msg); } catch {}
  }

  _handleMessage(msg) {
    if (!msg || !msg.from || msg.from === this._sessionId) return;

    if (msg.type === 'hello') {
      // Un nouvel onglet annonce sa présence → on répond pour qu'il sache qu'on est là
      this._knownSessions.add(msg.from);
      this._broadcast({ type: 'ack', from: this._sessionId });
      this._maybeWarn();
    } else if (msg.type === 'ping') {
      this._knownSessions.add(msg.from);
      // Pas de warn sur ping — déjà warné si besoin
    } else if (msg.type === 'ack') {
      this._knownSessions.add(msg.from);
      this._maybeWarn();
    } else if (msg.type === 'bye') {
      this._knownSessions.delete(msg.from);
    }
  }

  _checkConflict() {
    if (this._knownSessions.size > 0) this._maybeWarn();
  }

  _maybeWarn() {
    if (this._warningShown) return;
    if (this._knownSessions.size === 0) return;
    this._warningShown = true;

    Toast.error('⚠️ Autre session détectée', {
      desc: 'Le jeu est ouvert dans un autre onglet/fenêtre. Les sauvegardes peuvent se chevaucher — ferme l\'autre onglet pour éviter la perte de progression.',
      duration: 12000,
    });
  }

  /** Nombre d'autres onglets détectés. */
  getOtherSessions() {
    return this._knownSessions.size;
  }

  destroy() {
    if (this._pingTimer) clearInterval(this._pingTimer);
    if (this._channel) {
      this._broadcast({ type: 'bye', from: this._sessionId });
      try { this._channel.close(); } catch {}
    }
  }
}

export const MultiTabGuard = new MultiTabGuardImpl();
