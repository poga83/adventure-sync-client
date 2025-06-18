// Инициализация карты
const map = L.map('map').setView([55.7558, 37.6173], 10);[1]
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Маркеры пользователей
const userMarkers = {};
function updateUsers(users) {
  users.forEach(u => {
    if (userMarkers[u.id]) {
      userMarkers[u.id].setLatLng(u.pos);
    } else {
      userMarkers[u.id] = L.marker(u.pos).addTo(map);
    }
  });
}

// Фильтрация статусов
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const status = btn.dataset.status;
    // Реальная фильтрация: показать/скрыть маркеры по u.status
  });
});

// Выезжающее меню
const menuToggle = document.getElementById('menuToggle'),
      sidebar = document.getElementById('sidebar');
menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

// Чат: отправка сообщений
const chatMessages = document.getElementById('chatMessages'),
      chatInput    = document.getElementById('chatInput'),
      sendBtn      = document.getElementById('sendBtn');

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const msgEl = document.createElement('div');
  msgEl.textContent = `Вы: ${text}`;
  chatMessages.appendChild(msgEl);
  chatInput.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());

// Тоггл чата
const chatSection = document.getElementById('chat'),
      chatToggle  = document.getElementById('chatToggle');
chatToggle.addEventListener('click', () => chatSection.classList.toggle('hidden'));
