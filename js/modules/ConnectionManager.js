import {CONFIG,pingServer} from '../config.js';
export class ConnectionManager {
  constructor(){this.socket=null;this.isConnected=false;}
  async connect(){
    if(!(await pingServer()))throw new Error('Server unreachable');
    this.socket=io(CONFIG.SERVER_URL,CONFIG.SOCKET);
    this.socket.on('connect',()=>{this.isConnected=true;});
    this.socket.on('users',u=>this.updateUsers(u));
    this.socket.on('groupMessage',m=>this.displayMessage(m));
  }
  updateUsers(users){/* обновление UI */}
  displayMessage(msg){/* обновление UI */}
  sendMessage(c,tripId){this.socket.emit('groupMessage',{content:c,tripId});}
  updatePosition(p){this.socket.emit('updatePosition',p);}
}
window.ConnectionManager=ConnectionManager;
