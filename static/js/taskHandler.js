import { showNotification } from './notificationHandler.js';
import { updateCalendarWithTasks } from './simpleCalendar.js';

export function setupTaskHandlers() {
    let draggedTask = null; // Переменная для хранения перетаскиваемой задачи
    let currentDropZone = null; // Текущая зона для сброса
    let dragStartTime = null; // Переменная для отслеживания времени начала перетаскивания

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
                        // Добавляем после заметки, если есть, или после заголовка
                        if (noteElement && noteElement.parentNode === taskDisplay) { // Проверяем, что noteElement все еще в DOM
                            noteElement.insertAdjacentElement('afterend', deadlineElement);
                        } else {
                            taskDisplay.querySelector('strong').insertAdjacentElement('afterend', deadlineElement);
                        }
                    }

                    if (data.deadline) {
                        deadlineElement.textContent = `До: ${data.deadline}`;
                        deadlineElement.setAttribute('data-type', 'deadline'); // Устанавливаем data-type
                    } else {
                        deadlineElement.remove();
                    }

                    // Обновление атрибута data-task-deadline для task-item
                    const taskItem = document.getElementById(`task-${taskId}`);
                    if (taskItem) {
                        if (data.deadline) {
                            taskItem.setAttribute('data-task-deadline', data.deadline);
                        } else {
                            taskItem.removeAttribute('data-task-deadline');
                        }
                    }

                    // Обновление файлов
                    const existingFilesContainer = taskDisplay.querySelector('.file-list');
                    if (existingFilesContainer) {
                        existingFilesContainer.innerHTML = ''; // Очищаем существующие

                        if (data.file_urls && data.file_urls.length > 0) {
                            data.file_urls.split(',').forEach(fileUrl => {
                                if (!fileUrl) return;
                                const filename = fileUrl.split('/').pop().split('_', 1)[1] || fileUrl.split('/').pop();
                                const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                                const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                                if (isImage) {
                                    existingFilesContainer.insertAdjacentHTML('beforeend', `<img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">`);
                                } else if (isDocument) {
                                    existingFilesContainer.insertAdjacentHTML('beforeend', `<a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>`);
                                }
                            });
                        }
                    } else if (data.file_urls && data.file_urls.length > 0) {
                        // Если контейнера не было, но файлы есть, создаем его
                        const newFileList = document.createElement('div');
                        newFileList.classList.add('file-list');
                        taskDisplay.appendChild(newFileList);
                        data.file_urls.split(',').forEach(fileUrl => {
                            if (!fileUrl) return;
                            const filename = fileUrl.split('/').pop().split('_', 1)[1] || fileUrl.split('/').pop();
                            const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                            const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);

                            if (isImage) {
                                newFileList.insertAdjacentHTML('beforeend', `<img src="${fileUrl}" alt="${filename}" class="task-image" data-full-url="${fileUrl}">`);
                            } else if (isDocument) {
                                newFileList.insertAdjacentHTML('beforeend', `<a href="#" class="file-link" data-file-url="${fileUrl}">${filename}</a>`);
                            }
                        });
                    }

                    showNotification('Задача успешно обновлена!', 'success');
                }
                document.getElementById('edit-task-popup').style.display = 'none';
                form.reset();

                // Обновляем календарь после редактирования задачи
                if (window.updateCalendarEvents) {
                    window.updateCalendarEvents();
                }

            } else {
                showNotification('Ошибка при обновлении задачи: ' + (data.message || 'Неизвестная ошибка.'), 'error');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Произошла ошибка при обновлении задачи.', 'error');
        }
    });

    // Обработчики событий перетаскивания для задач и контейнеров
    document.addEventListener('dragstart', function (e) {
        if (e.target.classList.contains('task-item')) {
            draggedTask = e.target;
            dragStartTime = Date.now(); // Запоминаем время начала перетаскивания
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragover', function (e) {
        e.preventDefault();
        const category = e.target.closest('.category');
        if (category && draggedTask) {
            const categoryHeader = category.querySelector('.category-header');
            if (categoryHeader && e.target.closest('.category-header')) {
                currentDropZone = category;
                category.classList.add('drag-over');
            }
        }
    });

    document.addEventListener('dragleave', (e) => {
        // Убираем подсветку со всех возможных элементов
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        document.querySelectorAll('.task-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        currentDropZone = null;
    });

    document.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (!draggedTask) return;

        const oldCategoryContainer = draggedTask.closest('.task-container');
        const newCategoryContainer = e.target.closest('.task-container');
        const targetTaskItem = e.target.closest('.task-item');

        // Убираем все визуальные индикаторы
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        document.querySelectorAll('.task-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        currentDropZone = null;

        if (!newCategoryContainer) return; // Сброс вне допустимой зоны

        const draggedTaskId = draggedTask.dataset.taskId;
        const oldCategoryId = oldCategoryContainer.id.split('-')[2];
        const newCategoryId = newCategoryContainer.id.split('-')[2];

        let targetTaskId = null;
        let position = null;

        if (targetTaskItem && targetTaskItem !== draggedTask) {
            targetTaskId = targetTaskItem.dataset.taskId;
            const boundingBox = targetTaskItem.getBoundingClientRect();
            const offset = e.clientY - boundingBox.top;
            position = (offset < boundingBox.height / 2) ? 'before' : 'after';
        } else if (newCategoryContainer.children.length === 0 || (newCategoryContainer.children.length === 1 && draggedTask.parentNode === newCategoryContainer)) {
            // Если категория пуста или содержит только перетаскиваемую задачу, помещаем в начало
            position = 'start';
        } else if (!targetTaskItem && newCategoryContainer.lastElementChild && newCategoryContainer.lastElementChild.classList.contains('task-item')) {
             // Если сброшено в пустую область контейнера, и в нем уже есть задачи, ставим в конец
            position = 'end';
        }

        try {
            const response = await fetch('/update_task_position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    task_id: draggedTaskId,
                    new_category_id: newCategoryId,
                    target_task_id: targetTaskId,
                    position: position
                })
            });
            const data = await response.json();
            if (data.success) {
                showNotification('Порядок задач успешно обновлен!', 'success');
                // Перерендеринг задач, чтобы обновить их порядок
                // Мы должны перерендерить обе категории, если задача переместилась
                if (oldCategoryId !== newCategoryId) {
                    await updateTasksDisplayInContainer(oldCategoryId); // Обновляем старую категорию
                }
                await updateTasksDisplayInContainer(newCategoryId); // Обновляем новую категорию

                 // Обновляем календарь
                 if (window.updateCalendarEvents) {
                    window.updateCalendarEvents();
                 }

            } else {
                showNotification('Ошибка при обновлении порядка задач: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating task position:', error);
            showNotification('Произошла ошибка при обновлении порядка задач.', 'error');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (draggedTask) {
            draggedTask.classList.remove('dragging');
            draggedTask = null;
        }
         // Убираем подсветку со всех возможных элементов в конце перетаскивания
         document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        document.querySelectorAll('.task-container').forEach(container => {
            container.classList.remove('drag-over');
        });
        currentDropZone = null;
    });

    // Вспомогательная функция для обновления отображения задач в контейнере
    async function updateTasksDisplayInContainer(categoryId) {
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
                        data.tasks.forEach(task_data => {
                            const task = task_data.task;
                            const file_urls_html = task_data.files.length > 0 ? `
                                <div class="file-list">
                                    ${task_data.files.map(file => {
                                        if (!file.url) return '';
                                        const filename = file.filename;
                                        const isImage = file.is_image;
                                        const isDocument = file.is_document;
                                        if (isImage) {
                                            return `<img src="${file.url}" alt="${filename}" class="task-image" data-full-url="${file.url}">`;
                                        } else if (isDocument) {
                                            return `<a href="#" class="file-link" data-file-url="${file.url}">${filename}</a>`;
                                        }
                                        return '';
                                    }).join('')}
                                </div>
                            ` : '';

                            const deadlineAttr = task.deadline ? `data-task-deadline="${task.deadline}"` : '';
                            const taskHtml = `
                                <div class="task-item" id="task-${task.id}" data-task-id="${task.id}" draggable="true" ${deadlineAttr}>
                                    <div class="task-content">
                                        <div id="task-display-${task.id}">
                                            <strong class="${task.completed ? 'completed' : ''}">${task.title}</strong>
                                            ${task.note ? `<p>Заметка: ${task.note}</p>` : ''}
                                            ${task.deadline ? `<p>До: ${task.deadline}</p>` : ''}
                                            <p>Создано: ${task.created_at}</p>
                                            ${file_urls_html}
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
                showNotification('Ошибка при получении задач для категории: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error fetching tasks for category:', error);
            showNotification('Произошла ошибка при получении задач для категории.', 'error');
        }
    }
}

async function openEditTaskPopup(taskId) {
    try {
        const response = await fetch(`/get_task_details/${taskId}`);
        const data = await response.json();
        if (data.success) {
            const form = document.getElementById('edit-task-form');
            form.querySelector('#edit_task_id').value = taskId;
            form.querySelector('#edit_task_title').value = data.task.title;
            form.querySelector('#edit_task_note').value = data.task.note || '';
            form.querySelector('#edit_task_deadline').value = data.task.deadline || '';
            form.querySelector('#edit_category_id').value = data.task.category_id;

            // Обновляем список существующих файлов
            const existingFilesContainer = document.getElementById('edit-existing-files');
            existingFilesContainer.innerHTML = '';
            
            if (data.files && data.files.length > 0) {
                existingFilesContainer.style.display = 'block';
                const fileList = document.createElement('div');
                fileList.className = 'file-list';
                
                data.files.forEach(fileInfo => {
                    const fileUrl = fileInfo.url;
                    if (!fileUrl) return;
                    const filename = fileInfo.filename || fileUrl.split('/').pop().split('_', 1)[1] || fileUrl.split('/').pop();
                    const isImage = fileUrl.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/);
                    const isDocument = fileUrl.toLowerCase().match(/\.(pdf|docx|csv|xlsx)$/);
                    
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    
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
            document.querySelectorAll('.delete-file').forEach(button => {
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
