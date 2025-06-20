class AuthManager {
  constructor(app) {
    this.app = app;
    this.currentUser = null;
    this.isAuthenticated = false;
    this.loginInProgress = false;
  }

  initialize() {
    this.setupEventListeners();
    this.checkStoredAuth();
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const nicknameInput = document.getElementById('nicknameInput');
    const loginBtn = document.querySelector('.login-btn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Валидация в реальном времени
    nicknameInput.addEventListener('input', () => {
      const nickname = nicknameInput.value.trim();
      loginBtn.disabled = nickname.length < 2;
    });

    // Отправка формы
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.loginInProgress) {
        this.handleLogin();
      }
    });

    // Обработка Enter
    nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!this.loginInProgress) {
          this.handleLogin();
        }
      }
    });

    // Выход
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleLogout();
    });
  }

  checkStoredAuth() {
    const storedUser = localStorage.getItem('adventure_sync_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.nickname && userData.id) {
          this.currentUser = userData;
          this.isAuthenticated = true;
          this.showApp();
          return;
        }
      } catch (e) {
        console.error('Ошибка при восстановлении пользователя:', e);
        localStorage.removeItem('adventure_sync_user');
      }
    }
    this.showLogin();
  }

  async handleLogin() {
    if (this.loginInProgress) return;

    const nicknameInput = document.getElementById('nicknameInput');
    const statusSelect = document.getElementById('statusSelect');
    const loginBtn = document.querySelector('.login-btn');

    const nickname = nicknameInput.value.trim();
    const status = statusSelect.value;

    if (nickname.length < 2) {
      this.showValidationError('Никнейм должен содержать минимум 2 символа');
      return;
    }

    this.loginInProgress = true;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подключение...';

    try {
      const userData = {
        id: this.generateUserId(),
        nickname: nickname,
        name: nickname,
        status: status,
        position: [55.7558, 37.6173],
        joinedAt: new Date().toISOString()
      };

      localStorage.setItem('adventure_sync_user', JSON.stringify(userData));
      this.currentUser = userData;
      this.isAuthenticated = true;

      this.showApp();

      setTimeout(() => {
        if (this.app.notificationManager) {
          this.app.notificationManager.showNotification(`Добро пожаловать, ${nickname}!`, 'success');
        }
      }, 500);

    } catch (error) {
      console.error('Ошибка при входе:', error);
      if (this.app.notificationManager) {
        this.app.notificationManager.showNotification('Ошибка при входе. Попробуйте снова.', 'error');
      }
    } finally {
      this.loginInProgress = false;
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
    }
  }

  handleLogout() {
    if (this.app.connectionManager) {
      this.app.connectionManager.disconnect();
    }
    localStorage.removeItem('adventure_sync_user');
    localStorage.removeItem('adventure_sync_positions');
    localStorage.removeItem('adventure_sync_messages');
    this.currentUser = null;
    this.isAuthenticated = false;
    this.showLogin();
    if (this.app.notificationManager) {
      this.app.notificationManager.showNotification('Вы вышли из системы', 'success');
    }
  }

  showLogin() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('app').classList.add('hidden');
    const nicknameInput = document.getElementById('nicknameInput');
    const statusSelect = document.getElementById('statusSelect');
    nicknameInput.value = '';
    statusSelect.value = 'available';
    setTimeout(() => nicknameInput.focus(), 100);
    const existingError = document.querySelector('.nickname-error');
    if (existingError) {
      existingError.remove();
    }
  }

  showApp() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');
    this.updateUserUI();
    setTimeout(() => {
      if (this.app.connectionManager) {
        this.app.connectionManager.connect();
      }
      if (this.app.mapManager && this.app.mapManager.map) {
        setTimeout(() => {
          this.app.mapManager.map.invalidateSize();
        }, 200);
      }
    }, 100);
  }

  updateUserUI() {
    if (!this.currentUser) return;
    const userNickname = document.getElementById('userNickname');
    const currentUserName = document.getElementById('currentUserName');
    const userStatus = document.getElementById('userStatus');
    if (userNickname) userNickname.textContent = this.currentUser.nickname;
    if (currentUserName) currentUserName.textContent = this.currentUser.nickname;
    if (userStatus) userStatus.value = this.currentUser.status;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  updateUserStatus(status) {
    if (this.currentUser) {
      this.currentUser.status = status;
      localStorage.setItem('adventure_sync_user', JSON.stringify(this.currentUser));
      this.updateUserUI();
    }
  }

  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  showValidationError(message) {
    const nicknameInput = document.getElementById('nicknameInput');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'nickname-error';
    errorDiv.style.cssText = `
      color: #e57373;
      font-size: 0.8rem;
      margin-top: 5px;
      padding: 5px;
      border-radius: 4px;
      background: rgba(229, 115, 115, 0.1);
    `;
    errorDiv.textContent = message;
    nicknameInput.parentElement.parentElement.appendChild(errorDiv);
  }
}
