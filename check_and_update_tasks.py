import sqlite3
import os

# Путь к вашей базе данных
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'db.sqlite3')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Проверяем, есть ли задачи в базе
c.execute('SELECT COUNT(*) FROM task')
count = c.fetchone()[0]
print(f'Количество задач в базе данных: {count}')

if count > 0:
    # Обновляем все задачи, чтобы user_id стал NULL
    c.execute('UPDATE task SET user_id = NULL')
    conn.commit()
    print('Все задачи обновлены: user_id установлен в NULL.')
else:
    print('Задач в базе данных нет.')

conn.close() 