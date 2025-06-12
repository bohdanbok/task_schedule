from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from views import main
from models import db
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'  # Для flash-сообщений

# Конфигурация для загрузки файлов
UPLOAD_FOLDER = 'static/uploads'
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

# Создание таблиц базы данных
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # app.run(debug=True, port=5002)
    pass
