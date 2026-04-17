from datetime import datetime

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column("name", db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="client")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    city = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(120), nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, nullable=False, default=4.5)
    prestataire_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    date = db.Column(db.String(40), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(40), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    prestataire_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("client_id", "prestataire_id", name="uq_client_prestataire_favorite"),
    )


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class PlannerItem(db.Model):
    __tablename__ = "planner_items"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
