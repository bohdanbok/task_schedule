from flask import Blueprint, render_template, request, redirect, url_for
from models import db, Category, Task
from datetime import datetime

main = Blueprint('main', __name__)

@main.route('/')
def index():
    categories = Category.query.all()
    tasks_by_cat = {
        cat.id: Task.query.filter_by(category_id=cat.id).all()
        for cat in categories
    }
    deadline_events = []
    for task_list in tasks_by_cat.values():
        for task in task_list:
            if task.deadline:
                deadline_events.append({
                    'title': task.title,
                    'start': task.deadline.strftime('%Y-%m-%d'),
                    'color': '#dc3545' if not task.completed else '#6c757d'
                })
    return render_template(
        'index.html',
        categories=categories,
        tasks_by_cat=tasks_by_cat,
        deadline_events=deadline_events
    )

@main.route('/add_category', methods=['POST'])
def add_category():
    name = request.form.get('category_name', '').strip()
    if name:
        max_order = db.session.query(db.func.max(Category.order)).scalar() or 0
        category = Category(name=name, order=max_order + 1)
        db.session.add(category)
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    db.session.delete(category)
    db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/add_task', methods=['POST'])
def add_task():
    title = request.form.get('title', '').strip()
    note = request.form.get('note', '').strip()
    category_id = request.form.get('category_id')
    deadline_str = request.form.get('deadline', '').strip()
    deadline = datetime.strptime(deadline_str, '%d.%m.%Y') if deadline_str else None

    if title and category_id:
        max_order = db.session.query(db.func.max(Task.order)).filter_by(category_id=category_id).scalar() or 0
        task = Task(
            title=title,
            note=note,
            category_id=int(category_id),
            deadline=deadline,
            order=max_order + 1
        )
        db.session.add(task)
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/toggle_task/<int:task_id>')
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.completed = not task.completed
    db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/delete_task/<int:task_id>')
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/edit_note/<int:task_id>', methods=['POST'])
def edit_note(task_id):
    task = Task.query.get_or_404(task_id)
    new_note = request.form.get('new_note', '').strip()
    task.note = new_note
    db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/edit_deadline/<int:task_id>', methods=['POST'])
def edit_deadline(task_id):
    task = Task.query.get_or_404(task_id)
    new_deadline_str = request.form.get('new_deadline', '').strip()
    task.deadline = datetime.strptime(new_deadline_str, '%d.%m.%Y') if new_deadline_str else None
    db.session.commit()
    return redirect(url_for('main.index'))