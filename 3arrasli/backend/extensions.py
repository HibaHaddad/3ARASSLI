from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy

# Shared extension instances used across app modules.
db = SQLAlchemy()
bcrypt = Bcrypt()
