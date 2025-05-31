document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    let calendar;
    if (calendarEl) {
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
        calendar.render();
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

    // Добавление категории
    document.getElementById('add-category-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/add_category', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newCategory = `
                    <div class="category" id="category-${data.category_id}">
                        <h3 class="category-header">
                            ${formData.get('category_name')}
                            <div class="button-group">
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
                this.reset();
            }
        });
    });

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
                const toggleSymbol = data.completed ? '↺' : '✓';
                const newTask = `
                    <div class="task-item" id="task-${data.task_id}" data-task-id="${data.task_id}">
                        <div id="note-display-${data.task_id}">
                            <strong class="${data.completed ? 'completed' : ''}">${formData.get('title')}</strong>
                            ${formData.get('note') ? `<p>${formData.get('note')}</p>` : ''}
                            ${formData.get('deadline') ? `<p>До: ${formData.get('deadline')}</p>` : ''}
                            <p>Создано: ${new Date().toLocaleDateString('ru-RU')}</p>
                        </div>
                        <form id="note-form-${data.task_id}" class="edit-form edit-note-form" style="display: none;">
                            <textarea name="new_note" class="input" placeholder="Введите заметку">${formData.get('note') || ''}</textarea>
                            <div class="button-group">
                                <button type="submit" class="btn btn-save">💾</button>
                                <button type="button" class="cancel-note-edit btn" data-task-id="${data.task_id}">Отмена</button>
                            </div>
                        </form>
                        <div id="deadline-form-${data.task_id}" class="edit-form" style="display: none;">
                            <form class="edit-deadline-form form-flex">
                                <input type="text" name="new_deadline" value="${formData.get('deadline') || ''}" placeholder="ДД.ММ.ГГГГ" class="input">
                                <button type="submit" class="btn btn-save">💾</button>
                                <button type="button" class="cancel-deadline-edit btn" data-task-id="${data.task_id}">Отмена</button>
                            </form>
                        </div>
                        <div class="button-group">
                            <button class="deadline-edit-button btn" data-task-id="${data.task_id}">🗓</button>
                            <button class="note-edit-button btn" data-task-id="${data.task_id}">✏</button>
                            <a href="#" class="toggle-task btn" data-task-id="${data.task_id}">${toggleSymbol}</a>
                            <a href="#" class="delete-task btn btn-danger" data-task-id="${data.task_id}">✕</a>
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