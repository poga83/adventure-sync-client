class AuthManager {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loginInProgress = false; // Флаг для предотвращения повторных отправок
    }

    initialize() {
        this.setupEventListeners();
        this.checkStoredAuth();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        // ИСПРАВЛЕНО: Правильная обработка формы с preventDefault
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Предотвращаем стандартную отправку формы
            e.stopPropagation(); // Останавливаем всплытие события
            
            if (!this.loginInProgress) {
                this.handleLogin();
            }
        });

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Валидация никнейма в реальном времени
        const nicknameInput = document.getElementById('nicknameInput');
        nicknameInput.addEventListener('input', (e) => {
            this.validateNickname(e.target.value);
        });

        // Обработка Enter в поле ввода
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!this.loginInProgress) {
                    this.handleLogin();
                }
            }
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

    validateNickname(nickname) {
        const trimmed = nickname.trim();
        const loginBtn = document.querySelector('.login-btn');
        
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

        if (!/^[a-zA-Zа-яА-Я0-9_-\s]+$/.test(trimmed)) {
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

    async handleLogin() {
        if (this.loginInProgress) return;
        
        const nicknameInput = document.getElementById('nicknameInput');
        const statusSelect = document.getElementById('statusSelect');
        const loginBtn = document.querySelector('.login-btn');

        const nickname = nicknameInput.value.trim();
        const status = statusSelect.value;

        console.log('Попытка входа:', nickname, status);

        if (!this.validateNickname(nickname)) {
            return;
        }

        this.loginInProgress = true;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подключение...';

        try {
            // Создаем пользователя
            const userData = {
                id: this.generateUserId(),
                nickname: nickname,
                name: nickname,
                status: status,
                position: [55.7558, 37.6173], // Москва по умолчанию
                joinedAt: new Date().toISOString()
            };

            console.log('Создан пользователь:', userData);

            // Сохраняем в localStorage
            localStorage.setItem('adventure_sync_user', JSON.stringify(userData));

            this.currentUser = userData;
            this.isAuthenticated = true;

            console.log('Пользователь авторизован, показываем приложение');

            // Показываем приложение
            this.showApp();

            // Уведомляем об успешном входе
            setTimeout(() => {
                if (this.app.notificationManager) {
                    this.app.notificationManager.showNotification(`Добро пожаловать, ${nickname}!`, 'success');
                }
            }, 1000);

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
        console.log('Выход из системы');
        
        // Отключаемся от сервера
        if (this.app.connectionManager) {
            this.app.connectionManager.disconnect();
        }

        // Очищаем данные
        localStorage.removeItem('adventure_sync_user');
        localStorage.removeItem('adventure_sync_positions');
        localStorage.removeItem('adventure_sync_messages');

        this.currentUser = null;
        this.isAuthenticated = false;

        // Показываем форму входа
        this.showLogin();

        if (this.app.notificationManager) {
            this.app.notificationManager.showNotification('Вы вышли из системы', 'success');
        }
    }

    showLogin() {
        console.log('Показываем форму входа');
        const loginModal = document.getElementById('loginModal');
        const app = document.getElementById('app');
        
        if (loginModal) {
            loginModal.classList.add('active');
        }
        if (app) {
            app.classList.add('hidden');
        }
        
        // Очищаем поля формы
        const nicknameInput = document.getElementById('nicknameInput');
        const statusSelect = document.getElementById('statusSelect');
        
        if (nicknameInput) {
            nicknameInput.value = '';
            setTimeout(() => nicknameInput.focus(), 100);
        }
        if (statusSelect) {
            statusSelect.value = 'available';
        }
        
        // Убираем ошибки валидации
        const existingError = document.querySelector('.nickname-error');
        if (existingError) {
            existingError.remove();
        }
    }

    showApp() {
        console.log('Показываем основное приложение');
        const loginModal = document.getElementById('loginModal');
        const app = document.getElementById('app');
        
        if (loginModal) {
            loginModal.classList.remove('active');
        }
        if (app) {
            app.classList.remove('hidden');
        }

        // Обновляем UI с данными пользователя
        this.updateUserUI();

        // ИСПРАВЛЕНО: Инициализируем соединение после показа приложения
        setTimeout(() => {
            if (this.app.connectionManager) {
                console.log('Инициализируем подключение к серверу');
                this.app.connectionManager.connect();
            }
            
            // ИСПРАВЛЕНО: Принудительно обновляем размер карты после показа
            if (this.app.mapManager && this.app.mapManager.map) {
                console.log('Обновляем размер карты');
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
            localStorage.setItem('adventure_sync_user', JSON.stringify(this.currentUser));
            this.updateUserUI();
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
