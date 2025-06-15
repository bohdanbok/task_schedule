import { showNotification } from './notificationHandler.js';
import { updateCalendarWithTasks } from './simpleCalendar.js';

export function setupTaskHandlers() {
    let draggedTask = null;
    let currentDropZone = null;

    // Обработчики перетаскивания задач
    document.addEventListener('dragstart', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (taskItem) {
            draggedTask = taskItem;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedTask.id);
            setTimeout(() => {
                draggedTask.classList.add('dragging');
            }, 0);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (draggedTask) {
            draggedTask.classList.remove('dragging');
            draggedTask = null;
        }
        // Удаляем все классы drag-over
        document.querySelectorAll('.task-container.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        document.querySelectorAll('.task-item.drag-over-top, .task-item.drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedTask) return;

        const taskContainer = e.target.closest('.task-container');
        const taskItem = e.target.closest('.task-item');

        if (taskContainer) {
            taskContainer.classList.add('drag-over');
            currentDropZone = taskContainer;
        }

        if (taskItem && taskItem !== draggedTask) {
            const rect = taskItem.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            // Удаляем предыдущие классы
            document.querySelectorAll('.task-item.drag-over-top, .task-item.drag-over-bottom').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            if (e.clientY < midY) {
                taskItem.classList.add('drag-over-top');
            } else {
                taskItem.classList.add('drag-over-bottom');
            }
        }
    });

    document.addEventListener('dragleave', (e) => {
        const taskContainer = e.target.closest('.task-container');
        if (taskContainer && !taskContainer.contains(e.relatedTarget)) {
            taskContainer.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (!draggedTask) return;

        const taskContainer = e.target.closest('.task-container');
        const taskItem = e.target.closest('.task-item');

        // Удаляем все классы drag-over
        document.querySelectorAll('.task-container.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        document.querySelectorAll('.task-item.drag-over-top, .task-item.drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        if (taskContainer) {
            const newCategoryId = taskContainer.id.replace('task-container-', '');
            let previousTaskId = null;
            let nextTaskId = null;
            let position = 'end';

            if (taskItem && taskItem !== draggedTask) {
                const rect = taskItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                if (e.clientY < midY) {
                    taskContainer.insertBefore(draggedTask, taskItem);
                    previousTaskId = draggedTask.previousElementSibling?.dataset.taskId;
                    nextTaskId = taskItem.dataset.taskId;
                    position = 'before';
                } else {
                    taskContainer.insertBefore(draggedTask, taskItem.nextElementSibling);
                    previousTaskId = taskItem.dataset.taskId;
                    nextTaskId = draggedTask.nextElementSibling?.dataset.taskId;
                    position = 'after';
                }
            } else {
                taskContainer.appendChild(draggedTask);
                previousTaskId = draggedTask.previousElementSibling?.dataset.taskId;
            }

            try {
                const response = await fetch('/update_task_position', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        task_id: draggedTask.dataset.taskId,
                        new_category_id: newCategoryId,
                        previous_task_id: previousTaskId,
                        next_task_id: nextTaskId,
                        position: position
                    })
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Позиция задачи успешно обновлена!', 'success');
                    if (window.updateCalendarEvents) {
                        window.updateCalendarEvents();
                    }
                } else {
                    showNotification('Ошибка при обновлении позиции задачи: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Произошла ошибка при обновлении позиции задачи.', 'error');
            }
        }
    });

    // Обработчики кликов для кнопок задач (делегирование)
    document.addEventListener('click', async function (e) {
        // Создание задачи
        if (e.target.closest('#create-task-btn')) {
            document.getElementById('task-popup').style.display = 'flex';
        }

        // Отмена создания задачи
        if (e.target.closest('#cancel-task-btn')) {
            document.getElementById('task-popup').style.display = 'none';
            document.getElementById('add-task-form').reset();
        }

        // Удаление задачи
        if (e.target.closest('.delete-task')) {
            const button = e.target.closest('.delete-task');
            const taskId = button.dataset.taskId;
            if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
                try {
                    const response = await fetch(`/delete_task/${taskId}`, {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    if (data.success) {
                        document.getElementById(`task-${taskId}`).remove();
                        showNotification('Задача успешно удалена!', 'success');
                        // Обновляем календарь
                        if (window.updateCalendarEvents) {
                            window.updateCalendarEvents();
                        }
                    } else {
                        showNotification('Ошибка при удалении задачи: ' + data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('Произошла ошибка при удалении задачи.', 'error');
                }
            }
        }

        // Переключение статуса задачи (завершено/возобновлено)
        if (e.target.closest('.toggle-task')) {
            const button = e.target.closest('.toggle-task');
            const taskId = button.dataset.taskId;
            try {
                const response = await fetch(`/toggle_task/${taskId}`, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const data = await response.json();
                if (data.success) {
                    const taskTitle = document.querySelector(`#task-display-${taskId} strong`);
                    if (taskTitle) {
                        taskTitle.classList.toggle('completed', data.completed);
                        button.textContent = data.completed ? '↺' : '✓';
                        showNotification('Статус задачи успешно изменен!', 'success');
                        // Обновляем календарь
                        if (window.updateCalendarEvents) {
                            window.updateCalendarEvents();
                        }
                    }
                } else {
                    showNotification('Ошибка при изменении статуса задачи: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Произошла ошибка при изменении статуса задачи.', 'error');
            }
        }

        // Открытие формы редактирования задачи (новая логика попапа)
        if (e.target.closest('.edit-task-button')) {
            const button = e.target.closest('.edit-task-button');
            const taskId = button.dataset.taskId;
            await openEditTaskPopup(taskId);
        }

        // Отмена редактирования задачи (новая логика попапа)
        if (e.target.closest('#cancel-edit-task-btn')) {
            document.getElementById('edit-task-popup').style.display = 'none';
            document.getElementById('edit-task-form').reset();
            // Очищаем flatpickr при отмене
            const editTaskDeadlineInput = document.getElementById('edit_task_deadline');
            if (editTaskDeadlineInput && editTaskDeadlineInput._flatpickr) {
                editTaskDeadlineInput._flatpickr.clear();
                editTaskDeadlineInput._flatpickr.close();
            }
        }

        // Открытие модального окна для документов/изображений
        if (e.target.closest('.task-image') || e.target.closest('.file-link')) {
            e.preventDefault();
            const element = e.target.closest('.task-image') || e.target.closest('.file-link');
            const fileUrl = element.dataset.fullUrl || element.dataset.fileUrl;
            const modal = document.getElementById('document-modal');
            const link = modal.querySelector('.document-link');
            if (modal && link) {
                link.href = fileUrl;
                modal.style.display = 'flex';
            }
        }

        // Закрытие модального окна для документов/изображений
        if (e.target.closest('.document-modal-close')) {
            document.getElementById('document-modal').style.display = 'none';
        }
    });

    // Отправка формы добавления задачи
    document.getElementById('add-task-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const categoryId = formData.get('category_id');

        try {
            const response = await fetch('/add_task', {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            console.log('Ответ сервера на добавление задачи:', data);

            if (data.success && data.task_id) { // Проверяем data.success и data.task_id
                const taskContainer = document.getElementById(`task-container-${categoryId}`);
                if (taskContainer) {
                    const noTasksMessage = taskContainer.querySelector('.no-tasks-message');
                    if (noTasksMessage) noTasksMessage.remove();

                    // Получаем HTML для новой задачи, включая data-task-deadline
                    const deadlineAttr = data.deadline ? `data-task-deadline="${data.deadline}"` : '';
                    const newTaskHtml = `
                        <div class="task-item" id="task-${data.task_id}" data-task-id="${data.task_id}" ${deadlineAttr}>
                            <div class="task-content">
                                <div id="task-display-${data.task_id}">
                                    <strong class="${data.completed ? 'completed' : ''}">${data.title}</strong>
                                    ${data.note ? `<p>Заметка: ${data.note}</p>` : ''}
                                    ${data.deadline ? `<p>До: ${data.deadline}</p>` : ''}
                                    <p>Создано: ${data.created_at}</p>
                                    ${data.file_urls && data.file_urls.length > 0 ? `
                                        <div class="file-list">
                                            ${data.file_urls.split(',').map(fileUrl => {
                                                if (!fileUrl) return '';
                                                const filename = fileUrl.split('/').pop().split('_', 1)[1] || fileUrl.split('/').pop();
                                                const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                                                const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                                                if (isImage) {
                                                    return `<img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">`;
                                                } else if (isDocument) {
                                                    return `<a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>`;
                                                }
                                                return '';
                                            }).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="task-actions">
                                <button class="edit-task-button btn-action" data-task-id="${data.task_id}" title="Редактировать задачу">✏️</button>
                                <button class="toggle-task btn-action" data-task-id="${data.task_id}" title="Завершить">✓</button>
                                <button class="delete-task btn-action btn-action-danger" data-task-id="${data.task_id}" title="Удалить">✕</button>
                            </div>
                        </div>`;
                    taskContainer.insertAdjacentHTML('beforeend', newTaskHtml);
                    showNotification('Задача успешно добавлена!', 'success');
                }

                // Сначала очищаем flatpickr, затем сбрасываем форму, затем скрываем попап
                const taskDeadlineInput = document.getElementById('task_deadline');
                if (taskDeadlineInput && taskDeadlineInput._flatpickr) {
                    taskDeadlineInput._flatpickr.clear();
                    taskDeadlineInput._flatpickr.close();
                }

                const addTaskForm = document.getElementById('add-task-form');
                if (addTaskForm) {
                    addTaskForm.reset();
                }
                document.getElementById('task-popup').style.display = 'none';
                
                // Обновляем календарь после добавления задачи
                if (window.updateCalendarEvents) {
                    window.updateCalendarEvents();
                }

            } else {
                showNotification('Ошибка при добавлении задачи: ' + (data.message || 'Задача не была возвращена сервером или сервер сообщил об ошибке.'), 'error');
            }
        } catch (error) {
            console.error('Error adding task:', error);
            showNotification('Произошла ошибка при добавлении задачи. Проверьте консоль для получения более подробной информации.', 'error');
        }
    });

    // Отправка формы редактирования задачи (новый обработчик для попапа)
    document.getElementById('edit-task-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const form = e.target;
        const taskId = document.getElementById('edit_task_id').value;
        console.log('Отправка формы редактирования задачи. taskId:', taskId); // Отладочное сообщение

        if (!taskId) {
            showNotification('Ошибка: ID задачи не определен для редактирования.', 'error');
            console.error('Ошибка: taskId undefined при отправке формы edit-task-form');
            return;
        }

        const formData = new FormData(form);

        // Добавляем существующие файлы, которые НЕ отмечены для удаления
        form.querySelectorAll('#edit-existing-files input[type="checkbox"]').forEach(checkbox => {
            if (!checkbox.checked) { // Если чекбокс НЕ отмечен, значит файл не удаляется
                const fileUrl = checkbox.value;
                formData.append('existing_files_to_keep', fileUrl);
            }
        });

        try {
            const response = await fetch(`/edit_task/${taskId}`, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (data.success) {
                const taskDisplay = document.querySelector(`#task-display-${taskId}`);
                if (taskDisplay) {
                    taskDisplay.querySelector('strong').textContent = data.title;

                    // Ищем заметку
                    let noteElement = Array.from(taskDisplay.querySelectorAll('p')).find(p => p.textContent.startsWith('Заметка:'));
                    if (!noteElement) {
                        noteElement = document.createElement('p');
                        noteElement.textContent = 'Заметка:';
                        // Добавляем после заголовка
                        taskDisplay.querySelector('strong').insertAdjacentElement('afterend', noteElement);
                    }

                    if (data.note) {
                        noteElement.textContent = `Заметка: ${data.note}`;
                        noteElement.setAttribute('data-type', 'note'); // Устанавливаем data-type
                    } else {
                        noteElement.remove();
                    }

                    // Ищем срок выполнения
                    let deadlineElement = Array.from(taskDisplay.querySelectorAll('p')).find(p => p.textContent.startsWith('До:'));
                    if (!deadlineElement) {
                        deadlineElement = document.createElement('p');
                        deadlineElement.textContent = 'До:';
                        // Добавляем после заметки или заголовка
                        const insertAfter = noteElement || taskDisplay.querySelector('strong');
                        if (insertAfter) {
                            insertAfter.insertAdjacentElement('afterend', deadlineElement);
                        }
                    }

                    if (data.deadline) {
                        deadlineElement.textContent = `До: ${data.deadline}`;
                    } else {
                        deadlineElement.remove();
                    }

                    // Обновляем прикрепленные файлы
                    const existingFilesContainer = document.getElementById('edit-existing-files');
                    if (existingFilesContainer) {
                        existingFilesContainer.innerHTML = ''; // Очищаем старые файлы

                        if (data.file_urls && data.file_urls.length > 0) {
                            const fileList = document.createElement('div');
                            fileList.classList.add('file-list');

                            data.file_urls.split(',').forEach(fileUrl => {
                                if (!fileUrl) return;
                                const filename = fileUrl.split('/').pop().split('_', 2)[1] || fileUrl.split('/').pop();
                                const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                                const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                                const fileItem = document.createElement('div');
                                fileItem.classList.add('file-item');
                                fileItem.dataset.fileUrl = fileUrl; // Сохраняем полный URL для удаления

                                if (isImage) {
                                    fileItem.innerHTML = `
                                        <img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">
                                        <button type="button" class="delete-file" data-file-url="${fileUrl}" title="Удалить файл">✕</button>
                                    `;
                                } else if (isDocument) {
                                    fileItem.innerHTML = `
                                        <a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>
                                        <button type="button" class="delete-file" data-file-url="${fileUrl}" title="Удалить файл">✕</button>
                                    `;
                                }
                                
                                fileList.appendChild(fileItem);
                            });
                            
                            existingFilesContainer.appendChild(fileList);
                        } else {
                            existingFilesContainer.style.display = 'none';
                        }

                        // Добавляем обработчики для кнопок удаления файлов
                        document.querySelectorAll('#edit-existing-files .delete-file').forEach(button => {
                            button.addEventListener('click', async (e) => {
                                e.preventDefault();
                                const fileUrl = button.dataset.fileUrl;
                                const fileItem = button.closest('.file-item');
                                
                                try {
                                    const response = await fetch(`/delete_task_file/${taskId}`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'X-Requested-With': 'XMLHttpRequest'
                                        },
                                        body: JSON.stringify({ file_url: fileUrl })
                                    });
                                    
                                    const data = await response.json();
                                    if (data.success) {
                                        fileItem.remove();
                                        showNotification('Файл успешно удален!', 'success');
                                        
                                        // Если это был последний файл, скрываем контейнер
                                        if (existingFilesContainer.querySelectorAll('.file-item').length === 0) {
                                            existingFilesContainer.style.display = 'none';
                                        }
                                    } else {
                                        showNotification('Ошибка при удалении файла: ' + data.message, 'error');
                                    }
                                } catch (error) {
                                    console.error('Error deleting file:', error);
                                    showNotification('Произошла ошибка при удалении файла.', 'error');
                                }
                            });
                        });

                        // Обновляем отображение текущих файлов в задаче
                        const currentTaskFilesDisplay = document.querySelector(`#task-display-${taskId} .file-list`);
                        if (currentTaskFilesDisplay) {
                            currentTaskFilesDisplay.innerHTML = '';
                            if (data.file_urls && data.file_urls.length > 0) {
                                data.file_urls.split(',').forEach(fileUrl => {
                                    if (!fileUrl) return;
                                    const filename = fileUrl.split('/').pop().split('_', 2)[1] || fileUrl.split('/').pop();
                                    const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                                    const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                                    if (isImage) {
                                        currentTaskFilesDisplay.innerHTML += `<img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">`;
                                    } else if (isDocument) {
                                        currentTaskFilesDisplay.innerHTML += `<a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>`;
                                    }
                                });
                            }
                        }
                    }
                }

                document.getElementById('edit-task-popup').style.display = 'none';
                showNotification('Задача успешно обновлена!', 'success');
                
                // Обновляем отображение задач в категории, чтобы новые файлы отобразились
                const categoryId = data.category_id; // Предполагаем, что backend возвращает category_id
                if (categoryId) {
                    updateTasksDisplayInContainer(categoryId);
                }

                // Обновляем календарь после редактирования задачи
                if (window.updateCalendarEvents) {
                    window.updateCalendarEvents();
                }

            } else {
                showNotification('Ошибка при редактировании задачи: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Произошла ошибка при редактировании задачи.', 'error');
        }
    });
}

// Функция для обновления отображения задач в контейнере категории
export async function updateTasksDisplayInContainer(categoryId) {
    try {
        const response = await fetch(`/get_tasks_by_category/${categoryId}`);
        const data = await response.json();

        if (data.success) {
            const taskContainer = document.getElementById(`task-container-${categoryId}`);
            if (taskContainer) {
                taskContainer.innerHTML = ''; // Очищаем текущие задачи
                if (data.tasks.length === 0) {
                    taskContainer.innerHTML = '<p class="no-tasks-message">Задачи отсутствуют</p>';
                } else {
                    data.tasks.forEach(task => {
                        console.log('Данные задачи для отрисовки:', task); // Добавлено для отладки
                        const deadlineAttr = task.deadline ? `data-task-deadline="${task.deadline}"` : '';
                        const taskHtml = `
                            <div class="task-item" id="task-${task.id}" data-task-id="${task.id}" draggable="true" ${deadlineAttr}>
                                <div class="task-content">
                                    <div id="task-display-${task.id}">
                                        <strong class="${task.completed ? 'completed' : ''}">${task.title ?? ''}</strong>
                                        ${task.note ? `<p>Заметка: ${task.note ?? ''}</p>` : ''}
                                        ${task.deadline ? `<p>До: ${task.deadline ?? ''}</p>` : ''}
                                        <p>Создано: ${task.created_at ?? ''}</p>
                                        ${task.file_urls && task.file_urls.length > 0 ? `
                                            <div class="file-list">
                                                ${task.file_urls.split(',').map(fileUrl => {
                                                    if (!fileUrl) return '';
                                                    const filename = fileUrl.split('/').pop().split('_', 1)[1] || fileUrl.split('/').pop();
                                                    const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                                                    const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                                                    if (isImage) {
                                                        return `<img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">`;
                                                    } else if (isDocument) {
                                                        return `<a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>`;
                                                    }
                                                    return '';
                                                }).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="task-actions">
                                    <button class="edit-task-button btn-action" data-task-id="${task.id}" title="Редактировать задачу">✏️</button>
                                    <button class="toggle-task btn-action" data-task-id="${task.id}" title="${task.completed ? 'Возобновить' : 'Завершить'}">${task.completed ? '↺' : '✓'}</button>
                                    <button class="delete-task btn-action btn-action-danger" data-task-id="${task.id}" title="Удалить">✕</button>
                                </div>
                            </div>`;
                        taskContainer.insertAdjacentHTML('beforeend', taskHtml);
                    });
                }
            }
        } else {
            console.error('Ошибка при получении задач по категории:', data.message);
        }
    } catch (error) {
        console.error('Произошла ошибка при загрузке задач:', error);
    }
}

// Функция для открытия попапа редактирования задачи и заполнения данными
export async function openEditTaskPopup(taskId) {
    try {
        const response = await fetch(`/get_task_details/${taskId}`);
        const data = await response.json();

        if (data.success && data.task) {
            const task = data.task; // Получаем объект задачи
            const files = data.files || []; // Получаем массив файлов

            document.getElementById('edit_task_id').value = task.id;
            console.log('Значение edit_task_id установлено на:', document.getElementById('edit_task_id').value); // Отладочное сообщение
            document.getElementById('edit_task_title').value = task.title;
            document.getElementById('edit_task_note').value = task.note || '';
            document.getElementById('edit_category_id').value = task.category_id;
            document.getElementById('edit_task_deadline').value = task.deadline || '';

            // Заполняем поле даты для Flatpickr
            const editTaskDeadlineInput = document.getElementById('edit_task_deadline');
            if (editTaskDeadlineInput && editTaskDeadlineInput._flatpickr) {
                editTaskDeadlineInput._flatpickr.setDate(task.deadline || '');
            }

            // Отображаем прикрепленные файлы
            const existingFilesContainer = document.getElementById('edit-existing-files');
            existingFilesContainer.innerHTML = ''; // Очищаем предыдущие файлы

            if (files.length > 0) {
                existingFilesContainer.style.display = 'block';
                const fileList = document.createElement('div');
                fileList.classList.add('file-list');

                files.forEach(file => {
                    // Более строгая проверка объекта файла и его свойства URL
                    if (!file || typeof file.url !== 'string' || file.url === '') {
                        console.warn('Пропускаем некорректный объект файла:', file);
                        return; // Пропускаем, если файл или его URL некорректны
                    }
                    console.log('Обрабатываем файл:', file); // Логируем объект файла
                    const fileItem = document.createElement('div');
                    fileItem.classList.add('file-item');
                    fileItem.dataset.fileUrl = file.url; // Сохраняем полный URL для удаления

                    const filename = file.url.split('/').pop().split('_', 2)[1] || file.url.split('/').pop(); // Получаем исходное имя файла
                    const isImage = file.url.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                    const isDocument = file.url.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                    if (isImage) {
                        fileItem.innerHTML = `
                            <img src="${file.url}" alt="${filename}" class="task-image" data-full-url="${file.url}">
                            <button type="button" class="delete-file" data-file-url="${file.url}" title="Удалить файл">✕</button>
                        `;
                    } else if (isDocument) {
                        fileItem.innerHTML = `
                            <a href="#" class="file-link" data-file-url="${file.url}">${filename}</a>
                            <button type="button" class="delete-file" data-file-url="${file.url}" title="Удалить файл">✕</button>
                        `;
                    }
                    
                    fileList.appendChild(fileItem);
                });
                
                existingFilesContainer.appendChild(fileList);
            } else {
                existingFilesContainer.style.display = 'none';
            }

            // Добавляем обработчики для кнопок удаления файлов
            document.querySelectorAll('#edit-existing-files .delete-file').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const fileUrl = button.dataset.fileUrl;
                    const fileItem = button.closest('.file-item');
                    
                    try {
                        const response = await fetch(`/delete_task_file/${taskId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: JSON.stringify({ file_url: fileUrl })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                            fileItem.remove();
                            showNotification('Файл успешно удален!', 'success');
                            
                            // Если это был последний файл, скрываем контейнер
                            if (existingFilesContainer.querySelectorAll('.file-item').length === 0) {
                                existingFilesContainer.style.display = 'none';
                            }
                        } else {
                            showNotification('Ошибка при удалении файла: ' + data.message, 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting file:', error);
                        showNotification('Произошла ошибка при удалении файла.', 'error');
                    }
                });
            });

            document.getElementById('edit-task-popup').style.display = 'flex';
        } else {
            showNotification('Ошибка при получении данных задачи: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Произошла ошибка при получении данных задачи.', 'error');
    }
}