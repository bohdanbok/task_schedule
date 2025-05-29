from flask import Flask, render_template, request, redirect, url_for
import json, os

app = Flask(__name__)
DATA_FILE = 'tasks.json'

# Загрузка задач
def load_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

# Сохранение задач
def save_tasks(tasks):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)

# Главная страница: добавить и показать задачи
@app.route('/', methods=['GET', 'POST'])
def index():
    tasks = load_tasks()
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        if title:
            # По умолчанию новая задача не выполнена
            tasks.append({'title': title, 'completed': False})
            save_tasks(tasks)
        return redirect(url_for('index'))
    return render_template('index.html', tasks=tasks)

# Маршрут для переключения статуса выполнено/не выполнено
@app.route('/toggle/<int:idx>')
def toggle(idx):
    tasks = load_tasks()
    if 0 <= idx < len(tasks):
        tasks[idx]['completed'] = not tasks[idx].get('completed', False)
        save_tasks(tasks)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)