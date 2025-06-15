let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let allTasks = []; // Добавляем глобальную переменную для хранения задач

const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export function renderCalendar(tasks = []) {
    allTasks = tasks; // Обновляем список задач

    const daysContainer = document.getElementById('calendar-days');
    const currentMonthYearSpan = document.getElementById('currentMonthYear');
    if (!daysContainer || !currentMonthYearSpan) return;

    daysContainer.innerHTML = '';
    currentMonthYearSpan.textContent = `${monthNames[currentMonth]} ${currentYear} г.`;

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Добавляем пустые дни для выравнивания по сетке
    for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) { // Adjusted for Monday start
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        daysContainer.appendChild(emptyDay);
    }

    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        dayEl.textContent = day;

        const today = new Date();
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayEl.classList.add('current-day');
        }

        // Логика для пометки дней с задачами
        const formattedDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTasksForDay = allTasks.some(task => task.date === formattedDay && !task.completed);
        if (hasTasksForDay) {
            dayEl.classList.add('has-task');
        }

        // Добавляем обработчик клика для дня
        dayEl.addEventListener('click', () => {
            const tasksForDay = allTasks.filter(task => task.date === formattedDay);
            if (tasksForDay.length > 0) {
                // Прокручиваем к первой задаче этого дня
                const firstTaskElement = document.querySelector(`[data-task-deadline="${formattedDay}"]`);
                if (firstTaskElement) {
                    firstTaskElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });

        daysContainer.appendChild(dayEl);
    }
}

export function setupCalendarNavigation() {
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

export function setupCalendarToggle() {
    const calendarToggle = document.querySelector('.calendar-toggle');
    const calendarWrapper = document.querySelector('.calendar-wrapper');
    const toggleIcon = calendarToggle?.querySelector('.toggle-icon');

    if (calendarToggle && calendarWrapper && toggleIcon) {
        // Устанавливаем начальное состояние и иконку
        const isInitiallyCollapsed = calendarWrapper.classList.contains('calendar-collapsed');
        toggleIcon.textContent = isInitiallyCollapsed ? '🔼' : '🔽';

        calendarToggle.addEventListener('click', function () {
            const isCollapsed = calendarWrapper.classList.toggle('calendar-collapsed');
            toggleIcon.textContent = isCollapsed ? '🔼' : '🔽';
        });
    }
}

export function initializeSimpleCalendar(tasks = []) {
    renderCalendar(tasks);
    setupCalendarNavigation();
    setupCalendarToggle();
}

// Функция для обновления календаря извне
export function updateCalendarWithTasks(tasks) {
    renderCalendar(tasks);
} 