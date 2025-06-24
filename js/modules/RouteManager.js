import CONFIG from '../config.js';

export class RouteManager {
  constructor(app) { this.app=app; }
  async createRoute(start,end) {
    try {
      const res = await fetch(
        `${CONFIG.ROUTING.BASE_URL}/${CONFIG.ROUTING.PROFILE}/geojson`, {
        method:'POST',
        headers:{
          'Authorization':CONFIG.ROUTING.API_KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          coordinates:[[start.lng,start.lat],[end.lng,end.lat]]
        })
      });
      if(!res.ok) throw 'ORS';
      const data = await res.json();
      return this.displayRoute(data.features[0].geometry.coordinates);
    } catch {
      // OSRM fallback
      const coords=`${start.lng},${start.lat};${end.lng},${end.lat}`;
      const res2=await fetch(`${CONFIG.ROUTING.FALLBACK_URL}/driving/${coords}?overview=full&geometries=geojson`);
      const j2=await res2.json();
      if(j2.routes?.length) return this.displayRoute(j2.routes[0].geometry.coordinates);
      // Прямая
      return this.displaySimple(start,end);
    }
  }

  displayRoute(coords) {
    const latlngs=coords.map(c=>[c[1],c[0]]);
    const line=L.polyline(latlngs,{color:'#2196F3',weight:5}).addTo(this.app.mapManager.map);
    this.app.mapManager.map.fitBounds(line.getBounds(),{padding:[50,50]});
    this.app.notificationManager.showNotification('Маршрут построен', 'success');
    return line;
  }

  displaySimple(a,b) {
    const line=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color:'#FF9800',dashArray:'5,5'}).addTo(this.app.mapManager.map);
    return line;
  }
}
