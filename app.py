from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Модели
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tasks = db.relationship('Task', backref='category', cascade="all, delete-orphan", lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    note = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)

# Создание таблиц при первом запуске
with app.app_context():
    db.create_all()

# Главная страница
@app.route('/')
def index():
    categories = Category.query.all()
    tasks_by_cat = {cat.id: Task.query.filter_by(category_id=cat.id).all() for cat in categories}
    return render_template('index.html', categories=categories, tasks_by_cat=tasks_by_cat)

# Добавление категории
@app.route('/add_category', methods=['POST'])
def add_category():
    name = request.form.get('category_name', '').strip()
    if name:
        db.session.add(Category(name=name))
        db.session.commit()
    return redirect(url_for('index'))

# Удаление категории
@app.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    db.session.delete(category)
    db.session.commit()
    return redirect(url_for('index'))

# Добавление задачи
@app.route('/add_task', methods=['POST'])
def add_task():
    title = request.form.get('title', '').strip()
    note = request.form.get('note', '').strip()
    category_id = request.form.get('category_id')
    if title and category_id:
        db.session.add(Task(title=title, note=note, category_id=int(category_id)))
        db.session.commit()
    return redirect(url_for('index'))

# Переключение статуса
@app.route('/toggle_task/<int:task_id>')
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.completed = not task.completed
    db.session.commit()
    return redirect(url_for('index'))

# Удаление задачи
@app.route('/delete_task/<int:task_id>')
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return redirect(url_for('index'))

# Редактирование заметки
@app.route('/edit_note/<int:task_id>', methods=['POST'])
def edit_note(task_id):
    new_note = request.form.get('new_note', '').strip()
    task = Task.query.get_or_404(task_id)
    task.note = new_note
    db.session.commit()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5002)