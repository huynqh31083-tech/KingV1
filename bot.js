const mineflayer = require('mineflayer');

const CONFIG = {
  host: 'kingmc.vn',
  port: 25565,
  username: 'phong302',
  password: '123123hxtcgsd',
  version: '1.21',
  playerHeadSlot: 20,          // slot cần click (0-based)
  moveInterval: 60 * 1000,     // di chuyển mỗi 1 phút
  maxWaitForEarth: 5 * 60 * 1000 // 5 phút không vào Earth -> restart
};

let moveTimer;
let earthWaitTimer;

function startBot() {
  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    auth: 'offline',
    version: CONFIG.version
  });

  let loggedIn = false;
  let joinedEarth = false;
  let loginRetries = 0;
  const MAX_LOGIN_RETRIES = 10;

  bot.on('login', () => {
    console.log(`✅ Đã vào server hub KingMC.VN với username ${CONFIG.username}`);
  });

  bot.on('spawn', () => {
    console.log('🔁 Sự kiện spawn → thử login...');
    tryLogin();
  });

  function tryLogin() {
    if (loggedIn) return;
    if (loginRetries >= MAX_LOGIN_RETRIES) {
      console.log('❌ Đăng nhập thất bại sau nhiều lần thử → restart bot sau 5s...');
      return setTimeout(reconnectBot, 5000);
    }
    loginRetries++;
    console.log(`📩 Gửi lệnh login lần ${loginRetries}...`);
    bot.chat(`/login ${CONFIG.password}`);
    setTimeout(() => {
      if (!loggedIn) tryLogin(); // retry nếu chưa login được
    }, 8000);
  }

  bot.on('message', (msg) => {
    const text = msg.toString().toLowerCase();
    console.log('💬 Tin nhắn:', text);

    // kiểm tra login thành công
    if (!loggedIn && (text.includes('bạn đã đăng nhập') || text.includes('đăng nhập thành công'))) {
      loggedIn = true;
      console.log('✅ Đăng nhập thành công, chờ 5 giây rồi mở menu...');
      setTimeout(openMenu, 5000);
      return;
    }

    // kiểm tra khi đã vào Earth
    if (!joinedEarth && text.includes('earth')) {
      joinedEarth = true;
      console.log('🌍 Đã vào server Earth!');
      clearTimeout(earthWaitTimer);
      startMoveLoop();
    }
  });

  function openMenu() {
    console.log('🖱️ Click chuột phải để mở menu...');
    bot.activateItem();
    setTimeout(() => {
      const w = bot.currentWindow || bot.window;
      if (w) {
        console.log('📂 Menu đã mở! Click slot', CONFIG.playerHeadSlot);
        bot.clickWindow(CONFIG.playerHeadSlot, 0, 0).then(() => {
          console.log('✅ Đã click Player Head dòng 21, chờ vào Earth...');
          // Nếu sau 5p chưa vào Earth → restart
          clearTimeout(earthWaitTimer);
          earthWaitTimer = setTimeout(() => {
            if (!joinedEarth) {
              console.log('⚠️ Quá 5 phút vẫn chưa vào Earth → restart bot...');
              reconnectBot();
            }
          }, CONFIG.maxWaitForEarth);
        }).catch(e => console.log('❌ Lỗi click:', e.message));
      } else {
        console.log('❌ Không thấy menu, thử lại sau 3 giây...');
        setTimeout(openMenu, 3000);
      }
    }, 2000);
  }

  // Di chuyển ngẫu nhiên + xoay 180° mỗi phút
  function startMoveLoop() {
    clearInterval(moveTimer);
    moveTimer = setInterval(() => {
      const keys = ['forward', 'back', 'left', 'right'];
      const key = keys[Math.floor(Math.random() * keys.length)];
      bot.setControlState(key, true);
      console.log(`🚶 Di chuyển ${key}...`);
      setTimeout(() => bot.setControlState(key, false), 2000);

      const yaw = (bot.entity.yaw + Math.PI) % (2 * Math.PI);
      bot.look(yaw, 0, false);
      console.log('↩️ Đã xoay 180°.');
    }, CONFIG.moveInterval);
  }

  // Khi bị kick hoặc mất kết nối
  bot.on('end', () => {
    console.log('⚠️ Mất kết nối hoặc server bảo trì → reconnect sau 5s...');
    reconnectBot();
  });

  bot.on('kicked', (reason) => {
    console.log('🦶 Bị kick khỏi server:', reason);
    reconnectBot();
  });

  bot.on('error', (err) => {
    console.log('❌ Lỗi:', err.message);
  });

  // Hàm reconnect
  function reconnectBot() {
    clearInterval(moveTimer);
    clearTimeout(earthWaitTimer);
    console.log('🔁 Đang khởi động lại bot...');
    setTimeout(startBot, 5000);
  }

  // Thoát an toàn
  process.on('SIGINT', () => {
    console.log('🛑 Dừng bot.');
    clearInterval(moveTimer);
    clearTimeout(earthWaitTimer);
    bot.quit();
    process.exit(0);
  });
}

startBot();
