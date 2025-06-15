from app import app, db
from models import Category

def update_category_orders():
    with app.app_context():
        # Получаем все категории
        categories = Category.query.order_by(Category.order).all()
        
        # Обновляем порядок для каждой категории
        for i, category in enumerate(categories):
            category.order = i
        
        # Сохраняем изменения
        db.session.commit()
        
        print(f"Обновлен порядок для {len(categories)} категорий")

if __name__ == '__main__':
    update_category_orders()
    print("Обновление порядка категорий завершено") 