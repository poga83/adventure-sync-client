class UIManager {
    constructor(app) {
        this.app = app;
        this.sidebarOpen = false;
        this.chatCollapsed = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Меню-гамбургер
        document.getElementById('menuToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Фильтры пользователей - ИСПРАВЛЕНО
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFilterClick(btn);
            });
        });

        // Переключение чата
        document.getElementById('chatToggle').addEventListener('click', () => {
            this.toggleChat();
        });

        // Изменение статуса пользователя
        document.getElementById('userStatus').addEventListener('change', (e) => {
            const status = e.target.value;
            this.app.authManager.updateUserStatus(status);
            this.app.connectionManager.updateUserStatus(status);
        });

        // Закрытие сайдбара при клике вне его
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');
            
            if (this.sidebarOpen && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                this.closeSidebar();
            }
        });

        // ESC для закрытия модальных окон
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('privateChatModal').classList.contains('active')) {
                    this.closePrivateChat();
                } else if (this.sidebarOpen) {
                    this.closeSidebar();
                }
            }
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            sidebar.classList.add('active');
            menuToggle.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            menuToggle.classList.remove('active');
        }

        // Обновляем размер карты
        setTimeout(() => {
            if (this.app.mapManager.map) {
                this.app.mapManager.map.invalidateSize();
            }
        }, 300);
    }

    closeSidebar() {
        if (this.sidebarOpen) {
            this.toggleSidebar();
        }
    }

    handleFilterClick(button) {
        const status = button.dataset.status;
        
        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Добавляем активный класс к выбранной кнопке
        button.classList.add('active');
        
        // Применяем фильтр
        if (status === 'all') {
            this.app.markerManager.applyActivityFilter(['all']);
        } else {
            this.app.markerManager.applyActivityFilter([status]);
        }

        console.log('Фильтр применен:', status); // Для отладки
    }

    toggleChat() {
        const chatContainer = document.getElementById('chatContainer');
        const toggleIcon = document.querySelector('#chatToggle i');
        
        this.chatCollapsed = !this.chatCollapsed;
        
        if (this.chatCollapsed) {
            chatContainer.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
        } else {
            chatContainer.style.display = 'flex';
            toggleIcon.className = 'fas fa-chevron-up';
        }
    }

    openPrivateChat(userId, userName) {
        const modal = document.getElementById('privateChatModal');
        const userNameElement = document.getElementById('privateChatUserName');
        
        userNameElement.textContent = userName;
        modal.classList.add('active');
        
        // Инициируем приватный чат
        this.app.chatManager.openPrivateChat(userId, userName);
        
        // Фокус на поле ввода
        setTimeout(() => {
            document.getElementById('privateMessageInput').focus();
        }, 100);
    }

    closePrivateChat() {
        const modal = document.getElementById('privateChatModal');
        modal.classList.remove('active');
        this.app.chatManager.chatPartner = null;
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = statusElement.querySelector('span');
        
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Онлайн';
                setTimeout(() => {
                    statusElement.style.opacity = '0.7';
                }, 2000);
                break;
            case 'disconnected':
                statusText.textContent = 'Оффлайн';
                statusElement.style.opacity = '1';
                break;
            case 'connecting':
                statusText.textContent = 'Подключение...';
                statusElement.style.opacity = '1';
                break;
        }
    }

    updateUsersCount(count) {
        const usersCountElement = document.getElementById('usersCount');
        if (usersCountElement) {
            usersCountElement.textContent = count;
        }
    }

    showNotification(message, type = 'success') {
        this.app.notificationManager.showNotification(message, type);
    }

    handleResize() {
        // Закрываем сайдбар на мобильных при изменении ориентации
        if (window.innerWidth > 768 && this.sidebarOpen) {
            this.closeSidebar();
        }

        // Обновляем размер карты
        if (this.app.mapManager.map) {
            setTimeout(() => {
                this.app.mapManager.map.invalidateSize();
            }, 100);
        }
    }

    highlightNewMessage() {
        // Визуальная индикация нового сообщения
        const chatHeader = document.querySelector('.chat-header h3');
        if (chatHeader && !this.sidebarOpen) {
            chatHeader.style.color = 'var(--accent-orange)';
            setTimeout(() => {
                chatHeader.style.color = 'var(--text-primary)';
            }, 3000);
        }
    }
}
