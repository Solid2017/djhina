// ─────────────────────────────────────────────────────────────────────
// Configuration de l'URL de base de l'API Djhina
// ─────────────────────────────────────────────────────────────────────
// 🔧 Adaptez selon votre environnement :
//
//   • Android Emulator  → http://10.0.2.2:3000
//   • iOS Simulator     → http://localhost:3000
//   • Appareil physique → http://<IP_DE_VOTRE_PC>:3000
//                         (ex: http://192.168.1.42:3000)
//   • Production        → https://api.djhina.td
//
// Pour trouver votre IP locale : ipconfig (Windows) / ifconfig (Mac/Linux)
// ─────────────────────────────────────────────────────────────────────

export const API_BASE = __DEV__
  ? 'http://10.33.48.121:3000'    // IP locale — à mettre à jour si elle change (ipconfig)
  : 'https://djhina-backend-production.up.railway.app';
