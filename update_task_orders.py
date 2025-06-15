from app import app, db
from models import Task, Category

def update_task_orders():
    with app.app_context():
        # Получаем все категории
        categories = Category.query.all()
        
        for category in categories:
            # Получаем все задачи в категории
            tasks = Task.query.filter_by(category_id=category.id).order_by(Task.order).all()
            
            # Обновляем порядок для каждой задачи
            for i, task in enumerate(tasks):
                task.order = i
            
            # Сохраняем изменения
            db.session.commit()
            
            print(f"Обновлен порядок задач в категории {category.name}")

if __name__ == '__main__':
    update_task_orders()
    print("Обновление порядка задач завершено") 