/* js/modules/NotificationManager.js */
export class NotificationManager {
  show(msg, type = 'info') { window.ui.notify(msg, type); }
}
window.NotificationManager = NotificationManager;
