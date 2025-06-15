export function setupPopupHandlers() {
    // Обработчики открытия/закрытия всплывающих окон (делегирование)
    document.addEventListener('click', function (e) {
        if (e.target.id === 'create-category-btn') {
            document.getElementById('category-popup').style.display = 'flex';
        }

        if (e.target.id === 'create-task-btn') {
            document.getElementById('task-popup').style.display = 'flex';
        }

        if (e.target.id === 'cancel-category-btn') {
            document.getElementById('category-popup').style.display = 'none';
            document.getElementById('add-category-form').reset();
        }

        if (e.target.id === 'cancel-task-btn') {
            document.getElementById('task-popup').style.display = 'none';
            document.getElementById('add-task-form').reset();
        }

        if (e.target.id === 'cancel-edit-color-btn') {
            document.getElementById('edit-color-popup').style.display = 'none';
            document.getElementById('edit-color-form').reset();
        }
    });
}

export function hideDocumentModalOnLoad() {
    const documentModal = document.getElementById('document-modal');
    if (documentModal) {
        documentModal.style.display = 'none';
        console.log('Document modal hidden on page load');
    }
} 