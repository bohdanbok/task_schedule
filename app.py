from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# МОДЕЛИ
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tasks = db.relationship('Task', backref='category', cascade="all, delete-orphan", lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)

# СОЗДАНИЕ БД
with app.app_context():
    db.create_all()

# ГЛАВНАЯ СТРАНИЦА
@app.route('/')
def index():
    categories = Category.query.all()
    tasks_by_cat = {cat.id: Task.query.filter_by(category_id=cat.id).all() for cat in categories}
    return render_template('index.html', categories=categories, tasks_by_cat=tasks_by_cat)

# ДОБАВИТЬ КАТЕГОРИЮ
@app.route('/add_category', methods=['POST'])
def add_category():
    name = request.form.get('category_name', '').strip()
    if name:
        category = Category(name=name)
        db.session.add(category)
        db.session.commit()
    return redirect(url_for('index'))

# УДАЛИТЬ КАТЕГОРИЮ + ЗАДАЧИ
@app.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    db.session.delete(category)
    db.session.commit()
    return redirect(url_for('index'))

# ДОБАВИТЬ ЗАДАЧУ
@app.route('/add_task', methods=['POST'])
def add_task():
    title = request.form.get('title', '').strip()
    category_id = request.form.get('category_id')
    if title and category_id:
        task = Task(title=title, category_id=int(category_id))
        db.session.add(task)
        db.session.commit()
    return redirect(url_for('index'))

# ПЕРЕКЛЮЧИТЬ СТАТУС ЗАДАЧИ
@app.route('/toggle_task/<int:task_id>')
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.completed = not task.completed
    db.session.commit()
    return redirect(url_for('index'))

# УДАЛИТЬ ЗАДАЧУ
@app.route('/delete_task/<int:task_id>')
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5002)