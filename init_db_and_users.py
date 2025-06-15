from app import app, db
from models import User, Category, Task
import os

# Путь к вашей базе данных
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
DB_PATH = os.path.join(INSTANCE_DIR, 'db.sqlite3')

# Убедимся, что папка instance существует
if not os.path.exists(INSTANCE_DIR):
    os.makedirs(INSTANCE_DIR)

# Удаляем старую базу данных, если она существует
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"Существующая база данных {DB_PATH} удалена.")

with app.app_context():
    db.create_all()
    print("База данных и таблицы успешно созданы.")

    # Создаем пользователей, если их еще нет
    if not User.query.filter_by(username='bbokariev').first():
        user1 = User(username='bbokariev')
        user1.set_password('0101')
        db.session.add(user1)
        print("Пользователь bbokariev создан.")
    else:
        print("Пользователь bbokariev уже существует.")

    if not User.query.filter_by(username='szakhar').first():
        user2 = User(username='szakhar')
        user2.set_password('changeme')
        db.session.add(user2)
        print("Пользователь szakhar создан.")
    else:
        print("Пользователь szakhar уже существует.")

    db.session.commit()
    print("Пользователи успешно добавлены/обновлены.")

print("Процесс инициализации базы данных и пользователей завершен.") 