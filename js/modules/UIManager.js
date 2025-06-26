/* js/modules/UIManager.js */
export class UIManager {
  showError (msg) {
    console.error(msg);
    alert(`Ошибка: ${msg}`);
  }
  notify (msg,type='info') {
    const n=document.createElement('div');
    n.className=`notification ${type}`;
    n.textContent=msg;
    document.getElementById('notificationsContainer')?.append(n);
    setTimeout(()=>n.remove(), CONFIG.UI.NOTIFICATION_TIMEOUT);
  }
}
window.UIManager = UIManager;   // глобально
