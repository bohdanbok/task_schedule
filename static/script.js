document.addEventListener('DOMContentLoaded', function () {
  // FullCalendar
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    locale: 'ru',
    events: window.deadlineEvents || []
  });
  calendar.render();

  // Flatpickr для всех дат
  flatpickr('.flatpickr-date', {
    dateFormat: 'd.m.Y',
    locale: 'ru'
  });
});

function toggleEdit(taskId, show) {
  const form = document.getElementById('note-form-' + taskId);
  const display = document.getElementById('note-display-' + taskId);
  if (form) form.style.display = show ? 'block' : 'none';
  if (display) display.style.display = show ? 'none' : 'block';
}