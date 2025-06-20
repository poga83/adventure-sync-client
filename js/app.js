class AdventureSync {
  constructor() {
    this.notificationManager = new NotificationManager();
    this.authManager = new AuthManager(this);
    this.uiManager = new UIManager(this);
    this.connectionManager = new ConnectionManager(this);
    this.mapManager = new MapManager(this);
    this.markerManager = new MarkerManager(this);
    this.chatManager = new ChatManager(this);
    this.routeManager = new RouteManager(this);
    this.init();
  }

  init() {
    this.authManager.initialize();
    window.adventureSync = this;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AdventureSync();
});
