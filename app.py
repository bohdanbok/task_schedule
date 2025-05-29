from flask import Flask, render_template, request, redirect, url_for
import json
import os

app = Flask(__name__)
DATA_FILE = 'tasks.json'

# Загрузка задач из JSON
def load_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Сохранение задач в JSON
def save_tasks(tasks):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)

# Главная страница: показать и добавить задачу
@app.route('/', methods=['GET', 'POST'])
def index():
    tasks = load_tasks()
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        if title:
            tasks.append({'title': title})
            save_tasks(tasks)
        return redirect(url_for('index'))
    return render_template('index.html', tasks=tasks)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)