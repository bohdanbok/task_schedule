from flask import Flask, render_template, request, redirect, url_for
import json, os

app = Flask(__name__)
DATA_FILE = 'data.json'

# Загрузка данных (задачи + категории)
def load_data():
    if not os.path.exists(DATA_FILE):
        return {'tasks': [], 'categories': []}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {'tasks': [], 'categories': []}

# Сохранение данных
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Главная страница: отображение
@app.route('/', methods=['GET'])
def index():
    data = load_data()
    tasks = data['tasks']
    categories = data['categories']

    # Группируем задачи по категориям
    tasks_by_cat = {cat['id']: [] for cat in categories}
    for idx, task in enumerate(tasks):
        cat_id = task.get('category_id')
        if cat_id in tasks_by_cat:
            tasks_by_cat[cat_id].append((idx, task))
    return render_template('index.html', categories=categories, tasks_by_cat=tasks_by_cat)

# Добавление категории
@app.route('/add_category', methods=['POST'])
def add_category():
    data = load_data()
    name = request.form.get('category_name', '').strip()
    if name:
        ids = [c['id'] for c in data['categories']]
        new_id = max(ids) + 1 if ids else 1
        data['categories'].append({'id': new_id, 'name': name})
        save_data(data)
    return redirect(url_for('index'))

# Удаление категории и всех её задач
@app.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    data = load_data()
    data['categories'] = [c for c in data['categories'] if c['id'] != cat_id]
    data['tasks'] = [t for t in data['tasks'] if t.get('category_id') != cat_id]
    save_data(data)
    return redirect(url_for('index'))

# Добавление задачи
@app.route('/add_task', methods=['POST'])
def add_task():
    data = load_data()
    title = request.form.get('title', '').strip()
    cat_id = int(request.form.get('category_id', '0'))
    if title and cat_id:
        data['tasks'].append({'title': title, 'completed': False, 'category_id': cat_id})
        save_data(data)
    return redirect(url_for('index'))

# Переключение статуса задачи
@app.route('/toggle_task/<int:idx>')
def toggle_task(idx):
    data = load_data()
    if 0 <= idx < len(data['tasks']):
        data['tasks'][idx]['completed'] = not data['tasks'][idx]['completed']
        save_data(data)
    return redirect(url_for('index'))

# Удаление задачи
@app.route('/delete_task/<int:idx>')
def delete_task(idx):
    data = load_data()
    if 0 <= idx < len(data['tasks']):
        data['tasks'].pop(idx)
        save_data(data)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)