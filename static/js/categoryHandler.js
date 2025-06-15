import { showNotification } from './notificationHandler.js';
import { updateCategoryDropdowns, rgbToHex, fetchAllCategories } from './utils.js';

export function setupCategoryHandlers() {
    // Обработка перетаскивания категорий
    const categoriesGrid = document.querySelector('.categories-grid');
    if (categoriesGrid) {
        let draggedCategory = null;

        categoriesGrid.addEventListener('dragstart', (e) => {
            const category = e.target.closest('.category');
            if (category) {
                draggedCategory = category;
                draggedCategory.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedCategory.id);
            }
        });

        categoriesGrid.addEventListener('dragend', (e) => {
            if (draggedCategory) {
                draggedCategory.classList.remove('dragging');
                draggedCategory = null;
            }
            // Удаляем все классы drag-over
            document.querySelectorAll('.category.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });

        categoriesGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedCategory) return;

            const targetCategory = e.target.closest('.category');
            if (targetCategory && targetCategory !== draggedCategory) {
                const rect = targetCategory.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                // Удаляем предыдущие классы
                document.querySelectorAll('.category.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });

                if (e.clientY < midY) {
                    targetCategory.classList.add('drag-over');
                    categoriesGrid.insertBefore(draggedCategory, targetCategory);
                } else {
                    targetCategory.classList.add('drag-over');
                    categoriesGrid.insertBefore(draggedCategory, targetCategory.nextSibling);
                }
            }
        });

        categoriesGrid.addEventListener('dragleave', (e) => {
            const category = e.target.closest('.category');
            if (category && !category.contains(e.relatedTarget)) {
                category.classList.remove('drag-over');
            }
        });

        categoriesGrid.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedCategory) return;

            // Удаляем все классы drag-over
            document.querySelectorAll('.category.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });

            const newOrder = Array.from(categoriesGrid.children)
                .filter(el => el.classList.contains('category'))
                .map(cat => cat.id.split('-')[1]);

            try {
                const formData = new FormData();
                newOrder.forEach(id => formData.append('order[]', id));

                const response = await fetch('/update_category_order', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const data = await response.json();
                if (data.success) {
                    showNotification('Порядок категорий успешно обновлен!', 'success');
                } else {
                    showNotification('Ошибка при обновлении порядка категорий: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Error updating category order:', error);
                showNotification('Произошла ошибка при обновлении порядка категорий.', 'error');
            }
        });
    }

    // Обработчики кликов для кнопок категорий (делегирование)
    document.addEventListener('click', async function (e) {
        // Создание категории
        if (e.target.closest('#create-category-btn')) {
            document.getElementById('category-popup').style.display = 'flex';
        }

        // Отмена создания категории
        if (e.target.closest('#cancel-category-btn')) {
            document.getElementById('category-popup').style.display = 'none';
            document.getElementById('add-category-form').reset();
        }

        // Редактирование цвета категории
        if (e.target.closest('.edit-category-color')) {
            const button = e.target.closest('.edit-category-color');
            const catId = button.dataset.catId;
            const categoryElement = document.getElementById(`category-${catId}`);
            const categoryColor = categoryElement?.querySelector('.category-header').style.backgroundColor;

            document.getElementById('edit_category_color').value = rgbToHex(categoryColor);
            document.getElementById('edit-color-popup').dataset.catId = catId; // Сохраняем catId в попапе
            document.getElementById('edit-color-popup').style.display = 'flex';
        }

        // Отмена редактирования цвета категории
        if (e.target.closest('#cancel-edit-color-btn')) {
            document.getElementById('edit-color-popup').style.display = 'none';
        }

        // Удаление категории
        if (e.target.closest('.delete-category')) {
            const button = e.target.closest('.delete-category');
            const catId = button.dataset.catId;
            if (confirm('Вы уверены, что хотите удалить эту категорию и все связанные с ней задачи?')) {
                try {
                    const response = await fetch(`/delete_category/${catId}`, {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    if (data.success) {
                        document.getElementById(`category-${catId}`).remove();
                        // Удаляем опцию из выпадающих списков задач
                        const categorySelects = document.querySelectorAll('select[name="category_id"], select[name="new_category_id"]');
                        categorySelects.forEach(select => {
                            const optionToRemove = select.querySelector(`option[value="${catId}"]`);
                            if (optionToRemove) optionToRemove.remove();
                        });
                        showNotification('Категория и все связанные задачи успешно удалены!', 'success');

                        // Обновляем календарь после удаления категории/задач
                        if (window.updateCalendarEvents) {
                            window.updateCalendarEvents();
                        }

                        // Обновляем выпадающие списки категорий после удаления
                        const categories = await fetchAllCategories();
                        console.log('Categories after deletion:', categories); // Отладочное сообщение
                        updateCategoryDropdowns(categories);

                    } else {
                        showNotification('Ошибка при удалении категории: ' + data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showNotification('Произошла ошибка при удалении категории.', 'error');
                }
            }
        }

        // Свернуть/развернуть задачи в категории
        if (e.target.closest('.toggle-tasks')) {
            const button = e.target.closest('.toggle-tasks');
            const catId = button.dataset.catId;
            const taskContainer = document.getElementById(`task-container-${catId}`);
            if (taskContainer) {
                const isCollapsed = taskContainer.classList.toggle('collapsed');
                button.textContent = isCollapsed ? '🔽' : '🔼';
            }
        }
    });

    // Отправка формы добавления категории
    document.getElementById('add-category-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        try {
            const response = await fetch('/add_category', {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (data.success) {
                const newCategory = data.category;
                // Добавляем новую категорию в список категорий
                const categoriesGrid = document.querySelector('.categories-grid');
                if (categoriesGrid) {
                    const newCategoryHtml = `
                        <div class="category" id="category-${newCategory.id}" draggable="true">
                            <div class="category-header" style="background-color: ${newCategory.color};">
                                <h3>${newCategory.name}</h3>
                                <div class="button-group">
                                    <button class="edit-category-color btn-action" data-cat-id="${newCategory.id}" title="Изменить цвет категории">🎨</button>
                                    <button class="toggle-tasks btn-action" data-cat-id="${newCategory.id}" title="Свернуть/развернуть задачи">🔽</button>
                                    <button class="delete-category btn-action btn-action-danger" data-cat-id="${newCategory.id}" title="Удалить категорию">✕</button>
                                </div>
                            </div>
                            <div id="task-container-${newCategory.id}" class="task-container">
                                <p class="no-tasks-message">Задачи отсутствуют</p>
                            </div>
                        </div>`;
                    categoriesGrid.insertAdjacentHTML('beforeend', newCategoryHtml);
                }

                // Обновляем выпадающие списки категорий
                const categories = await fetchAllCategories();
                console.log('Categories after adding:', categories); // Отладочное сообщение
                updateCategoryDropdowns(categories);

                document.getElementById('category-popup').style.display = 'none';
                this.reset();
                showNotification('Категория успешно добавлена!', 'success');

                // Обновляем календарь после добавления категории (может быть актуально, если задачам можно сразу присвоить категорию)
                if (window.updateCalendarEvents) {
                    window.updateCalendarEvents();
                }

            } else {
                showNotification('Ошибка при добавлении категории: ' + (data.message || 'Неизвестная ошибка.'), 'error');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            showNotification('Произошла ошибка при добавлении категории.', 'error');
        }
    });

    // Отправка формы редактирования цвета категории
    document.getElementById('edit-color-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const catId = document.getElementById('edit-color-popup').dataset.catId;
        const formData = new FormData(this);
        try {
            const response = await fetch(`/edit_category_color/${catId}`, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (data.success) {
                const categoryHeader = document.querySelector(`#category-${catId} .category-header`);
                if (categoryHeader) {
                    categoryHeader.style.backgroundColor = data.color;
                }
                document.getElementById('edit-color-popup').style.display = 'none';
                showNotification('Цвет категории успешно изменен!', 'success');
            } else {
                showNotification('Ошибка при изменении цвета категории: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error updating category color:', error);
            showNotification('Произошла ошибка при изменении цвета категории.', 'error');
        }
    });
} 