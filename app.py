from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from views import main
from models import db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'  # Для flash-сообщений

db.init_app(app)
app.register_blueprint(main)

# Создание таблиц базы данных
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5002)