from flask import Blueprint, render_template, request, jsonify, redirect, url_for, current_app
from models import db, Category, Task
from datetime import datetime, date
import uuid
from werkzeug.utils import secure_filename
import os

main = Blueprint('main', __name__)


@main.route('/')
def index():
    categories = Category.query.order_by(Category.order).all()
    tasks_by_cat = {cat.id: Task.query.filter_by(category_id=cat.id).all() for cat in categories}

    tasks_by_cat_with_files = {}
    for cat_id, tasks in tasks_by_cat.items():
        tasks_with_files = []
        for task in tasks:
            file_info = []
            if task.file_urls:
                for url in task.file_urls.split(','):
                    if url:
                        filename = url.split('/')[-1].split('_', 1)[-1]
                        is_image = url.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))
                        is_document = url.lower().endswith(('.pdf', '.docx', '.csv', '.xlsx'))
                        file_info.append({
                            'url': url,
                            'filename': filename,
                            'is_image': is_image,
                            'is_document': is_document
                        })
            tasks_with_files.append({
                'task': task,
                'files': file_info
            })
        tasks_by_cat_with_files[cat_id] = tasks_with_files

    deadline_events = [
        {
            'id': str(task.id),
            'title': task.title,
            'start': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
            'color': '#6c757d' if task.completed else '#dc3545',
            'completed': task.completed
        }
        for cat in categories
        for task in tasks_by_cat[cat.id]
        if task.deadline
    ]
    return render_template('index.html', categories=categories, tasks_by_cat=tasks_by_cat_with_files,
                           deadline_events=deadline_events)


@main.route('/add_category', methods=['POST'])
def add_category():
    data = request.form
    max_order = db.session.query(db.func.max(Category.order)).scalar() or 0
    category = Category(
        name=data['category_name'],
        color=data.get('category_color', '#ffffff'),
        order=max_order + 1
    )
    db.session.add(category)
    db.session.commit()
    return jsonify({'success': True, 'category_id': category.id})


@main.route('/edit_category_color/<int:cat_id>', methods=['POST'])
def edit_category_color(cat_id):
    category = Category.query.get_or_404(cat_id)
    data = request.form
    category.color = data.get('category_color', '#ffffff')
    db.session.commit()
    return jsonify({'success': True, 'color': category.color})


@main.route('/update_category_order', methods=['POST'])
def update_category_order():
    order = request.form.getlist('order[]')
    for idx, cat_id in enumerate(order):
        category = Category.query.get(cat_id)
        category.order = idx
    db.session.commit()
    return jsonify({'success': True})


@main.route('/delete_category/<int:cat_id>')
def delete_category(cat_id):
    category = Category.query.get_or_404(cat_id)
    # Удаляем все связанные задачи
    Task.query.filter_by(category_id=cat_id).delete()
    db.session.delete(category)
    db.session.commit()
    return jsonify({'success': True})


@main.route('/add_task', methods=['POST'])
def add_task():
    from app import allowed_file, ALLOWED_EXTENSIONS

    data = request.form
    files = request.files.getlist('file')
    file_urls = []

    upload_folder = current_app.config['UPLOAD_FOLDER']
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            file_urls.append(f"/static/uploads/{unique_filename}")

    file_urls_str = ','.join(file_urls) if file_urls else None

    deadline_str = data.get('deadline')
    deadline = datetime.strptime(deadline_str, '%d.%m.%Y').date() if deadline_str else None
    task = Task(
        title=data['title'],
        note=data.get('note'),
        deadline=deadline,
        created_at=date.today(),
        category_id=int(data['category_id']),
        file_urls=file_urls_str
    )
    db.session.add(task)
    db.session.commit()
    print(f"Added task {task.id} with files: {file_urls_str}")
    return jsonify({
        'success': True,
        'task_id': task.id,
        'title': task.title,
        'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
        'completed': task.completed,
        'file_urls': task.file_urls
    })


@main.route('/edit_task/<int:task_id>', methods=['POST'])
def edit_task(task_id):
    from app import allowed_file, ALLOWED_EXTENSIONS

    task = Task.query.get_or_404(task_id)
    data = request.form
    files = request.files.getlist('file')

    # Получаем существующие файлы
    existing_file_urls = task.file_urls.split(',') if task.file_urls else []
    # Получаем файлы, которые нужно удалить
    files_to_delete = request.form.getlist('delete_files')
    upload_folder = current_app.config['UPLOAD_FOLDER']

    # Удаляем только те файлы, которые пользователь отметил для удаления
    for file_url in files_to_delete:
        if file_url in existing_file_urls:
            file_path = os.path.join(upload_folder, file_url.replace('/static/uploads/', ''))
            if os.path.exists(file_path):
                os.remove(file_path)
            existing_file_urls.remove(file_url)

    # Добавляем новые файлы
    new_file_urls = []
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            new_file_urls.append(f"/static/uploads/{unique_filename}")

    # Объединяем существующие и новые файлы
    file_urls = existing_file_urls + new_file_urls
    file_urls_str = ','.join(file_urls) if file_urls else None

    task.note = data.get('new_note')
    deadline_str = data.get('new_deadline')
    task.deadline = datetime.strptime(deadline_str, '%d.%m.%Y').date() if deadline_str else None
    task.file_urls = file_urls_str

    db.session.commit()
    print(f"Edited task {task.id} with files: {file_urls_str}")
    return jsonify({
        'success': True,
        'note': task.note,
        'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
        'file_urls': task.file_urls,
        'title': task.title,
        'completed': task.completed
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
    upload_folder = current_app.config['UPLOAD_FOLDER']
    if task.file_urls:
        for old_url in task.file_urls.split(','):
            if old_url:
                old_path = os.path.join(upload_folder, old_url.replace('/static/uploads/', ''))
                if os.path.exists(old_path):
                    os.remove(old_path)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True, 'task_id': task_id})