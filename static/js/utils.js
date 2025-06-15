export function rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'string') return null;
    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgbMatch) return null;
    const toHex = (c) => {
        const hex = parseInt(c).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

// Функция для получения всех категорий
export async function fetchAllCategories() {
    try {
        const response = await fetch('/get_all_categories');
        const data = await response.json();
        if (data.success) {
            return data.categories;
        }
        return [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

export function updateCategoryDropdowns(categories) {
    const dropdowns = document.querySelectorAll('.category-select');
    dropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = '';
        
        // Добавляем пустую опцию
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Выберите категорию';
        dropdown.appendChild(emptyOption);
        
        // Добавляем категории
        if (categories && Array.isArray(categories)) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                option.style.color = category.color;
                dropdown.appendChild(option);
            });
        }
        
        // Восстанавливаем выбранное значение
        if (currentValue) {
            dropdown.value = currentValue;
        }
    });
} 