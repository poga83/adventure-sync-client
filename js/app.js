// Инициализация карты
const map = L.map('map').setView([55.7558, 37.6173], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OSM contributors'
}).addTo(map);

// Маркеры пользователей (пример)
const userMarkers = {};
function updateUsers(users) {
  users.forEach(u=>{
    if(userMarkers[u.id]) userMarkers[u.id].setLatLng(u.pos);
    else {
      userMarkers[u.id] = L.marker(u.pos).addTo(map);
    }
  });
}

// Фильтры статусов
document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const status=btn.dataset.status;
    // TODO: применить фильтрацию маркеров по status
  };
});

// UI: гамбургер и сайдбар
const menuToggle=document.getElementById('menuToggle'),
      sidebar=document.getElementById('sidebar');
menuToggle.onclick=()=>sidebar.classList.toggle('active');

// Чат: отправка и получение (заглушка)
const chatMessages=document.getElementById('chatMessages'),
      chatInput=document.getElementById('chatInput'),
      sendBtn=document.getElementById('sendBtn');
sendBtn.onclick=sendMessage;
chatInput.addEventListener('keypress',e=>{if(e.key==='Enter')sendMessage();});
function sendMessage(){
  const text=chatInput.value.trim();
  if(!text) return;
  const msgEl=document.createElement('div');
  msgEl.textContent=`Вы: ${text}`;
  chatMessages.appendChild(msgEl);
  chatInput.value='';
  chatMessages.scrollTop=chatMessages.scrollHeight;
}
// Пример: автоподгрузка сообщения
setTimeout(()=>{const m=document.createElement('div');m.textContent='Новый пользователь подключился';chatMessages.appendChild(m);chatMessages.scrollTop=chatMessages.scrollHeight;},2000);

// Переключение видимости чата
const chatSection=document.getElementById('chat'),
      chatToggle=document.getElementById('chatToggle');
chatToggle.onclick=()=>chatSection.classList.toggle('hidden');
