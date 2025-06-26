/* js/modules/AuthManager.js */
export class AuthManager {
  constructor() { this.user = null; }

  login(name, status) {
    if (!name || name.trim().length < 2) throw new Error('Ник слишком короткий');
    this.user = { id: `u_${Date.now()}`, name: name.trim(), status };
    localStorage.setItem('adv_user', JSON.stringify(this.user));
    return this.user;
  }

  current() { return this.user; }
}

window.AuthManager = AuthManager;
