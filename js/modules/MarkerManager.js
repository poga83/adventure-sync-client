class MarkerManager {
  constructor(app) {
    this.app = app;
    this.userMarkers = new Map();
    this.users = new Map();
    this.markerClusterGroup = null;
    this.filteredStatuses = ['all'];
    this.currentUserId = null;
  }

  initialize(map) {
    const currentUser = this.app.authManager.getCurrentUser();
    if (currentUser) this.currentUserId = currentUser.id;

    this.markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15,
      maxClusterRadius: 50,
      zoomToBoundsOnClick: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 10) size = 'medium';
        if (count > 100) size = 'large';
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40)
        });
      }
    });
    map.addLayer(this.markerClusterGroup);
    this.restoreFromCache();
    this.createTestUsers();
    return this.markerClusterGroup;
  }

  createTestUsers() {
    const testUsers = [
      { id: 'test_user_1', name: 'Алексей', nickname: 'Алексей', status: 'available', position: [55.7558, 37.6173] },
      { id: 'test_user_2', name: 'Мария', nickname: 'Мария', status: 'hiking', position: [55.7617, 37.6155] },
      { id: 'test_user_3', name: 'Дмитрий', nickname: 'Дмитрий', status: 'traveling', position: [55.7539, 37.6208] },
      { id: 'test_user_4', name: 'Елена', nickname: 'Елена', status: 'busy', position: [55.7887, 37.6032] }
    ];
    setTimeout(() => {
      testUsers.forEach(user => this.addOrUpdateUser(user));
      this.app.notificationManager.showNotification(`Добавлено ${testUsers.length} пользователей для демонстрации`);
    }, 2000);
  }

  restoreFromCache() {
    const cached = localStorage.getItem('adventure_sync_positions');
    if (cached) {
      try {
        JSON.parse(cached).forEach(user => {
          if (user.id !== this.currentUserId) this.addOrUpdateUser(user);
        });
      } catch (e) {
        console.error('Ошибка загрузки кэша:', e);
      }
    }
  }

  updateUsers(users) {
    const allUsers = Array.isArray(users) ? users : [];
    localStorage.setItem('adventure_sync_positions', JSON.stringify(allUsers));
    this.userMarkers.forEach((marker, userId) => {
      if (userId !== this.currentUserId) {
        this.markerClusterGroup.removeLayer(marker);
        this.userMarkers.delete(userId);
      }
    });
    const currentUser = this.users.get(this.currentUserId);
    this.users.clear();
    if (currentUser) this.users.set(this.currentUserId, currentUser);
    let added = 0;
    allUsers.forEach(user => {
      if (user.id !== this.currentUserId) {
        this.addOrUpdateUser(user);
        added++;
      }
    });
    this.applyActivityFilter(this.filteredStatuses);
    if (this.app.uiManager) this.app.uiManager.updateUsersCount(added);
  }

  addOrUpdateUser(user) {
    if (user.id === this.currentUserId) return;
    if (!user.position || !Array.isArray(user.position) || user.position.length !== 2) return;

    this.users.set(user.id, user);
    if (this.userMarkers.has(user.id)) {
      const marker = this.userMarkers.get(user.id);
      marker.setLatLng(user.position);
      marker.setIcon(this.createUserIcon(user.status));
      marker.userStatus = user.status;
      marker.setPopupContent(this.createPopupContent(user));
    } else {
      const marker = L.marker(user.position, { icon: this.createUserIcon(user.status) })
        .bindPopup(this.createPopupContent(user), { maxWidth: 200, className: 'user-popup-container' });
      marker.userStatus = user.status;
      marker.userId = user.id;
      this.markerClusterGroup.addLayer(marker);
      this.userMarkers.set(user.id, marker);
    }
    this.applyActivityFilter(this.filteredStatuses);
  }

  removeUser(userId) {
    if (this.userMarkers.has(userId)) {
      this.markerClusterGroup.removeLayer(this.userMarkers.get(userId));
      this.userMarkers.delete(userId);
    }
    this.users.delete(userId);
    const count = Array.from(this.users.keys()).filter(id => id !== this.currentUserId).length;
    if (this.app.uiManager) this.app.uiManager.updateUsersCount(count);
  }

  updateUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      if (this.userMarkers.has(userId)) {
        const marker = this.userMarkers.get(userId);
        marker.setIcon(this.createUserIcon(status));
        marker.userStatus = status;
        marker.setPopupContent(this.createPopupContent(user));
        this.applyActivityFilter(this.filteredStatuses);
      }
    }
  }

  updateUserPosition(userId, position) {
    const user = this.users.get(userId);
    if (user) {
      user.position = position;
      if (this.userMarkers.has(userId)) {
        this.userMarkers.get(userId).setLatLng(position);
      }
    }
  }

  createUserIcon(status) {
    const iconHtml = this.getUserIcon(status);
    return L.divIcon({
      className: `user-marker user-${status}`,
      html: iconHtml,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getUserIcon(status) {
    const style = 'font-size: 16px; color: white;';
    switch (status) {
      case 'available': return `<i class="fas fa-user" style="${style}"></i>`;
      case 'hiking':    return `<i class="fas fa-hiking" style="${style}"></i>`;
      case 'traveling': return `<i class="fas fa-car" style="${style}"></i>`;
      case 'busy':      return `<i class="fas fa-clock" style="${style}"></i>`;
      default:          return `<i class="fas fa-user" style="${style}"></i>`;
    }
  }

  getStatusText(status) {
    switch (status) {
      case 'available': return 'Доступен';
      case 'hiking':    return 'В походе';
      case 'traveling': return 'Путешествую';
      case 'busy':      return 'Занят';
      default:          return 'Неизвестно';
    }
  }

  createPopupContent(user) {
    return `
      <div class="user-popup">
        <h4 class="user-popup-name">${user.name}</h4>
        <div class="user-popup-status">${this.getStatusText(user.status)}</div>
        <button onclick="window.adventureSync.openPrivateChat('${user.id}','${user.name}')" style="margin: 3px; padding: 6px 10px; background: #64b5f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">💬 Написать</button>
        <button onclick="window.adventureSync.mapManager.createRouteToUser('${user.id}')" style="margin: 3px; padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗺️ Маршрут</button>
      </div>
    `;
  }

  applyActivityFilter(statuses) {
    this.filteredStatuses = statuses;
    const currentCenter = this.app.mapManager.map.getCenter();
    const currentZoom = this.app.mapManager.map.getZoom();
    if (statuses.includes('all')) {
      this.userMarkers.forEach(marker => {
        if (!this.markerClusterGroup.hasLayer(marker)) this.markerClusterGroup.addLayer(marker);
      });
    } else {
      this.userMarkers.forEach(marker => {
        if (statuses.includes(marker.userStatus)) {
          if (!this.markerClusterGroup.hasLayer(marker)) this.markerClusterGroup.addLayer(marker);
        } else {
          if (this.markerClusterGroup.hasLayer(marker)) this.markerClusterGroup.removeLayer(marker);
        }
      });
    }
    this.app.mapManager.map.setView(currentCenter, currentZoom);
  }
}
