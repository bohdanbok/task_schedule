// static/js/mapInitializer.js

// Функция для инициализации карты Google Maps и отображения пробок
window.initMap = function() {
    const mapDiv = document.getElementById('traffic-widget');
    if (!mapDiv) {
        console.error('Traffic widget element not found.');
        return;
    }

    const map = new google.maps.Map(mapDiv, {
        center: { lat: 25.77665, lng: -80.19177 }, // Координаты для 650 NE 2nd Ave, Miami
        zoom: 15, // Увеличим масштаб для лучшей детализации
        disableDefaultUI: true, // Снова убираем все стандартные элементы управления
        gestureHandling: 'auto', // Оставляем управление жестами
        fullscreenControl: true // Включаем только кнопку полноэкранного режима
    });

    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
}; 