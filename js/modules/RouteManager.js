class RouteManager {
  constructor(app) {
    this.app = app;
    this.routingControl = null;
    this.currentRoute = null;
    this.routeLayer = null;
  }

  initialize(map) {
    this.map = map;
    this.addRouteControls();
  }

  addRouteControls() {
    const routeControl = L.control({ position: 'topleft' });
    routeControl.onAdd = (map) => {
      const container = L.DomUtil.create('div', 'route-control');
      container.innerHTML = `<button id="clearRouteBtn" title="Очистить маршрут" class="control-btn" style="display: none;"><i class="fas fa-times"></i> Очистить маршрут</button>`;
      container.querySelector('#clearRouteBtn').onclick = () => this.clearRoute();
      return container;
    };
    routeControl.addTo(this.map);
  }

  createRoute(start, end) {
    this.clearRoute();

    try {
      // Создаем прямую линию между точками
      this.routeLayer = L.polyline([start, end], {
        color: '#2196F3',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(this.map);

      // Добавляем маркеры начала и конца
      const startMarker = L.marker(start, {
        icon: L.divIcon({
          className: 'route-marker start-marker',
          html: '<i class="fas fa-play" style="color: #4CAF50; font-size: 14px;"></i>',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);

      const endMarker = L.marker(end, {
        icon: L.divIcon({
          className: 'route-marker end-marker',
          html: '<i class="fas fa-flag-checkered" style="color: #f44336; font-size: 14px;"></i>',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);

      this.currentRoute = { line: this.routeLayer, startMarker, endMarker };

      // Подгоняем карту под маршрут
      const group = new L.featureGroup([this.routeLayer, startMarker, endMarker]);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });

      // Показываем кнопку очистки
      document.getElementById('clearRouteBtn').style.display = 'block';

      // Показываем информацию о маршруте
      const distance = this.calculateDistance(start, end);
      let routeInfo = document.getElementById('routeInfo');
      if (routeInfo) routeInfo.remove();
      routeInfo = document.createElement('div');
      routeInfo.id = 'routeInfo';
      routeInfo.innerHTML = `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; position: fixed; top: 80px; left: 20px; z-index: 1000;">
          <h4>Информация о маршруте</h4>
          <p>Расстояние: ~${distance.toFixed(2)} км</p>
          <p>Время в пути: ~${Math.ceil(distance / 5)} мин пешком</p>
          <small>Приблизительные данные</small>
        </div>
      `;
      document.body.appendChild(routeInfo);

      // Автоматически удаляем через 10 секунд
      setTimeout(() => {
        if (document.getElementById('routeInfo')) {
          document.getElementById('routeInfo').remove();
        }
      }, 10000);

      this.app.notificationManager.showNotification('Маршрут построен', 'success');
    } catch (error) {
      console.error('Ошибка при создании маршрута:', error);
      this.app.notificationManager.showNotification('Ошибка при построении маршрута', 'error');
    }
  }

  calculateDistance(latlng1, latlng2) {
    const lat1 = latlng1.lat || latlng1[0];
    const lng1 = latlng1.lng || latlng1[1];
    const lat2 = latlng2.lat || latlng2[0];
    const lng2 = latlng2.lng || latlng2[1];
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  clearRoute() {
    if (this.currentRoute) {
      if (this.currentRoute.line) this.map.removeLayer(this.currentRoute.line);
      if (this.currentRoute.startMarker) this.map.removeLayer(this.currentRoute.startMarker);
      if (this.currentRoute.endMarker) this.map.removeLayer(this.currentRoute.endMarker);
      this.currentRoute = null;
    }
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) routeInfo.remove();
    const clearBtn = document.getElementById('clearRouteBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    this.app.notificationManager.showNotification('Маршрут удален');
  }

  createRouteToCoordinates(lat, lng) {
    if (!this.app.mapManager.userLocationMarker) {
      this.app.notificationManager.showNotification('Ваше местоположение не определено', 'error');
      return;
    }
    const from = this.app.mapManager.userLocationMarker.getLatLng();
    const to = L.latLng(lat, lng);
    this.createRoute(from, to);
  }
}
