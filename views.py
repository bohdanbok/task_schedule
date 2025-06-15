from flask import Blueprint, render_template, request, jsonify, redirect, url_for, current_app, flash
from flask_login import login_user, logout_user, login_required, current_user
from models import db, Category, Task, User
from datetime import datetime, date
import uuid
from werkzeug.utils import secure_filename
import os

main = Blueprint('main', __name__)


@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('main.index'))
        else:
            flash('Неверное имя пользователя или пароль')
    
    return render_template('login.html')


@main.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))


@main.route('/')
@login_required
def index():
    categories = Category.query.order_by(Category.order).all()
    tasks_by_cat = {cat.id: Task.query.filter_by(category_id=cat.id, user_id=current_user.id).order_by(Task.order).all() for cat in categories}

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
    return jsonify({
        'success': True,
        'category': {
            'id': category.id,
            'name': category.name,
            'color': category.color
        }
    })


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


@main.route('/delete_category/<int:cat_id>', methods=['POST'])
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

    deadline_str = data.get('task_deadline')
    deadline = datetime.strptime(deadline_str, '%d.%m.%Y').date() if deadline_str else None
    
    # Определяем следующий порядок для новой задачи в этой категории
    # Получаем максимальный order для задач в данной категории
    max_order = db.session.query(db.func.max(Task.order)).filter_by(category_id=int(data['category_id'])).scalar()
    new_order = (max_order + 1) if max_order is not None else 0

    task = Task(
        title=data['task_title'],
        note=data.get('task_note'),
        deadline=deadline,
        created_at=date.today(),
        category_id=int(data['category_id']),
        user_id=current_user.id,
        order=new_order, # Присваиваем определенный порядок
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
        'created_at': task.created_at.strftime('%Y-%m-%d'),
        'file_urls': task.file_urls
    })


@main.route('/edit_task/<int:task_id>', methods=['POST'])
def edit_task(task_id):
    from app import allowed_file, ALLOWED_EXTENSIONS

    task = Task.query.get_or_404(task_id)
    data = request.form
    new_files = request.files.getlist('file') # Новые файлы для загрузки

    print(f"[DEBUG] edit_task: Получены данные для задачи {task_id}: {data}")
    print(f"[DEBUG] edit_task: Новые файлы: {[f.filename for f in new_files if f.filename]}")

    # Обновляем поля задачи
    task.title = data.get('new_title', task.title)
    task.note = data.get('new_note')
    
    deadline_str = data.get('new_deadline')
    print(f"[DEBUG] edit_task: deadline_str = {deadline_str}")
    try:
        task.deadline = datetime.strptime(deadline_str, '%d.%m.%Y').date() if deadline_str else None
    except ValueError as e:
        print(f"[ERROR] edit_task: Ошибка парсинга даты: {e}")
        return jsonify({'success': False, 'message': 'Неверный формат даты.'}), 400

    new_category_id = int(data.get('new_category_id', task.category_id))
    task.category_id = new_category_id

    # Получаем текущие URL файлов задачи
    updated_file_urls = task.file_urls.split(',') if task.file_urls else []

    upload_folder = current_app.config['UPLOAD_FOLDER']

    # Добавляем новые файлы
    for file in new_files:
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file_path = os.path.join(upload_folder, unique_filename)
            print(f"[DEBUG] edit_task: Сохранение нового файла: {file_path}")
            try:
                file.save(file_path)
                updated_file_urls.append(f"/static/uploads/{unique_filename}")
                print(f"[DEBUG] edit_task: Новый файл сохранен: {unique_filename}")
            except Exception as e:
                print(f"[ERROR] edit_task: Ошибка при сохранении файла {unique_filename}: {e}")
                return jsonify({'success': False, 'message': f'Ошибка при сохранении файла: {e}'}), 500

    task.file_urls = ','.join(updated_file_urls) if updated_file_urls else None
    print(f"[DEBUG] edit_task: Итоговый task.file_urls перед коммитом: {task.file_urls}")

    try:
        db.session.commit()
        print(f"[DEBUG] edit_task: Изменения в базе данных зафиксированы для задачи {task.id}")
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] edit_task: Ошибка коммита в базу данных: {e}")
        return jsonify({'success': False, 'message': f'Ошибка базы данных: {e}'}), 500

    print(f"Edited task {task.id} with files: {task.file_urls}")
    return jsonify({
        'success': True,
        'title': task.title,
        'note': task.note,
        'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
        'file_urls': task.file_urls,
        'completed': task.completed,
        'category_id': task.category_id # Добавляем category_id для обновления JS
    })


@main.route('/toggle_task/<int:task_id>', methods=['POST'])
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


@main.route('/get_task_details/<int:task_id>')
def get_task_details(task_id):
    task = Task.query.get_or_404(task_id)
    file_info = []
    if task.file_urls:
        for url in task.file_urls.split(','):
            if url:
                filename = url.split('/')[-1].split('_', 1)[-1]
                file_info.append({'url': url, 'filename': filename})

    return jsonify({
        'success': True,
        'task': {
            'title': task.title,
            'note': task.note,
            'deadline': task.deadline.strftime('%d.%m.%Y') if task.deadline else None,
            'category_id': task.category_id,
        },
        'files': file_info
    })


@main.route('/delete_task/<int:task_id>', methods=['POST'])
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


@main.route('/api/tasks_deadlines')
def api_tasks_deadlines():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
        'completed': task.completed
    } for task in tasks])


@main.route('/get_all_tasks')
@login_required
def get_all_tasks():
    tasks = Task.query.all()
    return jsonify({
        'success': True,
        'tasks': [{
            'id': task.id,
            'title': task.title,
            'deadline': task.deadline.strftime('%Y-%m-%d') if task.deadline else None,
            'completed': task.completed,
            'category_id': task.category_id
        } for task in tasks]
    })


@main.route('/delete_task_file/<int:task_id>', methods=['POST'])
@login_required
def delete_task_file(task_id):
    try:
        data = request.get_json()
        file_url = data.get('file_url')
        
        if not file_url:
            return jsonify({'success': False, 'message': 'URL файла не указан'})
            
        task = Task.query.get_or_404(task_id)
        if task.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Нет доступа к этой задаче'})
            
        # Получаем список файлов задачи
        files = task.file_urls.split(',') if task.file_urls else []
        
        # Удаляем файл из списка
        if file_url in files:
            files.remove(file_url)
            
            # Обновляем список файлов в базе данных
            task.file_urls = ','.join(files)
            db.session.commit()
            
            # Удаляем физический файл
            try:
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_url.split('/')[-1])
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Ошибка при удалении файла: {e}")
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Файл не найден'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@main.route('/get_all_categories')
@login_required
def get_all_categories():
    categories = Category.query.order_by(Category.order).all()
    return jsonify({
        'success': True,
        'categories': [{
            'id': category.id,
            'name': category.name,
            'color': category.color
        } for category in categories]
    })


@main.route('/update_task_position', methods=['POST'])
@login_required
def update_task_position():
    data = request.get_json()
    task_id = data.get('task_id')
    new_category_id = data.get('new_category_id')
    target_task_id = data.get('target_task_id') # ID задачи, до/после которой вставляем
    position = data.get('position') # 'before', 'after', 'start', 'end'

    dragged_task = Task.query.get_or_404(task_id)
    if dragged_task.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Нет доступа к этой задаче'}), 403

    old_category_id = dragged_task.category_id

    try:
        # Если категория изменилась
        if new_category_id and int(new_category_id) != old_category_id:
            dragged_task.category_id = int(new_category_id)
            # Временно устанавливаем order в -1, чтобы исключить из старой категории при пересчете
            dragged_task.order = -1
            db.session.commit()

            # Пересчитываем order в старой категории
            tasks_in_old_category = Task.query.filter_by(category_id=old_category_id, user_id=current_user.id).order_by(Task.order).all()
            for i, task in enumerate(tasks_in_old_category):
                task.order = i
            db.session.commit()

        # Пересчитываем order в новой категории (или текущей, если категория не менялась)
        target_cat_id = int(new_category_id) if new_category_id else old_category_id
        tasks_in_target_category = Task.query.filter_by(category_id=target_cat_id, user_id=current_user.id).order_by(Task.order).all()

        # Удаляем перетаскиваемую задачу из списка для временного пересчета
        tasks_in_target_category = [t for t in tasks_in_target_category if t.id != dragged_task.id]

        if position == 'start':
            new_ordered_tasks = [dragged_task] + tasks_in_target_category
        elif position == 'end':
            new_ordered_tasks = tasks_in_target_category + [dragged_task]
        elif target_task_id:
            target_task_index = next((i for i, t in enumerate(tasks_in_target_category) if t.id == target_task_id), -1)
            if target_task_index != -1:
                if position == 'before':
                    new_ordered_tasks = tasks_in_target_category[:target_task_index] + [dragged_task] + tasks_in_target_category[target_task_index:]
                elif position == 'after':
                    new_ordered_tasks = tasks_in_target_category[:target_task_index + 1] + [dragged_task] + tasks_in_target_category[target_task_index + 1:]
                else: # Default to after if position is invalid
                    new_ordered_tasks = tasks_in_target_category[:target_task_index + 1] + [dragged_task] + tasks_in_target_category[target_task_index + 1:]
            else:
                # Если target_task_id не найден, помещаем в конец
                new_ordered_tasks = tasks_in_target_category + [dragged_task]
        else:
            # Если нет target_task_id и position, помещаем в конец (на случай невалидного запроса)
            new_ordered_tasks = tasks_in_target_category + [dragged_task]

        # Обновляем order для всех задач в целевой категории
        for i, task in enumerate(new_ordered_tasks):
            task.order = i
            # Если это перетаскиваемая задача, убедимся, что ее category_id актуален
            if task.id == dragged_task.id and task.category_id != target_cat_id:
                task.category_id = target_cat_id

        db.session.commit()

        return jsonify({'success': True})

    except Exception as e:
        db.session.rollback()
        print(f"Ошибка при обновлении позиции задачи: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@main.route('/get_tasks_by_category/<int:category_id>')
@login_required
def get_tasks_by_category(category_id):
    tasks = Task.query.filter_by(category_id=category_id, user_id=current_user.id).order_by(Task.order).all()
    tasks_data = []
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
        tasks_data.append({
            'task': {
                'id': task.id,
                'title': task.title,
                'note': task.note,
                'deadline': task.deadline.strftime('%d.%m.%Y') if task.deadline else None,
                'completed': task.completed,
                'created_at': task.created_at.strftime('%d.%m.%Y'),
                'category_id': task.category_id
            },
            'files': file_info
        })
    return jsonify({'success': True, 'tasks': tasks_data})


@main.route('/change_password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    print(f"[DEBUG] Change password for user: {current_user.username}")
    print(f"[DEBUG] Current password from form: {current_password}")
    print(f"[DEBUG] User password hash from DB: {current_user.password_hash}")
    print(f"[DEBUG] Check password result: {current_user.check_password(current_password)}")

    if not current_user.check_password(current_password):
        return jsonify({'success': False, 'message': 'Неверный текущий пароль.'}), 400

    try:
        current_user.set_password(new_password)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Пароль успешно изменен.'})
    except Exception as e:
        db.session.rollback()
        print(f"Ошибка при изменении пароля: {e}")
        return jsonify({'success': False, 'message': 'Ошибка базы данных при изменении пароля.'}), 500