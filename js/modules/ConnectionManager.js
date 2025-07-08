import { CONFIG, pingServer } from '../config.js';

export class ConnectionManager {
  constructor() { this.socket = null; this.isConnected = false; }

  async connect() {
    if (!(await pingServer())) {
      console.error('Server unreachable');
      return false;
    }
    this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);
    this.setupSocketEvents();
    return true;
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      const user = JSON.parse(localStorage.getItem('adv_user')||'null');
      if (user) this.socket.emit('userConnected', user);
    });
    this.socket.on('users', users => this.updateUsers(users));
    this.socket.on('groupMessage', msg => this.displayMessage(msg));
    this.socket.on('userPositionChanged', data => this.updatePositionOnMap(data));
    this.socket.on('disconnect', reason => { this.isConnected = false; });
  }

  sendMessage(content, tripId) {
    if (this.isConnected) this.socket.emit('groupMessage', { content, tripId });
  }
  updatePosition({ lat, lng }) {
    if (this.isConnected) this.socket.emit('updatePosition', { lat, lng });
  }
}
window.ConnectionManager = ConnectionManager;
