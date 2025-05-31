from flask import Blueprint, render_template, request, jsonify, flash
from models import db, Category, Task
from datetime import datetime

main = Blueprint('main', __name__)

@main.route('/')
def index():
    categories = Category.query.order_by(Category.position.asc()).all()
    tasks_by_cat = {}
    for cat in categories:
        tasks_by_cat[cat.id] = Task.query.filter_by(category_id=cat.id).order_by(Task.created_at.desc()).all()

    deadline_events = []
    for cat in categories:
        for task in tasks_by_cat[cat.id]:
            if task.deadline:
                deadline_events.append({
                    'id': str(task.id),
                    'title': task.title,
                    'start': task.deadline.strftime('%Y-%m-%d'),
                    'color': '#6c757d' if task.completed else '#dc3545',
                    'completed': task.completed
                })

    return render_template('index.html', categories=categories, tasks_by_cat=tasks_by_cat,
                           deadline_events=deadline_events)

@main.route('/add_category', methods=['POST'])
def add_category():
    category_name = request.form.get('category_name')
    category_color = request.form.get('category_color', '#ffffff')
    if category_name:
        # Найдём максимальную позицию и добавим категорию в конец
        max_position = db.session.query(db.func.max(Category.position)).scalar() or 0
        new_category = Category(name=category_name, color=category_color, position=max_position + 1)
        db.session.add(new_category)
        db.session.commit()
        return jsonify({'success': True, 'category_id': new_category.id})
    return jsonify({'success': False, 'message': 'Category name is required'})

@main.route('/edit_category_color/<int:cat_id>', methods=['POST'])
def edit_category_color(cat_id):
    category = Category.query.get_or_404(cat_id)
    new_color = request.form.get('category_color')
    if new_color:
        category.color = new_color
        db.session.commit()
        return jsonify({'success': True, 'color': new_color})
    return jsonify({'success': False, 'message': 'Color is required'})

@main.route('/update_category_order', methods=['POST'])
def update_category_order():
    order = request.form.getlist('order[]')  # Получаем список ID категорий в новом порядке
    for index, cat_id in enumerate(order):
        category = Category.query.get(int(cat_id))
        if category:
            category.position = index
    db.session.commit()
    return jsonify({'success': True})

@main.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({'success': True})

@main.route('/add_task', methods=['POST'])
def add_task():
    title = request.form.get('title')
    note = request.form.get('note')
    deadline_str = request.form.get('deadline')
    category_id = request.form.get('category_id')

    if not title or not category_id:
        return jsonify({'success': False, 'message': 'Title and category are required'})

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.strptime(deadline_str, '%d.%m.%Y').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid deadline format'})

    new_task = Task(
        title=title,
        note=note,
        deadline=deadline,
        category_id=int(category_id)
    )
    db.session.add(new_task)
    db.session.commit()

    deadline_response = deadline.strftime('%Y-%m-%d') if deadline else None
    return jsonify({
        'success': True,
        'task_id': new_task.id,
        'title': new_task.title,
        'deadline': deadline_response,
        'completed': new_task.completed
    })

@main.route('/toggle_task/<int:task_id>')
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    task.completed = not task.completed
    db.session.commit()
    return jsonify({
        'success': True,
        'task_id': task.id,
        'completed': task.completed,
        'color': '#6c757d' if task.completed else '#dc3545'
    })

@main.route('/delete_task/<int:task_id>')
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True, 'task_id': task_id})

@main.route('/edit_note/<int:task_id>', methods=['POST'])
def edit_note(task_id):
    task = Task.query.get_or_404(task_id)
    new_note = request.form.get('new_note')
    task.note = new_note if new_note else None
    db.session.commit()
    return jsonify({'success': True, 'note': task.note})

@main.route('/edit_deadline/<int:task_id>', methods=['POST'])
def edit_deadline(task_id):
    task = Task.query.get_or_404(task_id)
    new_deadline_str = request.form.get('new_deadline')
    if new_deadline_str:
        try:
            task.deadline = datetime.strptime(new_deadline_str, '%d.%m.%Y').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid deadline format'})
    else:
        task.deadline = None
    db.session.commit()
    deadline_response = task.deadline.strftime('%Y-%m-%d') if task.deadline else None
    return jsonify({'success': True, 'deadline': deadline_response})