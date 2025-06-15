from app import app, db
from models import User, Category, Task

def reset_database():
    with app.app_context():
        # Удаляем все существующие таблицы
        db.drop_all()
        
        # Создаем таблицы заново
        db.create_all()
        
        # Создаем пользователей
        user1 = User(username='bbokariev')
        user1.set_password('0101')
        
        user2 = User(username='szakhar')
        user2.set_password('changeme')
        
        # Добавляем пользователей в базу данных
        db.session.add(user1)
        db.session.add(user2)
        
        # Сохраняем изменения
        db.session.commit()
        
        print("База данных успешно пересоздана!")
        print("Созданы пользователи:")
        print("- bbokariev (пароль: 0101)")
        print("- szakhar (пароль: changeme)")

if __name__ == '__main__':
    reset_database() 