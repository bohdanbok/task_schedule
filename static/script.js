document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    let calendar;
    if (calendarEl) {
        console.log('Initializing calendar...');
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
        console.log('Rendering calendar...');
        calendar.render();
    } else {
        console.error('Calendar element not found!');
    }

    window.deadlineEvents = window.deadlineEvents || [];
    document.querySelectorAll('.task-item').forEach(taskElement => {
        const taskId = taskElement.getAttribute('data-task-id');
        const title = taskElement.querySelector('strong').textContent;
        const taskDisplay = taskElement.querySelector(`#task-display-${taskId}`);
        const deadlineElement = Array.from(taskDisplay.querySelectorAll('p')).find(p => p.textContent.startsWith('До: '));
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

    flatpickr(".deadline-input", {
        dateFormat: "d.m.Y",
        locale: "ru"
    });

    function updateCalendarEvents() {
        if (calendar) {
            calendar.setOption('events', window.deadlineEvents || []);
            calendar.render();
        }
    }

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

    const calendarToggle = document.querySelector('.calendar-toggle');
    const calendarElement = document.getElementById('calendar');
    if (calendarToggle && calendarElement) {
        calendarToggle.addEventListener('click', function () {
            const isCollapsed = calendarElement.classList.toggle('collapsed');
            calendarElement.classList.toggle('calendar-expanded', !isCollapsed);
            calendarToggle.textContent = isCollapsed ? '🔼' : '🔽';
            if (!isCollapsed && calendar) {
                console.log('Re-rendering calendar after expanding...');
                calendar.render();
            }
        });
    } else {
        console.error('Calendar toggle or calendar element not found!');
    }

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

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const rgbValues = rgb.match(/\d+/g);
        if (!rgbValues) return '#ffffff';
        const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
        const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
        const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

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
            console.log('Server response:', data);
            if (data.success) {
                const categoryId = formData.get('category_id');
                const createdAt = new Date().toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                let fileListHtml = '';
                if (data.file_urls && typeof data.file_urls === 'string' && data.file_urls.trim() !== '') {
                    console.log('Processing file URLs:', data.file_urls);
                    fileListHtml = '<div class="file-list">';
                    const fileUrls = data.file_urls.split(',').filter(url => url.trim() !== '');
                    fileUrls.forEach(url => {
                        const filename = url.split('_').pop();
                        const isImage = url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.jpg') ||
                                       url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.gif');
                        const isDocument = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().endsWith('.docx') ||
                                          url.toLowerCase().endsWith('.csv') || url.toLowerCase().endsWith('.xlsx');
                        if (isImage) {
                            fileListHtml += `<img src="${url}" alt="${filename}" class="task-image" data-full-url="${url}">`;
                        } else if (isDocument) {
                            fileListHtml += `<a href="#" class="file-link" data-file-url="${url}">${filename}</a>`;
                        } else {
                            console.warn('Unsupported file type:', url);
                        }
                    });
                    fileListHtml += '</div>';
                } else {
                    console.log('No file URLs received or empty file_urls:', data.file_urls);
                }

                const note = formData.get('note') || '';
                const deadline = formData.get('deadline') || '';
                const title = formData.get('title') || 'Без названия';

                const newTask = `
                    <div class="task-item" id="task-${data.task_id}" data-task-id="${data.task_id}">
                        <div class="task-content">
                            <div id="task-display-${data.task_id}">
                                <strong class="${data.completed ? 'completed' : ''}">${title}</strong>
                                ${note ? `<p>${note}</p>` : ''}
                                ${deadline ? `<p>До: ${deadline}</p>` : ''}
                                <p>Создано: ${createdAt}</p>
                                ${fileListHtml}
                            </div>
                            <form id="edit-task-form-${data.task_id}" class="edit-form" style="display: none;">
                                <div class="input-group">
                                    <span class="input-icon">📝</span>
                                    <textarea name="new_note" class="input" placeholder="Введите заметку">${note}</textarea>
                                </div>
                                <div class="input-group">
                                    <span class="input-icon">🗓️</span>
                                    <input type="text" name="new_deadline" value="${deadline}" placeholder="ДД.ММ.ГГГГ" class="input deadline-input">
                                </div>
                                ${fileListHtml ? `
                                    <div class="existing-files">
                                        <p>Существующие файлы (отметьте для удаления):</p>
                                        ${data.file_urls.split(',').filter(url => url.trim() !== '').map(url => `<label><input type="checkbox" name="delete_files" value="${url}">${url.split('_').pop()}</label>`).join('')}
                                    </div>` : ''}
                                <div class="input-group">
                                    <span class="input-icon">📎</span>
                                    <input type="file" name="file" class="input file-input" accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.csv,.xlsx" multiple>
                                </div>
                                <div class="button-group">
                                    <button type="submit" class="btn btn-save" data-task-id="${data.task_id}">Сохранить</button>
                                    <button type="button" class="cancel-edit btn" data-task-id="${data.task_id}">Отмена</button>
                                </div>
                            </form>
                        </div>
                        <div class="task-actions">
                            <button class="edit-task-button btn-action" data-task-id="${data.task_id}" title="Редактировать задачу">✏️</button>
                            <a href="#" class="toggle-task btn-action" data-task-id="${data.task_id}" title="${data.completed ? 'Возобновить' : 'Завершить'}">${data.completed ? '↺' : '✓'}</a>
                            <a href="#" class="delete-task btn-action btn-action-danger" data-task-id="${data.task_id}" title="Удалить">✕</a>
                        </div>
                    </div>`;
                const taskContainer = document.getElementById(`task-container-${categoryId}`);
                if (taskContainer) {
                    console.log('Adding task to DOM:', newTask);
                    taskContainer.insertAdjacentHTML('beforeend', newTask);
                    const newDeadlineInput = document.querySelector(`#edit-task-form-${data.task_id} .deadline-input`);
                    if (newDeadlineInput) {
                        flatpickr(newDeadlineInput, { dateFormat: "d.m.Y", locale: "ru" });
                    } else {
                        console.error('Deadline input not found for new task:', data.task_id);
                    }
                } else {
                    console.error('Task container not found for category:', categoryId);
                }
                if (data.deadline) {
                    window.deadlineEvents.push({
                        id: data.task_id,
                        title: data.title || title,
                        start: data.deadline,
                        color: '#dc3545',
                        completed: false
                    });
                    updateCalendarEvents();
                }
                const taskPopup = document.getElementById('task-popup');
                if (taskPopup) {
                    console.log('Closing task popup after adding task');
                    taskPopup.style.display = 'none';
                } else {
                    console.error('Task popup not found!');
                }
                this.reset();
            } else {
                console.error('Failed to add task:', data);
                const taskPopup = document.getElementById('task-popup');
                if (taskPopup) {
                    console.log('Closing task popup after error');
                    taskPopup.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error adding task:', error);
            const taskPopup = document.getElementById('task-popup');
            if (taskPopup) {
                console.log('Closing task popup after error');
                taskPopup.style.display = 'none';
            }
        });
    });

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('toggle-tasks')) {
            e.preventDefault();
            const catId = e.target.getAttribute('data-cat-id');
            const container = document.getElementById(`task-container-${catId}`);
            if (container) container.classList.toggle('d-none');
        }

        if (e.target.classList.contains('delete-category')) {
            e.preventDefault();
            const catId = e.target.getAttribute('data-cat-id');
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

        if (e.target.classList.contains('edit-task-button')) {
            const taskId = e.target.getAttribute('data-task-id');
            document.getElementById(`edit-task-form-${taskId}`).style.display = 'block';
            document.getElementById(`task-display-${taskId}`).style.display = 'none';
            e.target.style.display = 'none';
        }

        if (e.target.classList.contains('cancel-edit')) {
            const taskId = e.target.getAttribute('data-task-id');
            document.getElementById(`edit-task-form-${taskId}`).style.display = 'none';
            document.getElementById(`task-display-${taskId}`).style.display = 'block';
            document.querySelector(`.edit-task-button[data-task-id="${taskId}"]`).style.display = 'inline-block';
        }

        if (e.target.classList.contains('toggle-task')) {
            e.preventDefault();
            const taskId = e.target.getAttribute('data-task-id');
            fetch(`/toggle_task/${taskId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const taskElement = document.getElementById(`task-${taskId}`);
                        const titleElement = taskElement.querySelector('strong');
                        titleElement.classList.toggle('completed', data.completed);
                        e.target.textContent = data.completed ? '↺' : '✓';
                        e.target.setAttribute('title', data.completed ? 'Возобновить' : 'Завершить');
                        const eventIndex = window.deadlineEvents.findIndex(event => event.id === String(data.task_id));
                        if (eventIndex !== -1) {
                            window.deadlineEvents[eventIndex].color = data.color;
                            window.deadlineEvents[eventIndex].completed = data.completed;
                        }
                        updateCalendarEvents();
                    }
                });
        }

        if (e.target.classList.contains('delete-task')) {
            e.preventDefault();
            const taskId = e.target.getAttribute('data-task-id');
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

        if (e.target.closest('.task-image')) {
            const fullUrl = e.target.closest('.task-image').getAttribute('data-full-url');
            const modal = document.getElementById('image-modal');
            const modalImage = document.getElementById('modal-image');
            modalImage.src = fullUrl;
            modal.style.display = 'flex';
        }

        if (e.target.closest('.file-link')) {
            e.preventDefault();
            const fileUrl = e.target.closest('.file-link').getAttribute('data-file-url');
            const filename = e.target.closest('.file-link').textContent;
            const modal = document.getElementById('document-modal');
            const documentName = document.getElementById('document-name');
            const documentDownload = document.getElementById('document-download');
            documentName.textContent = filename;
            documentDownload.href = fileUrl;
            modal.style.display = 'flex';
        }

        if (e.target.classList.contains('modal-close')) {
            const modal = document.getElementById('image-modal');
            modal.style.display = 'none';
        }

        if (e.target.classList.contains('document-modal-close')) {
            const modal = document.getElementById('document-modal');
            modal.style.display = 'none';
        }
    });

    document.addEventListener('submit', function (e) {
        if (e.target.classList.contains('edit-form')) {
            e.preventDefault();
            const taskId = e.target.querySelector('.btn-save').getAttribute('data-task-id');
            const formData = new FormData(e.target);
            fetch(`/edit_task/${taskId}`, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const taskElement = document.getElementById(`task-${taskId}`);
                    const createdAt = taskElement.querySelector('p')?.textContent?.startsWith('Создано: ')
                        ? taskElement.querySelector('p').textContent
                        : `Создано: ${new Date().toLocaleDateString('ru-RU')}`;

                    let fileListHtml = '';
                    if (data.file_urls && typeof data.file_urls === 'string' && data.file_urls.trim() !== '') {
                        fileListHtml = '<div class="file-list">';
                        const fileUrls = data.file_urls.split(',').filter(url => url.trim() !== '');
                        fileUrls.forEach(url => {
                            const filename = url.split('_').pop();
                            const isImage = url.toLowerCase().endsWith('.png') || url.toLowerCase().endsWith('.jpg') ||
                                           url.toLowerCase().endsWith('.jpeg') || url.toLowerCase().endsWith('.gif');
                            const isDocument = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().endsWith('.docx') ||
                                              url.toLowerCase().endsWith('.csv') || url.toLowerCase().endsWith('.xlsx');
                            if (isImage) {
                                fileListHtml += `<img src="${url}" alt="${filename}" class="task-image" data-full-url="${url}">`;
                            } else if (isDocument) {
                                fileListHtml += `<a href="#" class="file-link" data-file-url="${url}">${filename}</a>`;
                            }
                        });
                        fileListHtml += '</div>';
                    }

                    const newTaskHtml = `
                        <div class="task-content">
                            <div id="task-display-${taskId}">
                                <strong class="${data.completed ? 'completed' : ''}">${data.title}</strong>
                                ${data.note ? `<p>${data.note}</p>` : ''}
                                ${data.deadline ? `<p>До: ${data.deadline.split('-').reverse().join('.')}</p>` : ''}
                                <p>${createdAt}</p>
                                ${fileListHtml}
                            </div>
                            <form id="edit-task-form-${taskId}" class="edit-form" style="display: none;">
                                <div class="input-group">
                                    <span class="input-icon">📝</span>
                                    <textarea name="new_note" class="input" placeholder="Введите заметку">${data.note || ''}</textarea>
                                </div>
                                <div class="input-group">
                                    <span class="input-icon">🗓️</span>
                                    <input type="text" name="new_deadline" value="${data.deadline ? data.deadline.split('-').reverse().join('.') : ''}" placeholder="ДД.ММ.ГГГГ" class="input deadline-input">
                                </div>
                                ${fileListHtml ? `
                                    <div class="existing-files">
                                        <p>Существующие файлы (отметьте для удаления):</p>
                                        ${data.file_urls.split(',').filter(url => url.trim() !== '').map(url => `<label><input type="checkbox" name="delete_files" value="${url}">${url.split('_').pop()}</label>`).join('')}
                                    </div>` : ''}
                                <div class="input-group">
                                    <span class="input-icon">📎</span>
                                    <input type="file" name="file" class="input file-input" accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.csv,.xlsx" multiple>
                                </div>
                                <div class="button-group">
                                    <button type="submit" class="btn btn-save" data-task-id="${taskId}">Сохранить</button>
                                    <button type="button" class="cancel-edit btn" data-task-id="${taskId}">Отмена</button>
                                </div>
                            </form>
                        </div>
                        <div class="task-actions">
                            <button class="edit-task-button btn-action" data-task-id="${taskId}" title="Редактировать задачу">✏️</button>
                            <a href="#" class="toggle-task btn-action" data-task-id="${taskId}" title="${data.completed ? 'Возобновить' : 'Завершить'}">${data.completed ? '↺' : '✓'}</a>
                            <a href="#" class="delete-task btn-action btn-action-danger" data-task-id="${taskId}" title="Удалить">✕</a>
                        </div>`;

                    taskElement.innerHTML = newTaskHtml;
                    const newDeadlineInput = taskElement.querySelector(`#edit-task-form-${taskId} .deadline-input`);
                    if (newDeadlineInput) {
                        flatpickr(newDeadlineInput, { dateFormat: "d.m.Y", locale: "ru" });
                    }

                    const updatedEditForm = document.getElementById(`edit-task-form-${taskId}`);
                    const updatedTaskDisplay = document.getElementById(`task-display-${taskId}`);
                    const editButton = document.querySelector(`.edit-task-button[data-task-id="${taskId}"]`);

                    if (updatedEditForm && updatedTaskDisplay) {
                        console.log('Hiding edit form and showing task display after edit');
                        updatedEditForm.style.display = 'none';
                        updatedTaskDisplay.style.display = 'block';
                    } else {
                        console.error('Edit form or task display not found after update!');
                    }
                    if (editButton) {
                        editButton.style.display = 'inline-flex'; // Устанавливаем flex для правильного отображения
                        editButton.style.width = '30px'; // Фиксируем размеры
                        editButton.style.height = '30px';
                        editButton.style.fontSize = '16px'; // Контролируем размер иконки
                        editButton.style.lineHeight = '1'; // Убираем лишние отступы
                    }

                    const existingEventIndex = window.deadlineEvents.findIndex(event => event.id === taskId);
                    if (data.deadline) {
                        const deadlineDate = data.deadline;
                        if (existingEventIndex !== -1) {
                            window.deadlineEvents[existingEventIndex].start = deadlineDate;
                            window.deadlineEvents[existingEventIndex].title = data.title;
                            window.deadlineEvents[existingEventIndex].completed = data.completed;
                        } else {
                            window.deadlineEvents.push({
                                id: taskId,
                                title: data.title,
                                start: deadlineDate,
                                color: data.completed ? '#6c757d' : '#dc3545',
                                completed: data.completed
                            });
                        }
                    } else if (existingEventIndex !== -1) {
                        window.deadlineEvents.splice(existingEventIndex, 1);
                    }

                    updateCalendarEvents();
                } else {
                    console.error('Failed to edit task:', data);
                }
            })
            .catch(error => {
                console.error('Error editing task:', error);
            });
        }
    });

    document.getElementById('image-modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });

    document.getElementById('document-modal')?.addEventListener('click', function (e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
});