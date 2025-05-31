from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), default='#ffffff')
    order = db.Column(db.Integer, default=0)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    note = db.Column(db.Text, nullable=True)
    deadline = db.Column(db.Date, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.Date, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    file_urls = db.Column(db.String(1024), nullable=True)  # Список URL через запятую
    category = db.relationship('Category', backref=db.backref('tasks', lazy=True))