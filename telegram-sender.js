// Конфигурация - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const CONFIG = {
    botToken: '8447449736:AAHl74xp0MiTABlqjhziVAfyvnOXQ5xawoE', // Токен вашего бота
    chatId: '-1003080294263'     // ID вашего чата
};

class TelegramSender {
    constructor() {
        this.userData = null;
        this.isInitialized = false;
    }

    // Инициализация данных пользователя
    async initialize() {
        if (this.isInitialized) return this.userData;

        try {
            this.userData = await this.collectUserData();
            this.displayUserInfo(this.userData);
            this.isInitialized = true;
            this.updateStatus('Данные собраны успешно!', 'success');
            return this.userData;
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.updateStatus('Ошибка сбора данных', 'error');
            throw error;
        }
    }

    // Сбор всех данных пользователя
    async collectUserData() {
        const ip = await this.getUserIP();
        
        return {
            ip: ip,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookies: navigator.cookieEnabled,
            javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            doNotTrack: navigator.doNotTrack || 'не поддерживается',
            // Дополнительная гео-информация
            location: await this.getLocationInfo(ip)
        };
    }

    // Получение IP адреса
    async getUserIP() {
        try {
            // Пробуем несколько сервисов
            const services = [
                'https://api.ipify.org?format=json',
                'https://api64.ipify.org?format=json',
                'https://jsonip.com'
            ];

            for (const service of services) {
                try {
                    const response = await fetch(service);
                    const data = await response.json();
                    return data.ip || data.ip;
                } catch (e) {
                    continue;
                }
            }
            return 'Не удалось определить';
        } catch (error) {
            return 'Ошибка получения IP';
        }
    }

    // Получение информации о местоположении
    async getLocationInfo(ip) {
        if (ip === 'Не удалось определить' || ip === 'Ошибка получения IP') {
            return 'Не доступно';
        }

        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            
            return {
                country: data.country_name || 'Не известно',
                city: data.city || 'Не известно',
                region: data.region || 'Не известно',
                timezone: data.timezone || 'Не известно',
                isp: data.org || 'Не известно'
            };
        } catch (error) {
            return 'Геоданные не доступны';
        }
    }

    // Отправка данных в Telegram
    async sendToTelegram() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.updateStatus('Отправка данных...', 'loading');
        this.disableButton(true);

        try {
            // Форматируем сообщение для Telegram
            const message = this.formatTelegramMessage(this.userData);
            
            const response = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CONFIG.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            const result = await response.json();

            if (result.ok) {
                this.updateStatus('✅ Данные успешно отправлены в Telegram!', 'success');
                this.saveToLocalStorage();
            } else {
                throw new Error(result.description || 'Ошибка Telegram API');
            }

            return result;
        } catch (error) {
            console.error('Ошибка отправки:', error);
            this.updateStatus('❌ Ошибка отправки: ' + error.message, 'error');
            throw error;
        } finally {
            this.disableButton(false);
        }
    }

    // Форматирование сообщения для Telegram
    formatTelegramMessage(data) {
        const locationInfo = typeof data.location === 'object' ? 
            `📍 <b>Местоположение:</b>
   Страна: ${data.location.country}
   Город: ${data.location.city}
   Регион: ${data.location.region}
   Провайдер: ${data.location.isp}` : 
            `📍 <b>Местоположение:</b> ${data.location}`;

        return `🕵️ <b>Новые данные посетителя</b>

🌐 <b>IP адрес:</b> <code>${data.ip}</code>
🕒 <b>Время:</b> ${new Date(data.timestamp).toLocaleString('ru-RU')}
🔗 <b>Страница:</b> ${data.url}

${locationInfo}

💻 <b>Системная информация:</b>
   Браузер: ${data.userAgent}
   Язык: ${data.language}
   Платформа: ${data.platform}
   Экран: ${data.screen}
   Временная зона: ${data.timezone}

⚙️ <b>Настройки:</b>
   Cookies: ${data.cookies ? 'Включены' : 'Выключены'}
   Java: ${data.javaEnabled ? 'Включена' : 'Выключена'}
   Do Not Track: ${data.doNotTrack}

#visitor #tracking`;
    }

    // Отображение информации на странице
    displayUserInfo(data) {
        const userInfoDiv = document.getElementById('userInfo');
        
        const locationText = typeof data.location === 'object' ? 
            `${data.location.city}, ${data.location.country}` : 
            data.location;

        userInfoDiv.innerHTML = `
            <h3>Собранная информация:</h3>
            <p><strong>IP адрес:</strong> ${data.ip}</p>
            <p><strong>Местоположение:</strong> ${locationText}</p>
            <p><strong>Браузер:</strong> ${data.userAgent.split(' ')[0]}</p>
            <p><strong>Платформа:</strong> ${data.platform}</p>
            <p><strong>Экран:</strong> ${data.screen}</p>
            <p><strong>Время:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
        `;
    }

    // Обновление статуса
    updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    // Блокировка/разблокировка кнопки
    disableButton(disabled) {
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = disabled;
        sendBtn.textContent = disabled ? '⏳ Отправка...' : '📨 Отправить в Telegram';
    }

    // Сохранение в localStorage
    saveToLocalStorage() {
        try {
            const visits = JSON.parse(localStorage.getItem('telegramVisits') || '[]');
            visits.push({
                ...this.userData,
                sentAt: new Date().toISOString()
            });
            localStorage.setItem('telegramVisits', JSON.stringify(visits));
        } catch (error) {
            console.warn('Не удалось сохранить в localStorage');
        }
    }

    // Показать собранные данные (для отладки)
    showDebugInfo() {
        const debugDiv = document.getElementById('debugInfo');
        const debugData = document.getElementById('debugData');
        
        debugData.textContent = JSON.stringify(this.userData, null, 2);
        debugDiv.style.display = 'block';
    }
}

// Создаем глобальный экземпляр
const telegramSender = new TelegramSender();

// Глобальные функции для HTML
async function initializeUserData() {
    await telegramSender.initialize();
}

async function collectAndSend() {
    await telegramSender.sendToTelegram();
}

function showCollectedData() {
    telegramSender.showDebugInfo();
}