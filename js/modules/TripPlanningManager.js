class TripPlanningManager {
    constructor(app) {
        this.app = app;
        this.trips = new Map();
        this.currentTrip = null;
        this.activeEditor = null;
        this.collaborators = new Map();
        this.initialize();
    }

    initialize() {
        console.log('🎯 Инициализация TripPlanningManager...');
        this.loadTripsFromStorage();
        this.createTripPlanningUI();
        this.setupEventListeners();
        console.log('✅ TripPlanningManager инициализирован');
    }

    createTripPlanningUI() {
        // Создаем панель планирования поездок
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

        // Добавляем кнопку в header для открытия панели
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

        // Показываем редактор
        document.getElementById('tripEditor').classList.remove('hidden');

        // Заполняем данные
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

    addWaypoint(dayIndex) {
        if (!this.currentTrip) return;

        // Включаем режим выбора точки на карте
        this.app.notificationManager.showNotification('Кликните на карте для добавления точки маршрута');
        
        const originalCursor = this.app.mapManager.map.getContainer().style.cursor;
        this.app.mapManager.map.getContainer().style.cursor = 'crosshair';

        const onMapClick = (e) => {
            const waypoint = {
                id: this.generateWaypointId(),
                name: `Точка ${this.currentTrip.days[dayIndex].waypoints.length + 1}`,
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                description: '',
                type: 'waypoint'
            };

            this.currentTrip.days[dayIndex].waypoints.push(waypoint);
            this.renderTripDays();

            // Добавляем маркер на карту
            this.addWaypointMarker(waypoint, dayIndex);

            // Убираем обработчик и возвращаем курсор
            this.app.mapManager.map.off('click', onMapClick);
            this.app.mapManager.map.getContainer().style.cursor = originalCursor;

            this.app.notificationManager.showNotification('Точка маршрута добавлена');
        };

        this.app.mapManager.map.on('click', onMapClick);
    }

    addWaypointMarker(waypoint, dayIndex) {
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

        // Сохраняем ссылку на маркер
        waypoint.marker = marker;
    }

    saveCurrentTrip() {
        if (!this.currentTrip) return;

        // Обновляем данные из формы
        this.currentTrip.title = document.getElementById('tripTitle').value;
        this.currentTrip.description = document.getElementById('tripDescription').value;
        this.currentTrip.startDate = document.getElementById('tripStartDate').value;
        this.currentTrip.endDate = document.getElementById('tripEndDate').value;
        this.currentTrip.transport = document.getElementById('tripTransport').value;
        this.currentTrip.updatedAt = new Date().toISOString();

        // Сохраняем в localStorage
        this.saveTripsToStorage();

        // Отправляем на сервер (если подключен)
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

        // Создаем и скачиваем файл
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // Закрываем модальное окно
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

    // Методы для обновления данных (вызываются из HTML)
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
            // Перенумеровываем дни
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
            
            // Удаляем маркер с карты
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
