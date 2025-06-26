/* js/app.js */
import { UIManager }            from './modules/UIManager.js';
import { NotificationManager }  from './modules/NotificationManager.js';
import { AuthManager }          from './modules/AuthManager.js';
import { ConnectionManager }    from './modules/ConnectionManager.js';
import { MapManager }           from './modules/MapManager.js';

console.log('🚀 Adventure Sync ‑ инициализация…');

document.addEventListener('DOMContentLoaded', async () => {
  window.ui    = new UIManager();
  window.note  = new NotificationManager();
  window.auth  = new AuthManager();
  window.conn  = new ConnectionManager();
  window.map   = new MapManager();

  try {
    await window.conn.connect();
    window.map.init();
  } catch (e) {
    window.ui.showError(e.message);
  }

  // простейшая авторизация (для теста)
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const name   = document.getElementById('nickname').value;
    const status = document.getElementById('status').value;
    try {
      const user = window.auth.login(name, status);
      window.ui.notify(`Добро пожаловать, ${user.name}!`, 'success');
      document.getElementById('loginModal').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
    } catch (err) {
      document.getElementById('nicknameError').textContent = err.message;
      document.getElementById('nicknameError').classList.remove('hidden');
    }
  });
});
