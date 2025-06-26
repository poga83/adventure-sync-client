/* js/modules/NotificationManager.js */
export class NotificationManager {
  show (msg, type='info') { window.ui.notify(msg,type); }
}
window.NotificationManager = NotificationManager;

/* js/modules/AuthManager.js */
export class AuthManager {
  login (name,status){ return {id:Date.now(), name, status}; }
}
window.AuthManager = AuthManager;

/* js/modules/MapManager.js */
import { CONFIG } from '../config.js';
export class MapManager {
  init () {
    this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
    L.tileLayer(CONFIG.MAP.TILE_LAYER,{ attribution:CONFIG.MAP.ATTRIBUTION }).addTo(this.map);
  }
}
window.MapManager = MapManager;

/* js/modules/MarkerManager.js — пустая обёртка, чтобы не падало */
export class MarkerManager { }
window.MarkerManager = MarkerManager;

/* js/modules/ChatManager.js — заглушка */
export class ChatManager { }
window.ChatManager = ChatManager;

/* js/modules/TripPlanningManager.js */
export class TripPlanningManager { }
window.TripPlanningManager = TripPlanningManager;
