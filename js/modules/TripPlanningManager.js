class TripPlanningManager {
    constructor(app) {
        this.app = app;
        this.trips = new Map();
        this.currentTrip = null;
        this.activeEditor = null;
        this.collaborators = new Map();
        this.mapModal = null;
        this.modalMap = null;
        this.initialize();
    }

    initialize() {
        console.log('🎯 Инициализация TripPlanningManager...');
        this.loadTripsFromStorage();
        this.createTripPlanningUI();
        this.createMapModal(); // НОВЫЙ: Создаем модальное окно с картой
        this.setupEventListeners();
        console.log('✅ TripPlanningManager инициализирован');
    }

    // НОВЫЙ: Создание модального окна с картой для выбора точек
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

        // НОВЫЙ: Обработчики модального окна карты
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
                    <textarea class="day-notes" placeholder="Заметки на день..." 
                              onchange="window.adventureSync.tripPlanningManager.updateDayNotes(${index}, this.value)">${day.notes}</textarea>
                </div>
            `;
            daysList.appendChild(dayElement);
        });
    }

    renderWaypoints(waypoints, dayIndex) {
        return waypoints.map((waypoint, wpIndex) => `
            <div class="waypoint-item">
                <div class="waypoint-marker">
                    <i class="fas fa-map-pin"></i>
                </div>
                <div class="waypoint-content">
                    <input type="text" class="waypoint-name" value="${waypoint.name}" 
                           onchange="window.adventureSync.tripPlanningManager.updateWaypointName(${dayIndex}, ${wpIndex}, this.value)">
                    <div class="waypoint-meta">
                        <span class="coordinates">${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}</span>
                        <button onclick="window.adventureSync.tripPlanningManager.removeWaypoint(${dayIndex}, ${wpIndex})" 
                                class="remove-waypoint" title="Удалить точку">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ИСПРАВЛЕНО: Открытие модального окна с картой для выбора точки
    addWaypoint(dayIndex) {
        if (!this.currentTrip) return;

        this.currentDayIndex = dayIndex;
        this.selectedWaypoint = null;

        // Показываем модальное окно
        this.mapModal.classList.remove('hidden');
        this.app.notificationManager.showNotification('Выберите точку на карте или найдите место');

        // Инициализируем карту в модальном окне
        setTimeout(() => {
            this.initializeModalMap();
        }, 100);
    }

    // НОВЫЙ: Инициализация карты в модальном окне
    initializeModalMap() {
        const mapContainer = document.getElementById('waypointMapContainer');
        
        if (this.modalMap) {
            this.modalMap.remove();
        }

        try {
            this.modalMap = L.map('waypointMapContainer', {
                zoomControl: true,
                attributionControl: true
            }).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

            L.tileLayer(CONFIG.MAP.TILE_LAYER, {
                attribution: CONFIG.MAP.ATTRIBUTION,
                maxZoom: CONFIG.MAP.MAX_ZOOM
            }).addTo(this.modalMap);

            // Если есть местоположение пользователя, центрируем на нем
            if (this.app.mapManager.userLocationMarker) {
                const userPos = this.app.mapManager.userLocationMarker.getLatLng();
                this.modalMap.setView(userPos, 12);
            }

            // Добавляем обработчик клика
            this.modalMap.on('click', (e) => {
                this.selectWaypointLocation(e.latlng);
            });

            // Принудительно обновляем размер карты
            setTimeout(() => {
                this.modalMap.invalidateSize();
            }, 200);

            console.log('✅ Модальная карта инициализирована');

        } catch (error) {
            console.error('❌ Ошибка инициализации модальной карты:', error);
            this.app.notificationManager.showNotification('Ошибка инициализации карты', 'error');
        }
    }

    // НОВЫЙ: Выбор местоположения точки на карте
    selectWaypointLocation(latlng) {
        this.selectedWaypoint = {
            lat: latlng.lat,
            lng: latlng.lng,
            name: `Точка ${this.currentTrip.days[this.currentDayIndex].waypoints.length + 1}`
        };

        // Удаляем предыдущий маркер
        if (this.tempWaypointMarker) {
            this.modalMap.removeLayer(this.tempWaypointMarker);
        }

        // Добавляем новый маркер
        this.tempWaypointMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'temp-waypoint-marker',
                html: '<i class="fas fa-map-pin" style="color: #00BCD4; font-size: 20px;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.modalMap);

        // Активируем кнопку подтверждения
        document.getElementById('confirmWaypointBtn').disabled = false;

        console.log('📍 Выбрана точка:', latlng);
    }

    // НОВЫЙ: Поиск местоположения
    async searchLocation() {
        const query = document.getElementById('locationSearch').value.trim();
        if (!query) {
            this.app.notificationManager.showNotification('Введите место для поиска', 'warning');
            return;
        }

        try {
            // Простой геокодинг через Nominatim (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await response.json();

            if (results.length > 0) {
                const result = results[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);

                this.modalMap.setView([lat, lng], 14);
                this.selectWaypointLocation({ lat, lng });

                // Обновляем название точки
                this.selectedWaypoint.name = result.display_name.split(',')[0];
                this.app.notificationManager.showNotification('Место найдено на карте', 'success');
            } else {
                this.app.notificationManager.showNotification('Место не найдено', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка поиска места:', error);
            this.app.notificationManager.showNotification('Ошибка поиска места', 'error');
        }
    }

    // НОВЫЙ: Подтверждение добавления точки
    confirmWaypoint() {
        if (!this.selectedWaypoint) return;

        const waypoint = {
            id: this.generateWaypointId(),
            name: this.selectedWaypoint.name,
            lat: this.selectedWaypoint.lat,
            lng: this.selectedWaypoint.lng,
            description: '',
            type: 'waypoint'
        };

        this.currentTrip.days[this.currentDayIndex].waypoints.push(waypoint);
        this.renderTripDays();

        // Добавляем маркер на основную карту
        this.addWaypointToMainMap(waypoint, this.currentDayIndex);

        this.closeMapModal();
        this.app.notificationManager.showNotification('Точка маршрута добавлена');
    }

    // НОВЫЙ: Закрытие модального окна карты
    closeMapModal() {
        this.mapModal.classList.add('hidden');
        
        if (this.modalMap) {
            this.modalMap.remove();
            this.modalMap = null;
        }

        this.selectedWaypoint = null;
        this.currentDayIndex = null;

        // Очищаем поле поиска
        document.getElementById('locationSearch').value = '';
        document.getElementById('confirmWaypointBtn').disabled = true;
    }

    addWaypointToMainMap(waypoint, dayIndex) {
        if (!this.app.mapManager.map) return;

        const marker = L.marker([waypoint.lat, waypoint.lng], {
            icon: L.divIcon({
                className: 'trip-waypoint-marker',
                html: `<div class="waypoint-number">${this.currentTrip.days[dayIndex].waypoints.length}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.app.mapManager.map);

        marker.bindPopup(`
            <div class="waypoint-popup">
                <h4>${waypoint.name}</h4>
                <p>День ${dayIndex + 1}</p>
                <button onclick="window.adventureSync.tripPlanningManager.editWaypoint('${waypoint.id}')" 
                        style="margin-top: 5px; padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Редактировать
                </button>
            </div>
        `);

        waypoint.marker = marker;
    }

    renderCollaborators() {
        // Заглушка для будущей функциональности
        const collaboratorsList = document.getElementById('collaboratorsList');
        collaboratorsList.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Функция в разработке</p>';
    }

    saveCurrentTrip() {
        if (!this.currentTrip) return;

        this.currentTrip.title = document.getElementById('tripTitle').value;
        this.currentTrip.description = document.getElementById('tripDescription').value;
        this.currentTrip.startDate = document.getElementById('tripStartDate').value;
        this.currentTrip.endDate = document.getElementById('tripEndDate').value;
        this.currentTrip.transport = document.getElementById('tripTransport').value;
        this.currentTrip.updatedAt = new Date().toISOString();

        this.saveTripsToStorage();
        this.syncTripToServer(this.currentTrip);

        this.app.notificationManager.showNotification('Поездка сохранена', 'success');
    }

    showExportDialog() {
        if (!this.currentTrip) return;

        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Экспорт поездки</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Выберите формат для экспорта:</p>
                    <div class="export-options">
                        <button onclick="window.adventureSync.tripPlanningManager.exportTrip('gpx')" class="export-btn">
                            <i class="fas fa-map"></i> GPX файл
                        </button>
                        <button onclick="window.adventureSync.tripPlanningManager.exportTrip('kml')" class="export-btn">
                            <i class="fas fa-globe"></i> KML файл
                        </button>
                        <button onclick="window.adventureSync.tripPlanningManager.exportTrip('json')" class="export-btn">
                            <i class="fas fa-code"></i> JSON данные
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    exportTrip(format) {
        if (!this.currentTrip) return;

        let content, filename, mimeType;

        switch (format) {
            case 'gpx':
                content = this.generateGPX(this.currentTrip);
                filename = `${this.currentTrip.title}.gpx`;
                mimeType = 'application/gpx+xml';
                break;
            case 'kml':
                content = this.generateKML(this.currentTrip);
                filename = `${this.currentTrip.title}.kml`;
                mimeType = 'application/vnd.google-earth.kml+xml';
                break;
            case 'json':
                content = JSON.stringify(this.currentTrip, null, 2);
                filename = `${this.currentTrip.title}.json`;
                mimeType = 'application/json';
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        document.querySelector('.export-modal').remove();

        this.app.notificationManager.showNotification(`Поездка экспортирована в ${format.toUpperCase()}`, 'success');
    }

    generateGPX(trip) {
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Adventure Sync" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${trip.title}</name>
    <desc>${trip.description}</desc>
    <time>${trip.createdAt}</time>
  </metadata>
`;

        trip.days.forEach((day, dayIndex) => {
            if (day.waypoints.length > 0) {
                gpx += `  <trk>
    <name>День ${day.day}: ${day.title}</name>
    <desc>${day.notes}</desc>
    <trkseg>
`;
                day.waypoints.forEach(waypoint => {
                    gpx += `      <trkpt lat="${waypoint.lat}" lon="${waypoint.lng}">
        <name>${waypoint.name}</name>
        <desc>${waypoint.description || ''}</desc>
      </trkpt>
`;
                });
                gpx += `    </trkseg>
  </trk>
`;
            }
        });

        gpx += '</gpx>';
        return gpx;
    }

    generateKML(trip) {
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${trip.title}</name>
    <description>${trip.description}</description>
`;

        trip.days.forEach((day, dayIndex) => {
            if (day.waypoints.length > 0) {
                kml += `    <Folder>
      <name>День ${day.day}: ${day.title}</name>
      <description>${day.notes}</description>
`;
                day.waypoints.forEach((waypoint, wpIndex) => {
                    kml += `      <Placemark>
        <name>${waypoint.name}</name>
        <description>${waypoint.description || ''}</description>
        <Point>
          <coordinates>${waypoint.lng},${waypoint.lat},0</coordinates>
        </Point>
      </Placemark>
`;
                });
                kml += `    </Folder>
`;
            }
        });

        kml += `  </Document>
</kml>`;
        return kml;
    }

    refreshTripsList() {
        const tripsList = document.getElementById('tripsList');
        tripsList.innerHTML = '';

        if (this.trips.size === 0) {
            tripsList.innerHTML = '<p class="no-trips">У вас пока нет сохраненных поездок</p>';
            return;
        }

        this.trips.forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.className = 'trip-item';
            tripElement.innerHTML = `
                <div class="trip-info">
                    <h4>${trip.title}</h4>
                    <p class="trip-dates">${trip.startDate} — ${trip.endDate}</p>
                    <p class="trip-days">${trip.days.length} дней</p>
                </div>
                <div class="trip-actions">
                    <button onclick="window.adventureSync.tripPlanningManager.openTripEditor(window.adventureSync.tripPlanningManager.trips.get('${trip.id}'))" 
                            class="action-btn primary small">Открыть</button>
                    <button onclick="window.adventureSync.tripPlanningManager.deleteTrip('${trip.id}')" 
                            class="action-btn danger small">Удалить</button>
                </div>
            `;
            tripsList.appendChild(tripElement);
        });
    }

    // Utility methods
    generateTripId() {
        return 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateDayId() {
        return 'day_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateWaypointId() {
        return 'wp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadTripsFromStorage() {
        const stored = localStorage.getItem(CONFIG.CACHE.TRIPS_KEY);
        if (stored) {
            try {
                const tripsArray = JSON.parse(stored);
                tripsArray.forEach(trip => {
                    this.trips.set(trip.id, trip);
                });
                console.log(`📋 Загружено ${this.trips.size} поездок из локального хранилища`);
            } catch (e) {
                console.error('❌ Ошибка загрузки поездок:', e);
            }
        }
    }

    saveTripsToStorage() {
        try {
            const tripsArray = Array.from(this.trips.values());
            localStorage.setItem(CONFIG.CACHE.TRIPS_KEY, JSON.stringify(tripsArray));
            console.log(`💾 Сохранено ${tripsArray.length} поездок в локальное хранилище`);
        } catch (e) {
            console.error('❌ Ошибка сохранения поездок:', e);
        }
    }

    syncTripToServer(trip) {
        if (this.app.connectionManager && this.app.connectionManager.socket && this.app.connectionManager.socket.connected) {
            this.app.connectionManager.socket.emit('syncTrip', trip);
            console.log('📤 Поездка отправлена на сервер для синхронизации');
        }
    }

    autoSaveTrip() {
        if (this.currentTrip) {
            this.saveTripsToStorage();
        }
    }

    closeEditor() {
        this.activeEditor = null;
        this.currentTrip = null;
        document.getElementById('tripEditor').classList.add('hidden');
    }

    // Методы для обновления данных
    updateDayTitle(dayIndex, title) {
        if (this.currentTrip && this.currentTrip.days[dayIndex]) {
            this.currentTrip.days[dayIndex].title = title;
        }
    }

    updateDayNotes(dayIndex, notes) {
        if (this.currentTrip && this.currentTrip.days[dayIndex]) {
            this.currentTrip.days[dayIndex].notes = notes;
        }
    }

    updateWaypointName(dayIndex, waypointIndex, name) {
        if (this.currentTrip && this.currentTrip.days[dayIndex] && this.currentTrip.days[dayIndex].waypoints[waypointIndex]) {
            this.currentTrip.days[dayIndex].waypoints[waypointIndex].name = name;
        }
    }

    removeDay(dayIndex) {
        if (this.currentTrip && confirm('Удалить этот день?')) {
            this.currentTrip.days.splice(dayIndex, 1);
            this.currentTrip.days.forEach((day, index) => {
                day.day = index + 1;
            });
            this.renderTripDays();
            this.app.notificationManager.showNotification('День удален');
        }
    }

    removeWaypoint(dayIndex, waypointIndex) {
        if (this.currentTrip && this.currentTrip.days[dayIndex]) {
            const waypoint = this.currentTrip.days[dayIndex].waypoints[waypointIndex];
            
            if (waypoint.marker) {
                this.app.mapManager.map.removeLayer(waypoint.marker);
            }
            
            this.currentTrip.days[dayIndex].waypoints.splice(waypointIndex, 1);
            this.renderTripDays();
        }
    }

    deleteTrip(tripId) {
        if (confirm('Удалить эту поездку? Действие нельзя отменить.')) {
            this.trips.delete(tripId);
            this.saveTripsToStorage();
            this.refreshTripsList();
            
            if (this.activeEditor === tripId) {
                this.closeEditor();
            }
            
            this.app.notificationManager.showNotification('Поездка удалена');
        }
    }
}
