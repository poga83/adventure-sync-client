/* js/modules/MapManager.js */
import { CONFIG } from '../config.js';

export class MapManager {
  init() {
    this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
    L.tileLayer(CONFIG.MAP.TILE_LAYER, { attribution: CONFIG.MAP.ATTRIBUTION }).addTo(this.map);
  }
}

window.MapManager = MapManager;
