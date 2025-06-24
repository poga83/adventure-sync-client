// js/modules/UIManager.js
class UIManager {
  constructor() {}

  showError(msg) {
    alert("Ошибка: " + msg);
  }

  showNotification(msg, type = "info") {
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }
}

window.UIManager = UIManager;
