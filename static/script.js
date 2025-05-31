document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    let calendar;
    if (calendarEl) {
        console.log('Initializing calendar...'); // Отладка
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            locale: 'ru',
            events: window.deadlineEvents || [],
            eventDisplay: 'block',
            eventTextColor: '#ffffff',
            eventBorderColor: '#1f2937',
            eventDidMount: function(info) {
                if (info.event.extendedProps.completed) {
                    info.el.style.opacity = '0.6';
                }
            }
        });
        console.log('Rendering calendar...'); // Отладка
        calendar.render();
    } else {
        console.error('Calendar element not found!'); // Отладка
    }

    // Синхронизация существующих задач с дедлайнами
    window.deadlineEvents = window.deadlineEvents || [];
    document.querySelectorAll('.task-item').forEach(taskElement => {
        const taskId = taskElement.getAttribute('data-task-id');
        const title = taskElement.querySelector('strong').textContent;
        const noteDisplay = taskElement.querySelector(`#note-display-${taskId}`);
        const deadlineElement = Array.from(noteDisplay.querySelectorAll('p')).find(p => p.textContent.startsWith('До: '));
        const deadlineText = deadlineElement ? deadlineElement.textContent : '';
        const completed = taskElement.querySelector('strong').classList.contains('completed');
        if (deadlineText && deadlineText.startsWith('До: ')) {
            const deadline = deadlineText.replace('До: ', '');
            const deadlineDate = deadline.split('.').reverse().join('-');
            const existingEventIndex = window.deadlineEvents.findIndex(event => event.id === taskId);
            if (existingEventIndex === -1) {
                window.deadlineEvents.push({
                    id: taskId,
                    title: title,
                    start: deadlineDate,
                    color: completed ? '#6c757d' : '#dc3545',
                    completed: completed
                });
            } else {
                window.deadlineEvents[existingEventIndex] = {
                    id: taskId,
                    title: title,
                    start: deadlineDate,
                    color: completed ? '#6c757d' : '#dc3545',
                    completed: completed
                };
            }
        }
    });
    if (calendar) {
        calendar.setOption('events', window.deadlineEvents);
        calendar.render();
    }

    // Flatpickr для полей с дедлайнами
    flatpickr("input[name='deadline'], input[name='new_deadline']", {
        dateFormat: "d.m.Y",
        locale: "ru"
    });

    function updateCalendarEvents() {
        if (calendar) {
            calendar.setOption('events', window.deadlineEvents || []);
            calendar.render();
        }
    }

    // Drag-and-Drop для категорий
    const categories = document.querySelectorAll('.category');
    const container = document.querySelector('.container');

    categories.forEach(category => {
        category.addEventListener('dragstart', () => {
            category.classList.add('dragging');
        });

        category.addEventListener('dragend', () => {
            category.classList.remove('dragging');
            const newOrder = Array.from(container.querySelectorAll('.category')).map(cat => cat.id.split('-')[1]);
            console.log('New order:', newOrder);

            const formData = new FormData();
            newOrder.forEach(id => formData.append('order[]', id));

            fetch('/update_category_order', {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Category order updated successfully');
                } else {
                    console.error('Failed to update category order:', data);
                }
            })
            .catch(error => {
                console.error('Error updating category order:', error);
            });
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.category:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Сворачивание/разворачивание календаря
    const calendarToggle = document.querySelector('.calendar-toggle');
    const calendarElement = document.getElementById('calendar');
    if (calendarToggle && calendarElement) {
        calendarToggle.addEventListener('click', function () {
            const isCollapsed = calendarElement.classList.toggle('collapsed');
            calendarElement.classList.toggle('calendar-expanded', !isCollapsed);
            calendarToggle.textContent = isCollapsed ? '🔼' : '🔽';
            if (!isCollapsed && calendar) {
                console.log('Re-rendering calendar after expanding...'); // Отладка
                calendar.render(); // Перерисовываем календарь при разворачивании
            }
        });
    } else {
        console.error('Calendar toggle or calendar element not found!'); // Отладка
    }

    // Открытие и закрытие попапов
    document.getElementById('create-category-btn')?.addEventListener('click', function () {
        document.getElementById('category-popup').style.display = 'flex';
    });

    document.getElementById('create-task-btn')?.addEventListener('click', function () {
        document.getElementById('task-popup').style.display = 'flex';
    });

    document.getElementById('cancel-category-btn')?.addEventListener('click', function () {
        document.getElementById('category-popup').style.display = 'none';
        document.getElementById('add-category-form').reset();
    });

    document.getElementById('cancel-task-btn')?.addEventListener('click', function () {
        document.getElementById('task-popup').style.display = 'none';
        document.getElementById('add-task-form').reset();
    });

    document.getElementById('cancel-edit-color-btn')?.addEventListener('click', function () {
        document.getElementById('edit-color-popup').style.display = 'none';
        document.getElementById('edit-color-form').reset();
    });

    // Добавление категории
    document.getElementById('add-category-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const color = formData.get('category_color') || '#ffffff';
        fetch('/add_category', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newCategory = `
                    <div class="category" id="category-${data.category_id}" draggable="true">
                        <h3 class="category-header" style="background-color: ${color};">
                            ${formData.get('category_name')}
                            <div class="button-group">
                                <button class="edit-category-color btn" data-cat-id="${data.category_id}" title="Изменить цвет">🎨</button>
                                <button class="toggle-tasks btn" data-cat-id="${data.category_id}">🔽</button>
                                <a href="#" class="delete-category btn btn-danger" data-cat-id="${data.category_id}">✕</a>
                            </div>
                        </h3>
                        <div id="task-container-${data.category_id}" class="task-container"></div>
                    </div>`;
                const container = document.querySelector('.container');
                container.insertAdjacentHTML('beforeend', newCategory);
                const categorySelect = document.querySelector('select[name="category_id"]');
                const newOption = document.createElement('option');
                newOption.value = data.category_id;
                newOption.textContent = formData.get('category_name');
                categorySelect.appendChild(newOption);
                document.getElementById('category-popup').style.display = 'none';
                this.reset();
            }
        });
    });

    // Редактирование цвета категории
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('edit-category-color')) {
            const catId = e.target.getAttribute('data-cat-id');
            const categoryHeader = document.querySelector(`#category-${catId} .category-header`);
            const currentColor = categoryHeader.style.backgroundColor || '#ffffff';
            const colorInput = document.querySelector('#edit-color-form input[name="category_color"]');
            colorInput.value = rgbToHex(currentColor);
            document.getElementById('edit-color-popup').style.display = 'flex';
            document.getElementById('edit-color-form').dataset.catId = catId;
        }
    });

    document.getElementById('edit-color-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const catId = this.dataset.catId;
        const formData = new FormData(this);
        fetch(`/edit_category_color/${catId}`, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const categoryHeader = document.querySelector(`#category-${catId} .category-header`);
                categoryHeader.style.backgroundColor = data.color;
                document.getElementById('edit-color-popup').style.display = 'none';
                this.reset();
            }
        });
    });

    // Функция для конвертации RGB в HEX
    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const rgbValues = rgb.match(/\d+/g);
        if (!rgbValues) return '#ffffff';
        const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
        const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
        const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    // Добавление задачи
    document.getElementById('add-task-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/add_task', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const categoryId = formData.get('category_id');
                const createdAt = new Date().toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const newTask = `
                    <div class="task-item" id="task-${data.task_id}" data-task-id="${data.task_id}">
                        <div class="task-content">
                            <div id="note-display-${data.task_id}">
                                <strong class="${data.completed ? 'completed' : ''}">${formData.get('title')}</strong>
                                ${formData.get('note') ? `<p>${formData.get('note')}</p>` : ''}
                                ${formData.get('deadline') ? `<p>До: ${formData.get('deadline')}</p>` : ''}
                                <p>Создано: ${createdAt}</p>
                            </div>
                            <form id="note-form-${data.task_id}" class="edit-form edit-note-form" style="display: none;">
                                <div class="input-group">
                                    <span class="input-icon">📝</span>
                                    <textarea name="new_note" class="input" placeholder="Введите заметку">${formData.get('note') || ''}</textarea>
                                </div>
                                <div class="button-group">
                                    <button type="submit" class="btn btn-save">💾</button>
                                    <button type="button" class="cancel-note-edit btn" data-task-id="${data.task_id}">Отмена</button>
                                </div>
                            </form>
                            <div id="deadline-form-${data.task_id}" class="edit-form" style="display: none;">
                                <form class="edit-deadline-form">
                                    <div class="input-group">
                                        <span class="input-icon">🗓️</span>
                                        <input type="text" name="new_deadline" value="${formData.get('deadline') || ''}" placeholder="ДД.ММ.ГГГГ" class="input">
                                    </div>
                                    <div class="button-group">
                                        <button type="submit" class="btn btn-save">💾</button>
                                        <button type="button" class="cancel-deadline-edit btn" data-task-id="${data.task_id}">Отмена</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="deadline-edit-button btn-action" data-task-id="${data.task_id}" title="Редактировать дедлайн">🗓️</button>
                            <button class="note-edit-button btn-action" data-task-id="${data.task_id}" title="Редактировать заметку">✏️</button>
                            <a href="#" class="toggle-task btn-action" data-task-id="${data.task_id}" title="${data.completed ? 'Возобновить' : 'Завершить'}">${data.completed ? '↺' : '✓'}</a>
                            <a href="#" class="delete-task btn-action btn-action-danger" data-task-id="${data.task_id}" title="Удалить">✕</a>
                        </div>
                    </div>`;
                document.getElementById(`task-container-${categoryId}`).insertAdjacentHTML('beforeend', newTask);
                const newDeadlineInput = document.querySelector(`#deadline-form-${data.task_id} input[name="new_deadline"]`);
                if (newDeadlineInput) {
                    flatpickr(newDeadlineInput, { dateFormat: "d.m.Y", locale: "ru" });
                }
                if (data.deadline) {
                    window.deadlineEvents.push({
                        id: data.task_id,
                        title: data.title,
                        start: data.deadline,
                        color: '#dc3545',
                        completed: false
                    });
                    updateCalendarEvents();
                }
                document.getElementById('task-popup').style.display = 'none';
                this.reset();
            }
        });
    });

    // Делегирование событий для кнопок
    document.addEventListener('click', function (e) {
        const target = e.target;

        if (target.classList.contains('toggle-tasks')) {
            e.preventDefault();
            const catId = target.getAttribute('data-cat-id');
            const container = document.getElementById(`task-container-${catId}`);
            if (container) container.classList.toggle('d-none');
        }

        if (target.classList.contains('delete-category')) {
            e.preventDefault();
            const catId = target.getAttribute('data-cat-id');
            if (confirm('Вы уверены, что хотите удалить категорию?')) {
                fetch(`/delete_category/${catId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById(`category-${catId}`).remove();
                            window.deadlineEvents = window.deadlineEvents.filter(event => {
                                const taskElement = document.getElementById(`task-${event.id}`);
                                return taskElement && taskElement.closest(`#category-${catId}`) === null;
                            });
                            updateCalendarEvents();
                            const categorySelect = document.querySelector('select[name="category_id"]');
                            const optionToRemove = categorySelect.querySelector(`option[value="${catId}"]`);
                            if (optionToRemove) {
                                optionToRemove.remove();
                            }
                        }
                    });
            }
        }

        if (target.classList.contains('deadline-edit-button')) {
            const taskId = target.getAttribute('data-task-id');
            document.getElementById(`deadline-form-${taskId}`).style.display = 'block';
            document.getElementById(`note-display-${taskId}`).style.display = 'none';
            target.style.display = 'none';
        }

        if (target.classList.contains('note-edit-button')) {
            const taskId = target.getAttribute('data-task-id');
            document.getElementById(`note-form-${taskId}`).style.display = 'block';
            document.getElementById(`note-display-${taskId}`).style.display = 'none';
            target.style.display = 'none';
        }

        if (target.classList.contains('toggle-task')) {
            e.preventDefault();
            const taskId = target.getAttribute('data-task-id');
            fetch(`/toggle_task/${taskId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const taskElement = document.getElementById(`task-${taskId}`);
                        const titleElement = taskElement.querySelector('strong');
                        titleElement.classList.toggle('completed', data.completed);
                        target.textContent = data.completed ? '↺' : '✓';
                        target.setAttribute('title', data.completed ? 'Возобновить' : 'Завершить');
                        const eventIndex = window.deadlineEvents.findIndex(event => event.id === String(data.task_id));
                        if (eventIndex !== -1) {
                            window.deadlineEvents[eventIndex].color = data.color;
                            window.deadlineEvents[eventIndex].completed = data.completed;
                        }
                        updateCalendarEvents();
                    }
                });
        }

        if (target.classList.contains('delete-task')) {
            e.preventDefault();
            const taskId = target.getAttribute('data-task-id');
            if (confirm('Вы уверены, что хотите удалить задачу?')) {
                fetch(`/delete_task/${taskId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById(`task-${taskId}`).remove();
                            const eventIndex = window.deadlineEvents.findIndex(event => event.id === String(data.task_id));
                            if (eventIndex !== -1) {
                                window.deadlineEvents.splice(eventIndex, 1);
                            }
                            updateCalendarEvents();
                        }
                    });
            }
        }

        if (target.classList.contains('cancel-note-edit')) {
            const taskId = target.getAttribute('data-task-id');
            document.getElementById(`note-form-${taskId}`).style.display = 'none';
            document.getElementById(`note-display-${taskId}`).style.display = 'block';
            document.querySelector(`.note-edit-button[data-task-id="${taskId}"]`).style.display = 'inline-block';
        }

        if (target.classList.contains('cancel-deadline-edit')) {
            const taskId = target.getAttribute('data-task-id');
            document.getElementById(`deadline-form-${taskId}`).style.display = 'none';
            document.getElementById(`note-display-${taskId}`).style.display = 'block';
            document.querySelector(`.deadline-edit-button[data-task-id="${taskId}"]`).style.display = 'inline-block';
        }
    });

    // Обработчик для форм редактирования заметки
    document.addEventListener('submit', function (e) {
        if (e.target.classList.contains('edit-note-form')) {
            e.preventDefault();
            const taskId = e.target.id.split('-').pop();
            const formData = new FormData(e.target);
            fetch(`/edit_note/${taskId}`, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const noteDisplay = document.getElementById(`note-display-${taskId}`);
                    const noteP = noteDisplay.querySelector('p:not(:last-child)');
                    if (data.note) {
                        if (noteP) {
                            noteP.textContent = data.note;
                        } else {
                            noteDisplay.insertAdjacentHTML('afterbegin', `<p>${data.note}</p>`);
                        }
                    } else if (noteP) {
                        noteP.remove();
                    }
                    document.getElementById(`note-form-${taskId}`).style.display = 'none';
                    noteDisplay.style.display = 'block';
                    document.querySelector(`.note-edit-button[data-task-id="${taskId}"]`).style.display = 'inline-block';
                }
            });
        }
    });

    // Обработчик для форм редактирования дедлайна
    document.addEventListener('submit', function (e) {
        if (e.target.classList.contains('edit-deadline-form')) {
            e.preventDefault();
            const taskId = e.target.closest('.task-item').getAttribute('data-task-id');
            const formData = new FormData(e.target);
            fetch(`/edit_deadline/${taskId}`, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const noteDisplay = document.getElementById(`note-display-${taskId}`);
                    const deadlineP = Array.from(noteDisplay.querySelectorAll('p')).find(p => p.textContent.startsWith('До: '));
                    const existingEventIndex = window.deadlineEvents.findIndex(event => event.id === taskId);
                    if (data.deadline) {
                        const formattedDeadline = data.deadline.split('-').reverse().join('.');
                        if (deadlineP) {
                            deadlineP.textContent = `До: ${formattedDeadline}`;
                        } else {
                            noteDisplay.insertAdjacentHTML('beforeend', `<p>До: ${formattedDeadline}</p>`);
                        }
                        if (existingEventIndex !== -1) {
                            window.deadlineEvents[existingEventIndex].start = data.deadline;
                        } else {
                            window.deadlineEvents.push({
                                id: taskId,
                                title: noteDisplay.querySelector('strong').textContent,
                                start: data.deadline,
                                color: '#dc3545',
                                completed: false
                            });
                        }
                    } else if (deadlineP) {
                        deadlineP.remove();
                        if (existingEventIndex !== -1) {
                            window.deadlineEvents.splice(existingEventIndex, 1);
                        }
                    }
                    document.getElementById(`deadline-form-${taskId}`).style.display = 'none';
                    noteDisplay.style.display = 'block';
                    document.querySelector(`.deadline-edit-button[data-task-id="${taskId}"]`).style.display = 'inline-block';
                    updateCalendarEvents();
                }
            });
        }
    });
});