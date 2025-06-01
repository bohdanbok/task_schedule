from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SelectField, FileField
from wtforms.validators import DataRequired, Length, Regexp

class CategoryForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired(), Length(min=1, max=50)])
    color = StringField('Color', validators=[Regexp('^#[0-9A-Fa-f]{6}$', message="Invalid color format")])

class TaskForm(FlaskForm):
    title = StringField('Title', validators=[DataRequired(), Length(min=1, max=100)])
    note = TextAreaField('Note')
    deadline = StringField('Deadline', validators=[Regexp(r'\d{2}\.\d{2}\.\d{4}', message="Invalid date format")])
    category_id = SelectField('Category', coerce=int)
    files = FileField('Files')

class EditTaskForm(FlaskForm):
    new_note = TextAreaField('Note')
    new_deadline = StringField('Deadline', validators=[Regexp(r'\d{2}\.\d{2}\.\d{4}', message="Invalid date format")])
    delete_files = StringField('Delete Files')
    files = FileField('Files')