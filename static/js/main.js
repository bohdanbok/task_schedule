import { setupTaskHandlers } from './taskHandler.js';
import { setupCategoryHandlers } from './categoryHandler.js';
import { initializeSimpleCalendar } from './simpleCalendar.js';
import { updateCategoryDropdowns, fetchAllCategories } from './utils.js';
import { showNotification } from './notificationHandler.js';

// Функция для получения данных о погоде и обновления виджета
async function fetchWeather() {
    const apiKey = '201c10556284c82018baf0c97e225d88';
    const city = 'Miami';
    const lang = 'ru';
    const units = 'metric'; // Цельсий
    const weatherWidget = document.getElementById('weather-widget');

    if (!weatherWidget) {
        console.error('Weather widget element not found.');
        return;
    }

    try {
        // Запрос для текущей погоды
        const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}&lang=${lang}`);
        if (!currentResponse.ok) {
            throw new Error(`HTTP error! status: ${currentResponse.status} for current weather`);
        }
        const currentData = await currentResponse.json();

        const currentTemperature = Math.round(currentData.main.temp);
        const currentDescription = currentData.weather[0].description;
        const currentIconCode = currentData.weather[0].icon;
        const currentIconUrl = `http://openweathermap.org/img/wn/${currentIconCode}.png`; // Иконка текущей погоды

        let weatherHtml = `
            <div class="current-weather">
                <p>${currentData.name}: ${currentTemperature}°C, ${currentDescription}
                <img src="${currentIconUrl}" alt="${currentDescription}"></p>
            </div>
            <div class="forecast-container">
        `;

        // Запрос для прогноза на 5 дней / 3 часа
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${units}&lang=${lang}`);
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status} for forecast`);
        }
        const forecastData = await forecastResponse.json();

        // Отображаем прогноз на ближайшие 12 часов (4 записи, так как интервал 3 часа)
        for (let i = 0; i < 4; i++) {
            const forecastItem = forecastData.list[i];
            // Преобразуем UTC время в EST
            const forecastDate = new Date(forecastItem.dt * 1000);
            const forecastTime = forecastDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' });
            const forecastTemperature = Math.round(forecastItem.main.temp);
            const forecastDescription = forecastItem.weather[0].description;
            const forecastIconCode = forecastItem.weather[0].icon;
            const forecastIconUrl = `http://openweathermap.org/img/wn/${forecastIconCode}.png`;

            weatherHtml += `
                <div class="forecast-item">
                    <p>${forecastTime}</p>
                    <img src="${forecastIconUrl}" alt="${forecastDescription}">
                    <p>${forecastTemperature}°C</p>
                    <p>${forecastDescription}</p>
                </div>
            `;
        }

        weatherHtml += `</div>`;
        weatherWidget.innerHTML = weatherHtml;

    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherWidget.innerHTML = '<p>Не удалось загрузить данные о погоде.</p>';
    }
}

// Функция для получения всех задач
async function fetchAllTasks() {
    try {
        const response = await fetch('/get_all_tasks');
        const data = await response.json();
        if (data.success) {
            return data.tasks.map(task => ({
                ...task,
                date: task.deadline // Преобразуем deadline в date для календаря
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

// Функция для получения времени в пути с учетом пробок
async function fetchTravelTimes() {
    const homeAddress = '650 NE 2nd Ave, Miami';
    const workAddress = '8880 NW 20th St N, Doral';
    const apiKey = 'AIzaSyDZIk3uFh47iHkQMI1CpSFgKQ88GT0KUXQ'; // Ваш ключ Google Maps API

    const homeToWorkElement = document.getElementById('home-to-work');
    const workToHomeElement = document.getElementById('work-to-home');

    if (!homeToWorkElement || !workToHomeElement) {
        console.error('Travel time widget elements not found.');
        return;
    }

    try {
        // Убедимся, что Google Maps API загружен, прежде чем использовать его сервисы
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.DistanceMatrixService === 'undefined') {
            console.warn('Google Maps API or Distance Matrix Service not yet loaded. Retrying in 1 second...');
            setTimeout(fetchTravelTimes, 1000); // Повторить попытку через 1 секунду
            return;
        }

        const service = new google.maps.DistanceMatrixService();

        // Дом -> Работа
        service.getDistanceMatrix(
            {
                origins: [homeAddress],
                destinations: [workAddress],
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now() + 1000), // Текущее время + 1 секунда
                    trafficModel: 'bestguess',
                },
                unitSystem: google.maps.UnitSystem.METRIC, // Для получения времени в секундах
            },
            (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const durationInTraffic = response.rows[0].elements[0].duration_in_traffic.text;
                    homeToWorkElement.textContent = `🏠 → 🏢: ${durationInTraffic}`;
                } else {
                    homeToWorkElement.textContent = `🏠 → 🏢: Не удалось получить данные`;
                    console.error('Error fetching home to work travel time:', status, response);
                }
            }
        );

        // Работа -> Дом
        service.getDistanceMatrix(
            {
                origins: [workAddress],
                destinations: [homeAddress],
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now() + 1000), // Текущее время + 1 секунда
                    trafficModel: 'bestguess',
                },
                unitSystem: google.maps.UnitSystem.METRIC,
            },
            (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const durationInTraffic = response.rows[0].elements[0].duration_in_traffic.text;
                    workToHomeElement.textContent = `🏢 → 🏠: ${durationInTraffic}`;
                } else {
                    workToHomeElement.textContent = `🏢 → 🏠: Не удалось получить данные`;
                    console.error('Error fetching work to home travel time:', status, response);
                }
            }
        );

    } catch (error) {
        console.error('Error initializing travel time fetching:', error);
        homeToWorkElement.textContent = `🏠 → 🏢: Ошибка`;
        workToHomeElement.textContent = `🏢 → 🏠: Ошибка`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация обработчиков
    setupTaskHandlers();
    setupCategoryHandlers();
    
    // Получение и инициализация календаря с задачами
    const tasks = await fetchAllTasks();
    initializeSimpleCalendar(tasks);
    
    // Получение и инициализация выпадающих списков категорий
    const categories = await fetchAllCategories();
    updateCategoryDropdowns(categories);

    // Загрузка данных о погоде
    fetchWeather();

    // Загрузка данных о времени в пути
    fetchTravelTimes();

    // Делаем функцию updateCalendarEvents доступной глобально
    window.updateCalendarEvents = async () => {
        const tasks = await fetchAllTasks();
        initializeSimpleCalendar(tasks);
    };

    // Инициализация Flatpickr для полей ввода даты
    flatpickr(".deadline-input", {
        dateFormat: "d.m.Y",
        locale: "ru",
        allowInput: true,
        time_24hr: true
    });

    // Обработчики для модального окна смены пароля
    const changePasswordPopup = document.getElementById('change-password-popup');
    const settingsBtn = document.getElementById('settings-btn');
    const cancelChangePasswordBtn = document.getElementById('cancel-change-password-btn');
    const changePasswordForm = document.getElementById('change-password-form');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (changePasswordPopup) {
                changePasswordPopup.style.display = 'flex';
            }
        });
    }

    if (cancelChangePasswordBtn) {
        cancelChangePasswordBtn.addEventListener('click', () => {
            if (changePasswordPopup) {
                changePasswordPopup.style.display = 'none';
                if (changePasswordForm) changePasswordForm.reset();
            }
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(changePasswordForm);
            const currentPassword = formData.get('current_password');
            const newPassword = formData.get('new_password');
            const confirmNewPassword = formData.get('confirm_new_password');

            if (newPassword !== confirmNewPassword) {
                showNotification('Новый пароль и подтверждение не совпадают.', 'error');
                return;
            }

            try {
                const response = await fetch('/change_password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Пароль успешно изменен!', 'success');
                    if (changePasswordPopup) changePasswordPopup.style.display = 'none';
                    if (changePasswordForm) changePasswordForm.reset();
                } else {
                    showNotification('Ошибка при смене пароля: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                showNotification('Произошла ошибка при смене пароля.', 'error');
            }
        });
    }
}); 