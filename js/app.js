/* js/app.js */
import { CONFIG }                     from './config.js';
import { UIManager }                  from './modules/UIManager.js';
import { NotificationManager }        from './modules/NotificationManager.js';
import { ConnectionManager }          from './modules/ConnectionManager.js';
import { AuthManager }                from './modules/AuthManager.js';
import { MapManager }                 from './modules/MapManager.js';

console.log('🚀 Запуск Adventure Sync v2.1…');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM загружен, инициализация Adventure Sync…');

  // Глобальные ссылки (чтобы старые скрипты, если есть, не падали)
  window.ui               = new UIManager();
  window.notificationMgr   = new NotificationManager();
  window.authMgr          = new AuthManager();
  window.connectionMgr    = new ConnectionManager();
  window.mapMgr           = new MapManager();

  try {
    await window.connectionMgr.connect();
    window.mapMgr.init();
  } catch (err) {
    window.ui.showError(err.message);
  }
});
