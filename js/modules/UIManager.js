/* js/modules/UIManager.js */
import { CONFIG } from '../config.js';

export class UIManager {
  showError(msg) {
    console.error(msg);
    alert(`Ошибка: ${msg}`);
  }
  notify(msg, type = 'info') {
    const box = document.createElement('div');
    box.className = `notification ${type}`;
    box.textContent = msg;
    document.getElementById('notificationsContainer')?.append(box);
    setTimeout(() => box.remove(), CONFIG.UI.NOTIFICATION_TIMEOUT);
  }
}

window.UIManager = UIManager; // для глобального доступа
