class AuthManager {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    initialize() {
        this.setupEventListeners();
        this.checkStoredAuth();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // Проверка никнейма в реальном времени
        const nicknameInput = document.getElementById('nicknameInput');
        nicknameInput.addEventListener('input', (e) => {
            this.validateNickname(e.target.value);
        });
    }

    checkStoredAuth() {
        const storedUser = localStorage.getItem(CONFIG.CACHE.USER_KEY);
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (userData.nickname && userData.id) {
                    this.currentUser = userData;
                    this.showApp();
                    return;
                }
            } catch (e) {
                console.error('Ошибка при восстановлении пользователя:', e);
            }
        }
        this.showLogin();
    }

    validateNickname(nickname) {
        const trimmed = nickname.trim();
        const loginBtn = document.querySelector('.login-btn');
        const nicknameInput = document.getElementById('nicknameInput');

        // Удаляем предыдущие сообщения об ошибках
        const existingError = document.querySelector('.nickname-error');
        if (existingError) {
            existingError.remove();
        }

        if (trimmed.length < 2) {
            this.showValidationError('Никнейм должен содержать минимум 2 символа');
            loginBtn.disabled = true;
            return false;
        }

        if (trimmed.length > 20) {
            this.showValidationError('Никнейм не должен превышать 20 символов');
            loginBtn.disabled = true;
            return false;
        }

        if (!/^[a-zA-Zа-яА-Я0-9_-]+$/.test(trimmed)) {
            this.showValidationError('Никнейм может содержать только буквы, цифры, дефис и подчеркивание');
            loginBtn.disabled = true;
            return false;
        }

        loginBtn.disabled = false;
        return true;
    }

    showValidationError(message) {
        const nicknameInput = document.getElementById('nicknameInput');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'nickname-error';
        errorDiv.style.cssText = `
            color: var(--accent-red);
            font-size: 0.8rem;
            margin-top: 5px;
        `;
        errorDiv.textContent = message;
        nicknameInput.parentElement.parentElement.appendChild(errorDiv);
    }

    async handleLogin() {
        const nicknameInput = document.getElementById('nicknameInput');
        const statusSelect = document.getElementById('statusSelect');
        const loginBtn = document.querySelector('.login-btn');

        const nickname = nicknameInput.value.trim();
        const status = statusSelect.value;

        if (!this.validateNickname(nickname)) {
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подключение...';

        try {
            // Создаем пользователя
            const userData = {
                id: this.generateUserId(),
                nickname: nickname,
                name: nickname, // Для обратной совместимости
                status: status,
                position: CONFIG.MAP.DEFAULT_CENTER,
                joinedAt: new Date().toISOString()
            };

            // Сохраняем в localStorage
            localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(userData));

            this.currentUser = userData;
            this.isAuthenticated = true;

            // Показываем приложение
            this.showApp();

            // Уведомляем об успешном входе
            setTimeout(() => {
                this.app.notificationManager.showNotification(`Добро пожаловать, ${nickname}!`, 'success');
            }, 500);

        } catch (error) {
            console.error('Ошибка при входе:', error);
            this.app.notificationManager.showNotification('Ошибка при входе. Попробуйте снова.', 'error');
            
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        }
    }

    handleLogout() {
        // Отключаемся от сервера
        this.app.connectionManager.disconnect();

        // Очищаем данные
        localStorage.removeItem(CONFIG.CACHE.USER_KEY);
        localStorage.removeItem(CONFIG.CACHE.POSITIONS_KEY);
        localStorage.removeItem(CONFIG.CACHE.MESSAGES_KEY);

        this.currentUser = null;
        this.isAuthenticated = false;

        // Показываем форму входа
        this.showLogin();

        this.app.notificationManager.showNotification('Вы вышли из системы', 'success');
    }

    showLogin() {
        document.getElementById('loginModal').classList.add('active');
        document.getElementById('app').classList.add('hidden');
        
        // Фокус на поле ввода
        setTimeout(() => {
            document.getElementById('nicknameInput').focus();
        }, 100);
    }

    showApp() {
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('app').classList.remove('hidden');

        // Обновляем UI с данными пользователя
        this.updateUserUI();

        // Инициализируем соединение
        this.app.connectionManager.connect();
    }

    updateUserUI() {
        if (!this.currentUser) return;

        const userNickname = document.getElementById('userNickname');
        const currentUserName = document.getElementById('currentUserName');
        const userStatus = document.getElementById('userStatus');

        if (userNickname) {
            userNickname.textContent = this.currentUser.nickname;
        }

        if (currentUserName) {
            currentUserName.textContent = this.currentUser.nickname;
        }

        if (userStatus) {
            userStatus.value = this.currentUser.status;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUserStatus(status) {
        if (this.currentUser) {
            this.currentUser.status = status;
            localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(this.currentUser));
            this.updateUserUI();
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
