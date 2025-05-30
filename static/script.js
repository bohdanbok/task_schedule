document.addEventListener('DOMContentLoaded', function () {
  // Инициализация календаря FullCalendar
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

  // Инициализация всех инпутов дедлайна с flatpickr
  flatpickr("input[name='deadline'], input[name='new_deadline']", {
    dateFormat: "d.m.Y",
    locale: "ru"
  });
});

function toggleEdit(taskId, show) {
  const form = document.getElementById('note-form-' + taskId);
  const display = document.getElementById('note-display-' + taskId);
  if (form) form.style.display = show ? 'block' : 'none';
  if (display) display.style.display = show ? 'none' : 'block';
}

function toggleDeadlineEdit(taskId, show) {
  const form = document.getElementById('deadline-form-' + taskId);
  const display = document.getElementById('deadline-display-' + taskId);
  if (form) form.style.display = show ? 'inline-flex' : 'none';
  if (display) display.style.display = show ? 'none' : 'inline';
}