from app import app, db
from models import User

def update_users():
    with app.app_context():
        # Обновляем или создаем пользователя bbokariev
        user1 = User.query.filter_by(username='bbokariev').first()
        if not user1:
            user1 = User(username='bbokariev')
        user1.set_password('0101')
        db.session.add(user1)
        
        # Обновляем или создаем пользователя szakhar
        user2 = User.query.filter_by(username='szakhar').first()
        if not user2:
            user2 = User(username='szakhar')
        user2.set_password('changeme')
        db.session.add(user2)
        
        # Сохраняем изменения
        db.session.commit()
        
        print("Пользователи успешно обновлены!")
        print("Доступные пользователи:")
        print("- bbokariev (пароль: 0101)")
        print("- szakhar (пароль: changeme)")

if __name__ == '__main__':
    update_users() 