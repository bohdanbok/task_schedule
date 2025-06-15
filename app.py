from flask import Flask
from flask_sqlalchemy import SQLAlchemy  # noqa: F401
from flask_login import LoginManager
from views import main
from models import db, User
import os

app = Flask(__name__)

# Определяем абсолютный путь к базе данных в папке instance
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
if not os.path.exists(INSTANCE_DIR):
    os.makedirs(INSTANCE_DIR)
DB_PATH = os.path.join(INSTANCE_DIR, 'db.sqlite3')

# Используем абсолютный путь для базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'  # Для flash-сообщений

# Инициализация Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'main.login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Конфигурация для загрузки файлов
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static/uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'xlsx'}  # Добавили CSV и XLSX

# Убедимся, что папка для загрузки существует
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Функция проверки допустимых расширений
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

db.init_app(app)
app.register_blueprint(main)

if __name__ == '__main__':
    # Создание таблиц базы данных и пользователей
    with app.app_context():
        db.create_all()
        print("База данных и таблицы успешно созданы при запуске app.py.")
        
        # Создаем пользователей, если их еще нет
        if not User.query.filter_by(username='bbokariev').first():
            user1 = User(username='bbokariev')
            user1.set_password('0101')
            db.session.add(user1)
            print("Пользователь bbokariev создан при запуске app.py.")
        
        if not User.query.filter_by(username='szakhar').first():
            user2 = User(username='szakhar')
            user2.set_password('changeme')
            db.session.add(user2)
            print("Пользователь szakhar создан при запуске app.py.")
        
        db.session.commit()
        print("Пользователи успешно добавлены/обновлены при запуске app.py.")
        
    app.run(debug=True, port=5002)
    pass