import sqlite3
import os

# Путь к вашей базе данных
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'db.sqlite3')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# 1. Создаем новую временную таблицу без user_id
c.execute('''
CREATE TABLE IF NOT EXISTS task_new (
    id INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    note TEXT,
    deadline DATE,
    completed BOOLEAN DEFAULT 0,
    created_at DATE NOT NULL,
    "order" INTEGER DEFAULT 0 NOT NULL,
    category_id INTEGER NOT NULL,
    file_urls VARCHAR(1024),
    FOREIGN KEY(category_id) REFERENCES category(id)
)
''')

# 2. Копируем данные из старой таблицы (без user_id)
c.execute('''
INSERT INTO task_new (id, title, note, deadline, completed, created_at, "order", category_id, file_urls)
SELECT id, title, note, deadline, completed, created_at, "order", category_id, file_urls FROM task
''')

# 3. Удаляем старую таблицу
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='task'").fetchall()
if tables:
    c.execute('DROP TABLE task')

# 4. Переименовываем новую таблицу
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='task_new'").fetchall()
if tables:
    c.execute('ALTER TABLE task_new RENAME TO task')

conn.commit()
conn.close()

print('Столбец user_id успешно удалён из таблицы task. Все данные сохранены.') 