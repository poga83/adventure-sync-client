class TripPlanningManager {
  constructor(app) {
    this.app = app;
    this.trips = new Map();
    this.routingService = null;
    this.initialize();
  }

  async initialize() {
    this.routingService = await CONFIG.selectBestRoutingService();
    this.loadTrips();
    this.setupUI();
  }

  async buildRoute(dayIndex) {
    const day = this.currentTrip.days[dayIndex];
    if (day.waypoints.length < 2) {
      this.app.notificationManager.showNotification('Минимум 2 точки для маршрута', 'warning');
      return;
    }
    const coords = day.waypoints.map(wp => [wp.lng, wp.lat]);
    if (this.routingService === 'openrouteservice') {
      await this.routeORS(coords, dayIndex);
    } else {
      await this.routeOSRM(coords, dayIndex);
    }
  }

  async routeORS(coords, idx) {
    const res = await fetch(`${CONFIG.ROUTING.BASE_URL}/${CONFIG.ROUTING.PROFILE}/geojson`, {
      method: 'POST',
      headers: { 'Authorization': CONFIG.ROUTING.API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: coords })
    });
    const data = await res.json();
    this.displayRoute(data.features[0].geometry.coordinates, idx, 'ORS');
  }

  async routeOSRM(coords, idx) {
    const str = coords.map(c => c.join(',')).join(';');
    const res = await fetch(`${CONFIG.ROUTING.FALLBACK_URL}/driving/${str}?overview=full&geometries=geojson`);
    const data = await res.json();
    this.displayRoute(data.routes[0].geometry.coordinates, idx, 'OSRM');
  }

  displayRoute(coords, idx, provider) {
    const latlngs = coords.map(c => [c[1], c[0]]);
    const line = L.polyline(latlngs, { color: '#2196F3', weight: 5 }).addTo(this.app.mapManager.map);
    this.app.notificationManager.showNotification(`Маршрут (день ${idx+1}) через ${provider}`, 'success');
    this.activeRoute = line;
    this.app.mapManager.map.fitBounds(line.getBounds(), { padding:[50,50] });
  }
}
