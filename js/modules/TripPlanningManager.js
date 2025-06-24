class TripPlanningManager {
    constructor(app) {
        this.app = app;
        this.trips = new Map();
        this.currentTrip = null;
        this.activeEditor = null;
        this.collaborators = new Map();
        this.mapModal = null;
        this.modalMap = null;
        this.currentDayIndex = null;
        this.selectedWaypoint = null;
        this.tempWaypointMarker = null;
        this.currentRouteControl = null; // НОВЫЙ: для управления маршрутами
        this.initialize();
    }

    initialize() {
        console.log('🎯 Инициализация TripPlanningManager...');
        this.loadTripsFromStorage();
        this.createTripPlanningUI();
        this.createMapModal();
        this.setupEventListeners();
        console.log('✅ TripPlanningManager инициализирован');
    }

    createMapModal() {
        this.mapModal = document.createElement('div');
        this.mapModal.id = 'waypointMapModal';
        this.mapModal.className = 'waypoint-map-modal hidden';
        this.mapModal.innerHTML = `
            <div class="map-modal-content">
                <div class="map-modal-header">
                    <h3><i class="fas fa-map-pin"></i> Выберите точку на карте</h3>
                    <button id="closeMapModal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="map-modal-body">
                    <div id="waypointMapContainer" class="waypoint-map-container"></div>
                    <div class="map-modal-controls">
                        <div class="search-controls">
                            <input type="text" id="locationSearch" placeholder="Найти место..." class="location-search-input">
                            <button id="searchLocationBtn" class="search-btn">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                        <div class="modal-actions">
                            <button id="confirmWaypointBtn" class="action-btn success" disabled>
                                <i class="fas fa-check"></i> Добавить точку
                            </button>
                            <button id="cancelWaypointBtn" class="action-btn secondary">
                                <i class="fas fa-times"></i> Отмена
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.mapModal);
    }

    createTripPlanningUI() {
        const tripPlanningPanel = document.createElement('div');
        tripPlanningPanel.id = 'tripPlanningPanel';
        tripPlanningPanel.className = 'trip-planning-panel hidden';
        tripPlanningPanel.innerHTML = `
            <div class="trip-panel-header">
                <h3><i class="fas fa-map-marked-alt"></i> Планирование поездок</h3>
                <button id="closeTripPanel" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="trip-panel-content">
                <!-- Список поездок -->
                <div class="trips-section">
                    <div class="section-header">
                        <h4>Мои поездки</h4>
                        <button id="createTripBtn" class="action-btn primary">
                            <i class="fas fa-plus"></i> Создать поездку
                        </button>
                    </div>
                    <div id="tripsList" class="trips-list"></div>
                </div>

                <!-- Редактор поездки -->
                <div id="tripEditor" class="trip-editor hidden">
                    <div class="editor-header">
                        <input type="text" id="tripTitle" placeholder="Название поездки" maxlength="100">
                        <div class="editor-actions">
                            <button id="saveTripBtn" class="action-btn success">
                                <i class="fas fa-save"></i> Сохранить
                            </button>
                            <button id="shareTripBtn" class="action-btn info">
                                <i class="fas fa-share"></i> Поделиться
                            </button>
                            <button id="exportTripBtn" class="action-btn secondary">
                                <i class="fas fa-download"></i> Экспорт
                            </button>
                        </div>
                    </div>

                    <div class="trip-details">
                        <div class="trip-meta">
                            <div class="meta-item">
                                <label>Даты поездки:</label>
                                <div class="date-range">
                                    <input type="date" id="tripStartDate">
                                    <span>—</span>
                                    <input type="date" id="tripEndDate">
                                </div>
                            </div>
                            <div class="meta-item">
                                <label>Тип транспорта:</label>
                                <select id="tripTransport">
                                    <option value="auto">🚗 Автомобиль</option>
                                    <option value="moto">🏍️ Мотоцикл</option>
                                    <option value="walking">🚶 Пешком</option>
                                    <option value="mixed">🔄 Смешанный</option>
                                </select>
                            </div>
                        </div>

                        <div class="trip-description">
                            <label>Описание:</label>
                            <textarea id="tripDescription" placeholder="Описание поездки..." maxlength="500"></textarea>
                        </div>
                    </div>

                    <!-- Дни поездки -->
                    <div class="trip-days">
                        <div class="days-header">
                            <h4>Маршрут по дням</h4>
                            <button id="addDayBtn" class="action-btn primary small">
                                <i class="fas fa-plus"></i> Добавить день
                            </button>
                        </div>
                        <div id="tripDaysList" class="days-list"></div>
                    </div>

                    <!-- Участники -->
                    <div class="trip-collaborators">
                        <div class="collaborators-header">
                            <h4>Участники</h4>
                            <button id="inviteUserBtn" class="action-btn info small">
                                <i class="fas fa-user-plus"></i> Пригласить
                            </button>
                        </div>
                        <div id="collaboratorsList" class="collaborators-list"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(tripPlanningPanel);

        // Добавляем кнопку в header
        const headerControls = document.querySelector('.header-controls');
        const tripPlanningBtn = document.createElement('button');
        tripPlanningBtn.id = 'openTripPlanningBtn';
        tripPlanningBtn.className = 'trip-planning-btn';
        tripPlanningBtn.title = 'Планирование поездок';
        tripPlanningBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i>';
        headerControls.insertBefore(tripPlanningBtn, headerControls.lastElementChild);
    }

    setupEventListeners() {
        // Открытие/закрытие панели
        document.getElementById('openTripPlanningBtn').addEventListener('click', () => {
            this.toggleTripPlanningPanel();
        });

        document.getElementById('closeTripPanel').addEventListener('click', () => {
            this.closeTripPlanningPanel();
        });

        // Создание новой поездки
        document.getElementById('createTripBtn').addEventListener('click', () => {
            this.createNewTrip();
        });

        // Сохранение поездки
        document.getElementById('saveTripBtn').addEventListener('click', () => {
            this.saveCurrentTrip();
        });

        // Экспорт поездки
        document.getElementById('exportTripBtn').addEventListener('click', () => {
            this.showExportDialog();
        });

        // Добавление дня
        document.getElementById('addDayBtn').addEventListener('click', () => {
            this.addTripDay();
        });

        // Обработчики модального окна карты
        document.getElementById('closeMapModal').addEventListener('click', () => {
            this.closeMapModal();
        });

        document.getElementById('confirmWaypointBtn').addEventListener('click', () => {
            this.confirmWaypoint();
        });

        document.getElementById('cancelWaypointBtn').addEventListener('click', () => {
            this.closeMapModal();
        });

        document.getElementById('searchLocationBtn').addEventListener('click', () => {
            this.searchLocation();
        });

        document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // Автосохранение
        setInterval(() => {
            if (this.currentTrip && this.activeEditor) {
                this.autoSaveTrip();
            }
        }, CONFIG.TRIP_PLANNING.AUTO_SAVE_INTERVAL);
    }

    toggleTripPlanningPanel() {
        const panel = document.getElementById('tripPlanningPanel');
        if (panel.classList.contains('hidden')) {
            this.openTripPlanningPanel();
        } else {
            this.closeTripPlanningPanel();
        }
    }

    openTripPlanningPanel() {
        const panel = document.getElementById('tripPlanningPanel');
        panel.classList.remove('hidden');
        this.refreshTripsList();
        this.app.notificationManager.showNotification('Открыта панель планирования поездок');
    }

    closeTripPlanningPanel() {
        const panel = document.getElementById('tripPlanningPanel');
        panel.classList.add('hidden');
        
        if (this.activeEditor) {
            this.closeEditor();
        }
    }

    createNewTrip() {
        const trip = {
            id: this.generateTripId(),
            title: 'Новая поездка',
            description: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            transport: 'auto',
            days: [this.createTripDay(1)],
            collaborators: [this.app.authManager.getCurrentUser().id],
            waypoints: [],
            routes: [],
            createdBy: this.app.authManager.getCurrentUser().id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.trips.set(trip.id, trip);
        this.openTripEditor(trip);
        this.app.notificationManager.showNotification('Создана новая поездка');
    }

    openTripEditor(trip) {
        this.currentTrip = trip;
        this.activeEditor = trip.id;

        document.getElementById('tripEditor').classList.remove('hidden');

        document.getElementById('tripTitle').value = trip.title;
        document.getElementById('tripDescription').value = trip.description;
        document.getElementById('tripStartDate').value = trip.startDate;
        document.getElementById('tripEndDate').value = trip.endDate;
        document.getElementById('tripTransport').value = trip.transport;

        this.renderTripDays();
        this.renderCollaborators();
    }

    createTripDay(dayNumber) {
        return {
            id: this.generateDayId(),
            day: dayNumber,
            title: `День ${dayNumber}`,
            description: '',
            waypoints: [],
            routes: [],
            accommodation: null,
            notes: ''
        };
    }

    addTripDay() {
        if (!this.currentTrip) return;

        const dayNumber = this.currentTrip.days.length + 1;
        const newDay = this.createTripDay(dayNumber);
        
        this.currentTrip.days.push(newDay);
        this.renderTripDays();
        
        this.app.notificationManager.showNotification(`Добавлен день ${dayNumber}`);
    }

    renderTripDays() {
        const daysList = document.getElementById('tripDaysList');
        daysList.innerHTML = '';

        this.currentTrip.days.forEach((day, index) => {
            const dayElement = document.createElement('div');
            dayElement.className = 'trip-day';
            dayElement.innerHTML = `
                <div class="day-header">
                    <div class="day-info">
                        <h5>День ${day.day}</h5>
                        <input type="text" class="day-title" value="${day.title}" 
                               onchange="window.adventureSync.tripPlanningManager.updateDayTitle(${index}, this.value)">
                    </div>
                    <div class="day-actions">
                        <button onclick="window.adventureSync.tripPlanningManager.addWaypoint(${index})" 
                                class="action-btn small info" title="Добавить точку">
                            <i class="fas fa-map-pin"></i>
                        </button>
                        <button onclick="window.adventureSync.tripPlanningManager.buildRouteBetweenWaypoints(${index})" 
                                class="action-btn small success" title="Построить маршрут" ${day.waypoints.length < 2 ? 'disabled' : ''}>
                            <i class="fas fa-route"></i>
                        </button>
                        <button onclick="window.adventureSync.tripPlanningManager.removeDay(${index})" 
                                class="action-btn small danger" title="Удалить день">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="day-content">
                    <div class="waypoints-list" id="waypoints-${index}">
                        ${this.renderWaypoints(day.waypoints, index)}
                    </div>
