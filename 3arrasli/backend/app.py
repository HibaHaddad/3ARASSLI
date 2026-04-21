from calendar import monthrange
from datetime import date, datetime, time, timedelta
from functools import wraps
import os
from uuid import uuid4

import jwt
import pymysql
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy.engine import make_url
from sqlalchemy import inspect, text
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from extensions import bcrypt, db
from models import Favorite, Message, PlannerItem, ProviderAvailabilitySlot, ProviderCalendarBlock, Reservation, Service, User


JWT_SECRET = "change-this-secret-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 12

DEFAULT_ADMIN = {
    "username": "Administrateur Principal",
    "email": "admin@3arrasli.tn",
    "password": "Admin123!",
    "role": "admin",
}

DEFAULT_PRESTATAIRES = [
    {
        "username": "Studio Lumiere",
        "email": "studio@3arrasli.com",
        "password": "Provider123!",
        "role": "prestataire",
    },
    {
        "username": "Palais Jasmine",
        "email": "palais@3arrasli.com",
        "password": "Provider123!",
        "role": "prestataire",
    },
]

DEFAULT_CLIENT = {
    "username": "Demo Client",
    "email": "client@3arrasli.com",
    "password": "Client123!",
    "role": "client",
}

DEFAULT_DB_NAME = "ma_base"
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_IMAGE_SIZE = 2 * 1024 * 1024
STANDARD_SLOT_TIMES = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
]
FRENCH_WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
FRENCH_MONTHS = [
    "",
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
]
STANDARD_WORKING_HOURS = STANDARD_SLOT_TIMES


def build_database_uri():
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "127.0.0.1")
    db_port = os.getenv("DB_PORT", "3306")
    # Force ma_base unless DB_NAME is explicitly provided.
    db_name = os.getenv("DB_NAME") or DEFAULT_DB_NAME
    return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"


def ensure_mysql_database_exists(database_uri):
    url = make_url(database_uri)
    if not url.drivername.startswith("mysql"):
        return

    db_name = url.database
    if not db_name:
        return

    safe_db_name = db_name.replace("`", "``")
    connection = pymysql.connect(
        host=url.host or "127.0.0.1",
        port=int(url.port or 3306),
        user=url.username or "root",
        password=url.password or "",
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{safe_db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()


def serialize_user(user):
    return {
        "id": user.id,
        "name": user.username,
        "username": user.username,
        "email": user.email,
        "role": user.role.capitalize(),
        "is_active": bool(getattr(user, "is_active", True)),
        "phone": user.phone,
        "city": user.city,
        "category": user.category,
        "instagram": user.instagram,
        "website": user.website,
        "description": user.description,
        "profilePhoto": user.profile_photo,
        "coverPhoto": user.cover_photo,
    }


def serialize_admin_provider(user):
    services = Service.query.filter(
        db.or_(Service.provider_id == user.id, Service.prestataire_id == user.id)
    ).all()
    ratings = [float(service.rating) for service in services if getattr(service, "rating", None) is not None]
    average_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0

    return {
        "id": user.id,
        "name": user.username,
        "category": user.category or "",
        "city": user.city or "",
        "email": user.email,
        "phone": user.phone or "",
        "description": user.description or "",
        "instagram": user.instagram or "",
        "website": user.website or "",
        "rating": average_rating,
        "status": "active" if bool(getattr(user, "is_active", True)) else "inactive",
        "joinedAt": user.created_at.date().isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
    }


def serialize_service(service, client_id=None):
    provider_id = service.provider_id or service.prestataire_id
    favorite = None
    if client_id and provider_id:
        favorite = Favorite.query.filter_by(client_id=client_id, prestataire_id=provider_id).first()

    prestataire = User.query.get(provider_id) if provider_id else None
    return {
        "id": service.id,
        "title": service.title,
        "description": service.description,
        "price": service.price,
        "city": service.city,
        "type": service.category or service.type,
        "category": service.category or service.type,
        "image": service.image or service.image_url,
        "rating": service.rating,
        "status": service.status or "Actif",
        "provider_id": provider_id,
        "prestataire_id": provider_id,
        "prestataire_name": prestataire.username if prestataire else "Prestataire",
        "is_favorite": bool(favorite),
        "favorite_id": favorite.id if favorite else None,
        "created_at": service.created_at.isoformat() if service.created_at else None,
        "updated_at": service.updated_at.isoformat() if getattr(service, "updated_at", None) else None,
    }


def serialize_reservation(reservation):
    service = Service.query.get(reservation.service_id)
    return {
        "id": reservation.id,
        "client_id": reservation.client_id,
        "service_id": reservation.service_id,
        "service_title": service.title if service else "",
        "date": reservation.date,
        "notes": reservation.notes,
        "status": reservation.status,
        "created_at": reservation.created_at.isoformat() if reservation.created_at else None,
    }


def normalize_booking_status(status):
    normalized = str(status or "").strip().lower()

    if normalized in {"validee", "paid", "confirmed", "accepted", "acceptee"}:
        return "Validee"
    if normalized in {"refusee", "refused", "cancelled", "canceled", "rejected"}:
        return "Refusee"
    return "En attente"


def split_booking_datetime(value):
    parsed = parse_reservation_datetime(value)
    if not parsed:
        return str(value or ""), "--"

    time_label = parsed.strftime("%H:%M") if parsed.time() != time.min else "--"
    return parsed.date().isoformat(), time_label


def get_service_provider_id(service):
    return service.provider_id or service.prestataire_id if service else None


def serialize_provider_booking(reservation):
    service = Service.query.get(reservation.service_id)
    client = User.query.get(reservation.client_id)
    booking_date, booking_time = split_booking_datetime(reservation.date)
    details = getattr(reservation, "details", None) or reservation.notes or ""
    amount = getattr(reservation, "amount", None)

    return {
        "id": reservation.id,
        "clientId": reservation.client_id,
        "client": client.username if client else "Client",
        "serviceId": reservation.service_id,
        "service": service.title if service else "Service",
        "date": booking_date,
        "time": booking_time,
        "location": getattr(reservation, "location", None) or (service.city if service else "") or "--",
        "amount": amount if amount is not None else (service.price if service else 0),
        "status": normalize_booking_status(reservation.status),
        "details": details,
        "createdAt": reservation.created_at.isoformat() if reservation.created_at else None,
        "updatedAt": reservation.updated_at.isoformat() if getattr(reservation, "updated_at", None) else None,
    }


def serialize_message(message):
    sender = User.query.get(message.sender_id)
    receiver = User.query.get(message.receiver_id)
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_name": sender.username if sender else "",
        "receiver_id": message.receiver_id,
        "receiver_name": receiver.username if receiver else "",
        "content": message.content,
        "timestamp": message.timestamp.isoformat() if message.timestamp else None,
        "is_read": bool(getattr(message, "is_read", False)),
    }


def format_chat_time(value):
    if not value:
        return "--"

    today = datetime.utcnow().date()
    message_date = value.date()
    if message_date == today:
        return value.strftime("%H:%M")
    if message_date == today - timedelta(days=1):
        return "Hier"
    return value.strftime("%d/%m/%Y")


def build_avatar(name):
    parts = [part for part in str(name or "Client").strip().split() if part]
    if not parts:
        return "C"
    initials = "".join(part[0].upper() for part in parts[:2])
    return initials or "C"


def serialize_provider_chat_message(message, provider_id):
    return {
        "id": message.id,
        "author": "provider" if message.sender_id == provider_id else "client",
        "text": message.content,
        "time": format_chat_time(message.timestamp),
        "timestamp": message.timestamp.isoformat() if message.timestamp else None,
    }


def serialize_planner_item(item):
    return {
        "id": item.id,
        "client_id": item.client_id,
        "title": item.title,
        "completed": item.completed,
    }


def make_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_day_status_from_slots(slots):
    if not slots:
        return "free", "Libre"

    busy_count = sum(1 for slot in slots if slot["status"] in {"occupied", "reserved"})
    if busy_count == 0:
        return "free", "Libre"
    if busy_count == len(slots):
        return "occupied", "Complete"
    return "partial", "Partiellement occupee"


def serialize_calendar_day(day_date, slots):
    status, status_label = get_day_status_from_slots(slots)
    return {
        "id": day_date.isoformat(),
        "date": day_date.isoformat(),
        "day": day_date.day,
        "weekDay": FRENCH_WEEKDAYS[day_date.weekday()],
        "month": FRENCH_MONTHS[day_date.month],
        "status": status,
        "statusLabel": status_label,
        "slots": slots,
    }


def parse_reservation_datetime(value):
    raw = str(value or "").strip()
    if not raw:
        return None

    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    parsed_date = parse_date_value(raw)
    if parsed_date:
        return datetime.combine(parsed_date, time.min)
    return None


def allowed_image_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def is_local_upload_path(path):
    return str(path or "").replace("\\", "/").startswith("uploads/services/")


def delete_uploaded_file(app, relative_path):
    if not is_local_upload_path(relative_path):
        return

    absolute_path = os.path.join(app.root_path, relative_path.replace("/", os.sep))
    if os.path.isfile(absolute_path):
        os.remove(absolute_path)


def parse_date_value(value):
    if isinstance(value, date):
        return value

    raw = str(value or "").strip()
    if not raw:
        return None

    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_time_value(value):
    raw = str(value or "").strip()
    if not raw:
        return None

    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            continue
    return None


def plus_one_hour(time_label):
    start = parse_time_value(time_label)
    if not start:
        return time_label
    end_dt = datetime.combine(date.today(), start) + timedelta(hours=1)
    return end_dt.strftime("%H:%M")


def get_week_start(day_value):
    parsed_date = parse_date_value(day_value) or datetime.utcnow().date()
    return parsed_date - timedelta(days=parsed_date.weekday())


def build_week_label(start_date):
    end_date = start_date + timedelta(days=6)
    start_label = f"{start_date.day:02d} {FRENCH_MONTHS[start_date.month]}"
    end_label = f"{end_date.day:02d} {FRENCH_MONTHS[end_date.month]} {end_date.year}"
    return f"{start_label} - {end_label}"


def serialize_weekly_day(day_date, slots):
    status, status_label = get_day_status_from_slots(slots)
    return {
        "id": day_date.isoformat(),
        "date": day_date.isoformat(),
        "day": day_date.day,
        "weekDay": FRENCH_WEEKDAYS[day_date.weekday()],
        "month": FRENCH_MONTHS[day_date.month],
        "status": status,
        "statusLabel": status_label,
        "slots": slots,
    }


def ensure_user_schema():
    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []

    if "phone" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR(40) NULL")
    if "is_active" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
    if "city" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN city VARCHAR(120) NULL")
    if "category" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN category VARCHAR(120) NULL")
    if "instagram" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN instagram VARCHAR(160) NULL")
    if "website" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN website VARCHAR(255) NULL")
    if "description" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN description TEXT NULL")
    if "profile_photo" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN profile_photo TEXT NULL")
    if "cover_photo" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN cover_photo TEXT NULL")
    if "updated_at" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN updated_at DATETIME NULL")

    for statement in statements:
        db.session.execute(text(statement))

    if statements:
        db.session.commit()

    columns = {column["name"] for column in inspect(db.engine).get_columns("users")}
    if "is_active" in columns:
        db.session.execute(
            text(
                "UPDATE users "
                "SET is_active = COALESCE(is_active, 1)"
            )
        )
    if "updated_at" in columns:
        db.session.execute(
            text(
                "UPDATE users "
                "SET updated_at = COALESCE(updated_at, created_at, NOW()) "
                "WHERE updated_at IS NULL"
            )
        )
        db.session.commit()


def ensure_service_schema():
    inspector = inspect(db.engine)
    if "services" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("services")}
    statements = []

    if "provider_id" not in columns:
        statements.append("ALTER TABLE services ADD COLUMN provider_id INTEGER NULL")
    if "category" not in columns:
        statements.append("ALTER TABLE services ADD COLUMN category VARCHAR(120) NULL")
    if "image" not in columns:
        statements.append("ALTER TABLE services ADD COLUMN image TEXT NULL")
    if "status" not in columns:
        statements.append("ALTER TABLE services ADD COLUMN status VARCHAR(40) NULL")
    if "updated_at" not in columns:
        statements.append("ALTER TABLE services ADD COLUMN updated_at DATETIME NULL")

    for statement in statements:
        db.session.execute(text(statement))

    if statements:
        db.session.commit()

    refresh_needed = bool(statements)
    if refresh_needed:
        inspector = inspect(db.engine)
        columns = {column["name"] for column in inspector.get_columns("services")}

    if "prestataire_id" in columns and "provider_id" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET provider_id = prestataire_id "
                "WHERE provider_id IS NULL AND prestataire_id IS NOT NULL"
            )
        )
    if "provider_id" in columns and "prestataire_id" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET prestataire_id = provider_id "
                "WHERE prestataire_id IS NULL AND provider_id IS NOT NULL"
            )
        )
    if "type" in columns and "category" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET category = type "
                "WHERE (category IS NULL OR category = '') AND type IS NOT NULL"
            )
        )
    if "image_url" in columns and "image" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET image = image_url "
                "WHERE (image IS NULL OR image = '') AND image_url IS NOT NULL"
            )
        )
    if "status" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET status = 'Actif' "
                "WHERE status IS NULL OR status = ''"
            )
        )
    if "updated_at" in columns:
        db.session.execute(
            text(
                "UPDATE services "
                "SET updated_at = COALESCE(updated_at, created_at, NOW()) "
                "WHERE updated_at IS NULL"
            )
        )
    db.session.commit()


def ensure_reservation_schema():
    inspector = inspect(db.engine)
    if "reservations" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("reservations")}
    statements = []

    if "location" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN location VARCHAR(160) NULL")
    if "amount" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN amount FLOAT NULL")
    if "details" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN details TEXT NULL")
    if "updated_at" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN updated_at DATETIME NULL")

    for statement in statements:
        db.session.execute(text(statement))

    if statements:
        db.session.commit()

    columns = {column["name"] for column in inspect(db.engine).get_columns("reservations")}
    if "details" in columns and "notes" in columns:
        db.session.execute(
            text(
                "UPDATE reservations "
                "SET details = notes "
                "WHERE (details IS NULL OR details = '') AND notes IS NOT NULL"
            )
        )
    if "updated_at" in columns:
        db.session.execute(
            text(
                "UPDATE reservations "
                "SET updated_at = COALESCE(updated_at, created_at, NOW()) "
                "WHERE updated_at IS NULL"
            )
        )
    db.session.commit()


def ensure_message_schema():
    inspector = inspect(db.engine)
    if "messages" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("messages")}
    statements = []

    if "is_read" not in columns:
        statements.append("ALTER TABLE messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0")

    for statement in statements:
        db.session.execute(text(statement))

    if statements:
        db.session.commit()


def create_app():
    app = Flask(__name__)
    database_uri = build_database_uri()
    print(f"[DB] Using database URI: {database_uri}")
    ensure_mysql_database_exists(database_uri)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_SIZE
    app.config["UPLOAD_ROOT"] = os.path.join(app.root_path, "uploads")
    app.config["SERVICE_UPLOAD_FOLDER"] = os.path.join(app.config["UPLOAD_ROOT"], "services")
    app.config["PROFILE_UPLOAD_FOLDER"] = os.path.join(app.config["UPLOAD_ROOT"], "profile")
    app.config["COVER_UPLOAD_FOLDER"] = os.path.join(app.config["UPLOAD_ROOT"], "cover")

    os.makedirs(app.config["SERVICE_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["PROFILE_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["COVER_UPLOAD_FOLDER"], exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/login": {"origins": "*"}, r"/register": {"origins": "*"}})

    db.init_app(app)
    bcrypt.init_app(app)

    with app.app_context():
        db.create_all()
        ensure_user_schema()
        ensure_service_schema()
        ensure_reservation_schema()
        ensure_message_schema()
        seed_data()

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(_error):
        return jsonify({"success": False, "message": "Image trop volumineuse. Taille max: 2 MB."}), 413

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_ROOT"], filename)

    def save_service_image(image_file):
        filename = secure_filename(image_file.filename or "")
        if not filename:
            return None, "Nom de fichier invalide."
        if not allowed_image_file(filename):
            return None, "Format image invalide. Utilisez JPG, JPEG ou PNG."

        extension = filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid4().hex}.{extension}"
        absolute_path = os.path.join(app.config["SERVICE_UPLOAD_FOLDER"], unique_filename)
        image_file.save(absolute_path)
        return f"uploads/services/{unique_filename}", None

    def save_provider_profile_image(image_file, target_folder):
        filename = secure_filename(image_file.filename or "")
        if not filename:
            return None, "Nom de fichier invalide."
        if not allowed_image_file(filename):
            return None, "Format image invalide. Utilisez JPG, JPEG ou PNG."

        extension = filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid4().hex}.{extension}"
        folder_path = app.config[target_folder]
        absolute_path = os.path.join(folder_path, unique_filename)
        image_file.save(absolute_path)
        relative_dir = os.path.relpath(folder_path, app.root_path).replace("\\", "/")
        return f"{relative_dir}/{unique_filename}", None

    def validate_provider_profile_payload(payload, profile_photo=None, cover_photo=None):
        errors = {}

        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        phone = str(payload.get("phone") or "").strip()
        city = str(payload.get("city") or "").strip()
        category = str(payload.get("category") or "").strip()
        instagram = str(payload.get("instagram") or "").strip()
        website = str(payload.get("website") or "").strip()
        description = str(payload.get("description") or "").strip()

        if not name:
            errors["name"] = "Le nom est obligatoire."

        if not email:
            errors["email"] = "L'email est obligatoire."
        elif "@" not in email or "." not in email.split("@")[-1]:
            errors["email"] = "L'email est invalide."

        for field_name, image_file in {
            "profilePhoto": profile_photo,
            "coverPhoto": cover_photo,
        }.items():
            if image_file and not allowed_image_file(image_file.filename or ""):
                errors[field_name] = "Formats acceptes: jpg, jpeg, png."

        return errors, {
            "name": name,
            "email": email,
            "phone": phone,
            "city": city,
            "category": category,
            "instagram": instagram,
            "website": website,
            "description": description,
        }

    def validate_calendar_request(month_value, year_value):
        try:
            month_int = int(month_value)
            year_int = int(year_value)
        except (TypeError, ValueError):
            return None, None, (
                jsonify({"success": False, "message": "month et year doivent etre numeriques."}),
                400,
            )

        if month_int < 1 or month_int > 12:
            return None, None, (
                jsonify({"success": False, "message": "month doit etre compris entre 1 et 12."}),
                400,
            )

        if year_int < 2000 or year_int > 2100:
            return None, None, (
                jsonify({"success": False, "message": "year est invalide."}),
                400,
            )

        return month_int, year_int, None

    def generate_provider_slots_for_month(provider_id, year_value, month_value):
        days_in_month = monthrange(year_value, month_value)[1]
        month_start = date(year_value, month_value, 1)
        month_end = date(year_value, month_value, days_in_month)

        existing_slots = ProviderAvailabilitySlot.query.filter(
            ProviderAvailabilitySlot.provider_id == provider_id,
            ProviderAvailabilitySlot.date >= month_start,
            ProviderAvailabilitySlot.date <= month_end,
        ).all()
        existing_keys = {(slot.date.isoformat(), slot.start_time) for slot in existing_slots}

        slots_to_create = []
        for day_number in range(1, days_in_month + 1):
            slot_date = date(year_value, month_value, day_number)
            for slot_time in STANDARD_SLOT_TIMES:
                key = (slot_date.isoformat(), slot_time)
                if key in existing_keys:
                    continue
                slots_to_create.append(
                    ProviderAvailabilitySlot(
                        provider_id=provider_id,
                        date=slot_date,
                        start_time=slot_time,
                        end_time=plus_one_hour(slot_time),
                        status="free",
                    )
                )

        if slots_to_create:
            db.session.add_all(slots_to_create)
            db.session.commit()

    def sync_provider_reservations_for_month(provider_id, year_value, month_value):
        days_in_month = monthrange(year_value, month_value)[1]
        month_start = date(year_value, month_value, 1)
        month_end = date(year_value, month_value, days_in_month)

        slots = ProviderAvailabilitySlot.query.filter(
            ProviderAvailabilitySlot.provider_id == provider_id,
            ProviderAvailabilitySlot.date >= month_start,
            ProviderAvailabilitySlot.date <= month_end,
        ).all()

        slots_by_day = {}
        slots_by_day_time = {}
        for slot in slots:
            day_key = slot.date.isoformat()
            slots_by_day.setdefault(day_key, []).append(slot)
            slots_by_day_time[(day_key, slot.start_time)] = slot
            if slot.status == "reserved" or slot.reservation_id:
                slot.status = "free"
                slot.reservation_id = None
                slot.note = None

        services = Service.query.filter(
            db.or_(Service.provider_id == provider_id, Service.prestataire_id == provider_id)
        ).all()
        service_ids = [service.id for service in services]
        if not service_ids:
            db.session.commit()
            return

        reservations = Reservation.query.filter(Reservation.service_id.in_(service_ids)).all()
        services_by_id = {service.id: service for service in services}

        for reservation in reservations:
            if reservation.status in {"cancelled", "refused", "refusee"}:
                continue

            service = services_by_id.get(reservation.service_id)
            if not service:
                continue

            reservation_dt = parse_reservation_datetime(reservation.date)
            if not reservation_dt:
                continue
            reservation_date = reservation_dt.date()
            if reservation_date < month_start or reservation_date > month_end:
                continue

            client = User.query.get(reservation.client_id)
            slot_time_label = reservation_dt.strftime("%H:%M") if reservation_dt.time() != time.min else None
            slots_to_reserve = []
            day_key = reservation_date.isoformat()

            if slot_time_label:
                targeted_slot = slots_by_day_time.get((day_key, slot_time_label))
                if targeted_slot:
                    slots_to_reserve = [targeted_slot]
            if not slots_to_reserve:
                slots_to_reserve = slots_by_day.get(day_key, [])

            for slot in slots_to_reserve:
                slot.status = "reserved"
                slot.reservation_id = reservation.id
                slot.note = (
                    f"{client.username if client else 'Client'} | {service.title}"
                )

        db.session.commit()

    def build_provider_calendar_days(provider_id, year_value, month_value):
        generate_provider_slots_for_month(provider_id, year_value, month_value)
        sync_provider_reservations_for_month(provider_id, year_value, month_value)

        days_in_month = monthrange(year_value, month_value)[1]
        month_start = date(year_value, month_value, 1)
        month_end = date(year_value, month_value, days_in_month)
        services = Service.query.filter(
            db.or_(Service.provider_id == provider_id, Service.prestataire_id == provider_id)
        ).all()
        service_ids = [service.id for service in services]
        reservations_by_id = {
            reservation.id: reservation
            for reservation in (
                Reservation.query.filter(Reservation.service_id.in_(service_ids)).all() if service_ids else []
            )
        }
        services_by_id = {service.id: service for service in services}
        clients_by_id = {
            user.id: user
            for user in User.query.filter(
                User.id.in_([reservation.client_id for reservation in reservations_by_id.values()])
            ).all()
        } if reservations_by_id else {}

        slots = (
            ProviderAvailabilitySlot.query.filter(
                ProviderAvailabilitySlot.provider_id == provider_id,
                ProviderAvailabilitySlot.date >= month_start,
                ProviderAvailabilitySlot.date <= month_end,
            )
            .order_by(ProviderAvailabilitySlot.date.asc(), ProviderAvailabilitySlot.start_time.asc())
            .all()
        )

        grouped = {date(year_value, month_value, day_number): [] for day_number in range(1, days_in_month + 1)}
        for slot in slots:
            reservation = reservations_by_id.get(slot.reservation_id)
            service = services_by_id.get(reservation.service_id) if reservation else None
            client = clients_by_id.get(reservation.client_id) if reservation else None
            grouped.setdefault(slot.date, []).append(
                {
                    "id": slot.id,
                    "time": slot.start_time,
                    "status": slot.status,
                    "clientId": reservation.client_id if reservation else None,
                    "client": client.username if client else None,
                    "clientName": client.username if client else None,
                    "service": service.title if service else None,
                    "serviceTitle": service.title if service else None,
                    "reservationId": slot.reservation_id,
                }
            )

        return [serialize_calendar_day(day_date, grouped.get(day_date, [])) for day_date in grouped]

    def get_provider_slot_or_404(slot_id):
        slot = ProviderAvailabilitySlot.query.filter_by(id=slot_id, provider_id=request.user_id).first()
        if not slot:
            return None, (
                jsonify({"success": False, "message": "Creneau introuvable."}),
                404,
            )
        return slot, None

    def validate_service_payload(payload, image_file=None, existing_image=None):
        errors = {}

        title = str(payload.get("title") or "").strip()
        price_raw = payload.get("price")
        category = str(payload.get("category") or "").strip()
        description = str(payload.get("description") or "").strip()
        status = str(payload.get("status") or "Actif").strip() or "Actif"

        if not title:
            errors["title"] = "title est requis."

        if price_raw in (None, ""):
            errors["price"] = "price est requis."
            price = None
        else:
            try:
                price = float(price_raw)
                if price <= 0:
                    errors["price"] = "price doit etre superieur a 0."
            except (TypeError, ValueError):
                errors["price"] = "price doit etre numerique."
                price = None

        if not category:
            errors["category"] = "category est requis."

        if not image_file and not str(existing_image or "").strip():
            errors["image"] = "image est requis."
        elif image_file:
            filename = image_file.filename or ""
            if not filename or not allowed_image_file(filename):
                errors["image"] = "Formats acceptes: jpg, jpeg, png."

        if not description:
            errors["description"] = "description est requis."

        return errors, {
            "title": title,
            "price": price,
            "category": category,
            "description": description,
            "status": status,
        }

    def get_provider_service_or_404(service_id):
        service = Service.query.filter_by(id=service_id, provider_id=request.user_id).first()
        if not service:
            service = Service.query.filter_by(id=service_id, prestataire_id=request.user_id).first()
        if not service:
            return None, (
                jsonify(
                    {
                        "success": False,
                        "message": "Service introuvable ou non autorise.",
                    }
                ),
                404,
            )
        return service, None

    def get_provider_service_ids(provider_id):
        services = Service.query.filter(
            db.or_(Service.provider_id == provider_id, Service.prestataire_id == provider_id)
        ).all()
        return [service.id for service in services]

    def get_provider_client_contexts(provider_id):
        service_ids = get_provider_service_ids(provider_id)
        if not service_ids:
            return {}

        reservations = (
            Reservation.query.filter(Reservation.service_id.in_(service_ids))
            .order_by(Reservation.created_at.desc(), Reservation.id.desc())
            .all()
        )
        contexts = {}
        for reservation in reservations:
            service = Service.query.get(reservation.service_id)
            if not service or get_service_provider_id(service) != provider_id:
                continue

            current = contexts.get(reservation.client_id)
            if not current:
                contexts[reservation.client_id] = {
                    "client_id": reservation.client_id,
                    "subject": service.title if service else "Reservation mariage",
                    "reservation": reservation,
                }
                continue

            if reservation.created_at and current["reservation"].created_at:
                if reservation.created_at > current["reservation"].created_at:
                    current["subject"] = service.title if service else current["subject"]
                    current["reservation"] = reservation

        return contexts

    def get_provider_chat_context_or_error(chat_id):
        client = User.query.filter_by(id=chat_id, role="client").first()
        if not client:
            return None, None, (
                jsonify({"success": False, "message": "Conversation introuvable."}),
                404,
            )

        contexts = get_provider_client_contexts(request.user_id)
        context = contexts.get(chat_id)
        if not context:
            return None, None, (
                jsonify({"success": False, "message": "Conversation non autorisee."}),
                403,
            )

        return client, context, None

    def get_provider_chat_messages(provider_id, client_id):
        return (
            Message.query.filter(
                db.or_(
                    db.and_(Message.sender_id == provider_id, Message.receiver_id == client_id),
                    db.and_(Message.sender_id == client_id, Message.receiver_id == provider_id),
                )
            )
            .order_by(Message.timestamp.asc(), Message.id.asc())
            .all()
        )

    def serialize_provider_chat(client, context, provider_id):
        messages = get_provider_chat_messages(provider_id, client.id)
        last_message = messages[-1] if messages else None
        unread = sum(
            1
            for message in messages
            if message.sender_id == client.id
            and message.receiver_id == provider_id
            and not bool(getattr(message, "is_read", False))
        )

        excerpt = last_message.content if last_message else "Aucun message pour le moment."
        if len(excerpt) > 82:
            excerpt = f"{excerpt[:79]}..."

        fallback_time = context["reservation"].created_at if context.get("reservation") else None

        return {
            "id": client.id,
            "client": client.username,
            "avatar": build_avatar(client.username),
            "excerpt": excerpt,
            "time": format_chat_time(last_message.timestamp if last_message else fallback_time),
            "unread": unread,
            "subject": context.get("subject") or "Reservation mariage",
            "messages": [serialize_provider_chat_message(message, provider_id) for message in messages],
            "lastTimestamp": (
                last_message.timestamp.isoformat()
                if last_message and last_message.timestamp
                else fallback_time.isoformat()
                if fallback_time
                else None
            ),
        }

    def get_provider_booking_or_404(booking_id):
        reservation = Reservation.query.get(booking_id)
        if not reservation:
            return None, (
                jsonify({"success": False, "message": "Reservation introuvable."}),
                404,
            )

        service = Service.query.get(reservation.service_id)
        if not service or get_service_provider_id(service) != request.user_id:
            return None, (
                jsonify({"success": False, "message": "Acces non autorise."}),
                403,
            )

        return reservation, None

    def get_provider_week_reservations(provider_id, start_date, end_date):
        services = Service.query.filter(
            db.or_(Service.provider_id == provider_id, Service.prestataire_id == provider_id)
        ).all()
        if not services:
            return {}

        services_by_id = {service.id: service for service in services}
        reservations = Reservation.query.filter(Reservation.service_id.in_(list(services_by_id))).all()
        valid_reservations = {}
        client_ids = set()

        for reservation in reservations:
            if normalize_booking_status(reservation.status) != "Validee":
                continue
            reservation_dt = parse_reservation_datetime(reservation.date)
            if not reservation_dt:
                continue
            reservation_date = reservation_dt.date()
            if reservation_date < start_date or reservation_date > end_date:
                continue
            valid_reservations[reservation.id] = {
                "reservation": reservation,
                "service": services_by_id.get(reservation.service_id),
                "datetime": reservation_dt,
            }
            client_ids.add(reservation.client_id)

        clients_by_id = {
            client.id: client
            for client in User.query.filter(User.id.in_(client_ids)).all()
        } if client_ids else {}

        reservations_by_slot = {}
        for reservation_id, payload in valid_reservations.items():
            reservation_dt = payload["datetime"]
            slot_key = (reservation_dt.date().isoformat(), reservation_dt.strftime("%H:%M"))
            reservations_by_slot[slot_key] = {
                "reservationId": reservation_id,
                "clientId": payload["reservation"].client_id,
                "clientName": clients_by_id.get(payload["reservation"].client_id).username
                if clients_by_id.get(payload["reservation"].client_id)
                else None,
                "serviceTitle": payload["service"].title if payload["service"] else None,
            }

        return reservations_by_slot

    def build_provider_week_calendar(provider_id, start_date):
        end_date = start_date + timedelta(days=6)
        blocks = (
            ProviderCalendarBlock.query.filter(
                ProviderCalendarBlock.provider_id == provider_id,
                ProviderCalendarBlock.date >= start_date,
                ProviderCalendarBlock.date <= end_date,
                ProviderCalendarBlock.type == "occupied",
            )
            .order_by(ProviderCalendarBlock.date.asc(), ProviderCalendarBlock.start_time.asc())
            .all()
        )
        occupied_by_slot = {
            (block.date.isoformat(), block.start_time): block for block in blocks
        }
        reservations_by_slot = get_provider_week_reservations(provider_id, start_date, end_date)

        days = []
        for offset in range(7):
            current_date = start_date + timedelta(days=offset)
            slots = []
            for start_time_label in STANDARD_WORKING_HOURS:
                slot_key = (current_date.isoformat(), start_time_label)
                reservation_payload = reservations_by_slot.get(slot_key)
                occupied_block = occupied_by_slot.get(slot_key)

                status = "free"
                block_id = None
                reservation_id = None
                client_name = None
                service_title = None

                if reservation_payload:
                    status = "reserved"
                    reservation_id = reservation_payload["reservationId"]
                    client_name = reservation_payload["clientName"]
                    service_title = reservation_payload["serviceTitle"]
                elif occupied_block:
                    status = "occupied"
                    block_id = occupied_block.id

                slots.append(
                    {
                        "date": current_date.isoformat(),
                        "time": start_time_label,
                        "start_time": start_time_label,
                        "end_time": plus_one_hour(start_time_label),
                        "status": status,
                        "blockId": block_id,
                        "reservationId": reservation_id,
                        "clientName": client_name,
                        "serviceTitle": service_title,
                    }
                )

            days.append(serialize_weekly_day(current_date, slots))

        return {
            "weekLabel": build_week_label(start_date),
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "days": days,
        }

    def auth_required(allowed_roles=None):
        def decorator(view_func):
            @wraps(view_func)
            def wrapped(*args, **kwargs):
                auth_header = request.headers.get("Authorization", "")
                token = auth_header.replace("Bearer ", "").strip()
                if not token:
                    return jsonify({"success": False, "message": "Authentification requise."}), 401

                try:
                    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                except jwt.ExpiredSignatureError:
                    return jsonify({"success": False, "message": "Session expiree."}), 401
                except jwt.InvalidTokenError:
                    return jsonify({"success": False, "message": "Token invalide."}), 401

                request.user_id = int(payload["sub"])
                request.user_role = (payload["role"] or "").lower()

                if allowed_roles and request.user_role not in allowed_roles:
                    return jsonify({"success": False, "message": "Permission insuffisante."}), 403

                return view_func(*args, **kwargs)

            return wrapped

        return decorator

    @app.get("/")
    def root():
        return jsonify({"message": "3arrasli backend is running"})

    @app.get("/api/health")
    def health():
        engine_name = db.session.get_bind().dialect.name
        current_db_name = make_url(app.config["SQLALCHEMY_DATABASE_URI"]).database
        return jsonify(
            {
                "status": "ok",
                "database": engine_name,
                "database_name": current_db_name,
                "users_total": User.query.count(),
                "services_total": Service.query.count(),
            }
        )

    @app.post("/register")
    def register():
        payload = request.get_json(silent=True) or {}

        username = (payload.get("name") or payload.get("username") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        role = (payload.get("role") or "client").strip().lower()

        if not username or not email or not password:
            return jsonify({"success": False, "message": "Nom, email et mot de passe sont obligatoires."}), 400

        if role not in {"client", "prestataire", "admin"}:
            return jsonify({"success": False, "message": "Role invalide."}), 400

        if len(password) < 6:
            return jsonify({"success": False, "message": "Le mot de passe doit contenir au moins 6 caracteres."}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "Cet email est deja utilise."}), 409

        user = User(
            username=username,
            email=email,
            password=bcrypt.generate_password_hash(password).decode("utf-8"),
            role=role,
        )
        db.session.add(user)
        db.session.commit()

        if role == "client":
            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Compte client cree. Connectez-vous pour acceder a votre interface client.",
                        "user": serialize_user(user),
                    }
                ),
                201,
            )

        token = make_token(user.id, user.role)
        return jsonify({"success": True, "message": "Compte cree.", "token": token, "user": serialize_user(user)}), 201

    @app.post("/login")
    def login():
        payload = request.get_json(silent=True) or {}

        login_value = (payload.get("email") or payload.get("username") or "").strip()
        password = payload.get("password") or ""

        if not login_value or not password:
            return jsonify({"success": False, "message": "Email/nom et mot de passe requis."}), 400

        normalized_login = login_value.lower()
        user = User.query.filter(db.func.lower(User.email) == normalized_login).first()
        if not user:
            user = User.query.filter(db.func.lower(User.username) == normalized_login).first()
        if not user:
            return jsonify({"success": False, "message": "Utilisateur introuvable."}), 404

        if not bcrypt.check_password_hash(user.password, password):
            return jsonify({"success": False, "message": "Mot de passe incorrect."}), 401

        token = make_token(user.id, user.role)
        return jsonify({"success": True, "message": "Connexion reussie.", "token": token, "user": serialize_user(user)})

    @app.get("/api/admin/providers")
    @auth_required(allowed_roles={"admin"})
    def list_admin_providers():
        providers = (
            User.query.filter_by(role="prestataire")
            .order_by(User.created_at.desc(), User.id.desc())
            .all()
        )
        return jsonify(
            {
                "success": True,
                "providers": [serialize_admin_provider(provider) for provider in providers],
            }
        )

    @app.put("/api/admin/providers/<int:provider_id>")
    @app.patch("/api/admin/providers/<int:provider_id>")
    @auth_required(allowed_roles={"admin"})
    def update_admin_provider(provider_id):
        provider = User.query.filter_by(id=provider_id, role="prestataire").first()
        if not provider:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        category = (payload.get("category") or "").strip()
        city = (payload.get("city") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        phone = (payload.get("phone") or "").strip()
        description = (payload.get("description") or "").strip()
        instagram = (payload.get("instagram") or "").strip()
        website = (payload.get("website") or "").strip()
        status = str(payload.get("status") or "").strip().lower()

        if not name or not category or not city or not email:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Nom, categorie, ville et email sont obligatoires.",
                    }
                ),
                400,
            )

        if status and status not in {"active", "inactive"}:
            return jsonify({"success": False, "message": "Statut invalide."}), 400

        existing_user = User.query.filter(User.email == email, User.id != provider.id).first()
        if existing_user:
            return jsonify({"success": False, "message": "Cet email est deja utilise."}), 409

        provider.username = name
        provider.category = category
        provider.city = city
        provider.email = email
        provider.phone = phone or None
        provider.description = description or None
        provider.instagram = instagram or None
        provider.website = website or None
        if status:
            provider.is_active = status == "active"
        provider.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Prestataire mis a jour avec succes.",
                "provider": serialize_admin_provider(provider),
            }
        )

    @app.get("/api/provider/profile")
    @auth_required(allowed_roles={"prestataire"})
    def get_provider_profile():
        user = User.query.filter_by(id=request.user_id, role="prestataire").first()
        if not user:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        return jsonify(
            {
                "success": True,
                "message": "Profil recupere avec succes.",
                "user": serialize_user(user),
            }
        )

    @app.put("/api/provider/profile")
    @app.post("/api/provider/profile")
    @auth_required(allowed_roles={"prestataire"})
    def update_provider_profile():
        user = User.query.filter_by(id=request.user_id, role="prestataire").first()
        if not user:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        payload = request.form or {}
        profile_photo = request.files.get("profilePhoto")
        cover_photo = request.files.get("coverPhoto")
        errors, normalized = validate_provider_profile_payload(
            payload,
            profile_photo=profile_photo,
            cover_photo=cover_photo,
        )

        if User.query.filter(User.email == normalized["email"], User.id != request.user_id).first():
            errors["email"] = "Cet email est deja utilise."

        if errors:
            return jsonify({"success": False, "message": "Erreur de validation", "errors": errors}), 400

        previous_profile_photo = user.profile_photo
        previous_cover_photo = user.cover_photo

        if profile_photo:
            profile_photo_path, image_error = save_provider_profile_image(
                profile_photo,
                "PROFILE_UPLOAD_FOLDER",
            )
            if image_error:
                return jsonify({"success": False, "message": image_error, "errors": {"profilePhoto": image_error}}), 400
            user.profile_photo = profile_photo_path

        if cover_photo:
            cover_photo_path, image_error = save_provider_profile_image(
                cover_photo,
                "COVER_UPLOAD_FOLDER",
            )
            if image_error:
                return jsonify({"success": False, "message": image_error, "errors": {"coverPhoto": image_error}}), 400
            user.cover_photo = cover_photo_path

        user.username = normalized["name"]
        user.email = normalized["email"]
        user.phone = normalized["phone"]
        user.city = normalized["city"]
        user.category = normalized["category"]
        user.instagram = normalized["instagram"]
        user.website = normalized["website"]
        user.description = normalized["description"]
        user.updated_at = datetime.utcnow()

        db.session.commit()

        if profile_photo and previous_profile_photo and previous_profile_photo != user.profile_photo:
            delete_uploaded_file(app, previous_profile_photo)
        if cover_photo and previous_cover_photo and previous_cover_photo != user.cover_photo:
            delete_uploaded_file(app, previous_cover_photo)

        return jsonify(
            {
                "success": True,
                "message": "Profil mis a jour avec succes.",
                "user": serialize_user(user),
            }
        )

    @app.get("/api/provider/calendar/week")
    @auth_required(allowed_roles={"prestataire"})
    def get_provider_calendar_week():
        start_date = get_week_start(request.args.get("start"))
        payload = build_provider_week_calendar(request.user_id, start_date)
        return jsonify(
            {
                "success": True,
                "message": "Calendrier hebdomadaire recupere avec succes.",
                **payload,
            }
        )

    @app.post("/api/provider/calendar/week/occupy")
    @auth_required(allowed_roles={"prestataire"})
    def occupy_provider_calendar_week_slot():
        payload = request.get_json(silent=True) or {}
        slot_date = parse_date_value(payload.get("date"))
        start_time_label = str(payload.get("start_time") or "").strip()
        end_time_label = str(payload.get("end_time") or plus_one_hour(start_time_label)).strip()

        if not slot_date:
            return jsonify({"success": False, "message": "date est requis et doit etre valide."}), 400
        if not parse_time_value(start_time_label):
            return jsonify({"success": False, "message": "start_time est invalide."}), 400
        if not parse_time_value(end_time_label):
            return jsonify({"success": False, "message": "end_time est invalide."}), 400

        reservations_by_slot = get_provider_week_reservations(request.user_id, slot_date, slot_date)
        if (slot_date.isoformat(), start_time_label) in reservations_by_slot:
            return jsonify({"success": False, "message": "Ce creneau est deja reserve et ne peut pas etre bloque manuellement."}), 409

        existing_block = ProviderCalendarBlock.query.filter_by(
            provider_id=request.user_id,
            date=slot_date,
            start_time=start_time_label,
            type="occupied",
        ).first()
        if existing_block:
            return jsonify(
                {
                    "success": True,
                    "message": "Ce creneau est deja bloque.",
                    "block": {
                        "id": existing_block.id,
                        "date": existing_block.date.isoformat(),
                        "start_time": existing_block.start_time,
                        "end_time": existing_block.end_time,
                        "type": existing_block.type,
                    },
                }
            )

        block = ProviderCalendarBlock(
            provider_id=request.user_id,
            date=slot_date,
            start_time=start_time_label,
            end_time=end_time_label,
            type="occupied",
        )
        db.session.add(block)
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Creneau bloque avec succes.",
                "block": {
                    "id": block.id,
                    "date": block.date.isoformat(),
                    "start_time": block.start_time,
                    "end_time": block.end_time,
                    "type": block.type,
                },
            }
        ), 201

    @app.delete("/api/provider/calendar/blocks/<int:block_id>")
    @auth_required(allowed_roles={"prestataire"})
    def delete_provider_calendar_block(block_id):
        block = ProviderCalendarBlock.query.filter_by(
            id=block_id,
            provider_id=request.user_id,
            type="occupied",
        ).first()
        if not block:
            return jsonify({"success": False, "message": "Bloc calendrier introuvable."}), 404

        db.session.delete(block)
        db.session.commit()
        return jsonify({"success": True, "message": "Creneau libere avec succes."})

    @app.get("/api/provider/chats")
    @auth_required(allowed_roles={"prestataire"})
    def list_provider_chats():
        contexts = get_provider_client_contexts(request.user_id)
        if not contexts:
            return jsonify({"success": True, "chats": []})

        clients = User.query.filter(User.id.in_(list(contexts.keys())), User.role == "client").all()
        chats = [
            serialize_provider_chat(client, contexts[client.id], request.user_id)
            for client in clients
            if client.id in contexts
        ]
        chats.sort(key=lambda item: item.get("lastTimestamp") or "", reverse=True)

        return jsonify(
            {
                "success": True,
                "message": "Conversations recuperees avec succes.",
                "chats": chats,
            }
        )

    @app.get("/api/provider/chats/<int:chat_id>")
    @auth_required(allowed_roles={"prestataire"})
    def get_provider_chat(chat_id):
        client, context, error_response = get_provider_chat_context_or_error(chat_id)
        if error_response:
            return error_response

        return jsonify({"success": True, "chat": serialize_provider_chat(client, context, request.user_id)})

    @app.post("/api/provider/chats/<int:chat_id>/messages")
    @auth_required(allowed_roles={"prestataire"})
    def send_provider_chat_message(chat_id):
        client, context, error_response = get_provider_chat_context_or_error(chat_id)
        if error_response:
            return error_response

        payload = request.get_json(silent=True) or {}
        content = (payload.get("content") or "").strip()
        if not content:
            return jsonify({"success": False, "message": "Le message ne peut pas etre vide."}), 400

        message = Message(
            sender_id=request.user_id,
            receiver_id=client.id,
            content=content,
            is_read=False,
        )
        db.session.add(message)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Message envoye avec succes.",
                    "sentMessage": serialize_provider_chat_message(message, request.user_id),
                    "chat": serialize_provider_chat(client, context, request.user_id),
                }
            ),
            201,
        )

    @app.patch("/api/provider/chats/<int:chat_id>/read")
    @auth_required(allowed_roles={"prestataire"})
    def mark_provider_chat_read(chat_id):
        client, context, error_response = get_provider_chat_context_or_error(chat_id)
        if error_response:
            return error_response

        updated = (
            Message.query.filter_by(sender_id=client.id, receiver_id=request.user_id, is_read=False)
            .update({"is_read": True}, synchronize_session=False)
        )
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": "Conversation marquee comme lue.",
                "updated": updated,
                "chat": serialize_provider_chat(client, context, request.user_id),
            }
        )

    @app.get("/api/provider/bookings")
    @auth_required(allowed_roles={"prestataire"})
    def list_provider_bookings():
        service_ids = get_provider_service_ids(request.user_id)
        status_filter = str(request.args.get("status") or "").strip()

        if not service_ids:
            return jsonify(
                {
                    "success": True,
                    "message": "Aucune reservation pour le moment.",
                    "bookings": [],
                }
            )

        reservations = (
            Reservation.query.filter(Reservation.service_id.in_(service_ids))
            .order_by(Reservation.created_at.desc(), Reservation.id.desc())
            .all()
        )
        bookings = [serialize_provider_booking(item) for item in reservations]

        if status_filter and status_filter != "Tous":
            expected_status = normalize_booking_status(status_filter)
            bookings = [booking for booking in bookings if booking["status"] == expected_status]

        return jsonify(
            {
                "success": True,
                "message": "Reservations recuperees avec succes.",
                "bookings": bookings,
            }
        )

    @app.get("/api/provider/bookings/<int:booking_id>")
    @auth_required(allowed_roles={"prestataire"})
    def get_provider_booking(booking_id):
        reservation, error_response = get_provider_booking_or_404(booking_id)
        if error_response:
            return error_response

        return jsonify({"success": True, "booking": serialize_provider_booking(reservation)})

    @app.patch("/api/provider/bookings/<int:booking_id>/status")
    @auth_required(allowed_roles={"prestataire"})
    def update_provider_booking_status(booking_id):
        reservation, error_response = get_provider_booking_or_404(booking_id)
        if error_response:
            return error_response

        payload = request.get_json(silent=True) or {}
        next_status = normalize_booking_status(payload.get("status"))
        if next_status not in {"Validee", "Refusee"}:
            return jsonify(
                {
                    "success": False,
                    "message": "Statut invalide. Utilisez Validee ou Refusee.",
                }
            ), 400

        reservation.status = next_status
        reservation.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": "Statut de la reservation mis a jour avec succes.",
                "booking": serialize_provider_booking(reservation),
            }
        )

    @app.get("/api/services")
    @auth_required(allowed_roles={"client"})
    def list_services():
        city = (request.args.get("city") or "").strip().lower()
        min_price = request.args.get("min_price")
        max_price = request.args.get("max_price")
        service_type = (request.args.get("type") or "").strip().lower()

        query = Service.query
        if city:
            query = query.filter(db.func.lower(Service.city) == city)
        if service_type:
            query = query.filter(
                db.or_(
                    db.func.lower(Service.type).contains(service_type),
                    db.func.lower(Service.category).contains(service_type),
                )
            )
        if min_price:
            try:
                query = query.filter(Service.price >= float(min_price))
            except ValueError:
                return jsonify({"success": False, "message": "min_price doit etre numerique."}), 400
        if max_price:
            try:
                query = query.filter(Service.price <= float(max_price))
            except ValueError:
                return jsonify({"success": False, "message": "max_price doit etre numerique."}), 400

        services = query.order_by(Service.rating.desc(), Service.title.asc()).all()
        return jsonify({"success": True, "services": [serialize_service(item, request.user_id) for item in services]})

    @app.get("/api/provider/services")
    @auth_required(allowed_roles={"prestataire"})
    def list_provider_services():
        services = (
            Service.query.filter(
                db.or_(
                    Service.provider_id == request.user_id,
                    Service.prestataire_id == request.user_id,
                )
            )
            .order_by(Service.created_at.desc(), Service.id.desc())
            .all()
        )
        return jsonify(
            {
                "success": True,
                "message": "Services recuperes avec succes.",
                "services": [serialize_service(item) for item in services],
            }
        )

    @app.post("/api/provider/services")
    @auth_required(allowed_roles={"prestataire"})
    def create_provider_service():
        payload = request.form or {}
        image_file = request.files.get("image")
        errors, normalized = validate_service_payload(payload, image_file=image_file)

        if errors:
            return jsonify({"success": False, "message": "Validation echouee.", "errors": errors}), 400

        image_path, image_error = save_service_image(image_file)
        if image_error:
            return jsonify({"success": False, "message": image_error, "errors": {"image": image_error}}), 400

        service = Service(
            provider_id=request.user_id,
            prestataire_id=request.user_id,
            title=normalized["title"],
            price=normalized["price"],
            category=normalized["category"],
            type=normalized["category"],
            image=image_path,
            image_url=image_path,
            description=normalized["description"],
            status=normalized["status"],
            rating=4.5,
            city="",
        )
        db.session.add(service)
        db.session.commit()
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Service ajoute avec succes.",
                    "service": serialize_service(service),
                }
            ),
            201,
        )

    @app.put("/api/provider/services/<int:service_id>")
    @app.patch("/api/provider/services/<int:service_id>")
    @auth_required(allowed_roles={"prestataire"})
    def update_provider_service(service_id):
        service, error_response = get_provider_service_or_404(service_id)
        if error_response:
            return error_response

        payload = request.form or {}
        image_file = request.files.get("image")
        errors, normalized = validate_service_payload(
            payload,
            image_file=image_file,
            existing_image=service.image,
        )

        if errors:
            return jsonify({"success": False, "message": "Validation echouee.", "errors": errors}), 400

        image_path = service.image
        if image_file:
            image_path, image_error = save_service_image(image_file)
            if image_error:
                return jsonify({"success": False, "message": image_error, "errors": {"image": image_error}}), 400
            delete_uploaded_file(app, service.image)

        service.title = normalized["title"]
        service.price = normalized["price"]
        service.category = normalized["category"]
        service.type = normalized["category"]
        service.image = image_path
        service.image_url = image_path
        service.description = normalized["description"]
        service.status = normalized["status"]
        service.provider_id = request.user_id
        service.prestataire_id = request.user_id
        service.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Service mis a jour avec succes.",
                "service": serialize_service(service),
            }
        )

    @app.delete("/api/provider/services/<int:service_id>")
    @auth_required(allowed_roles={"prestataire"})
    def delete_provider_service(service_id):
        service, error_response = get_provider_service_or_404(service_id)
        if error_response:
            return error_response

        delete_uploaded_file(app, service.image)
        db.session.delete(service)
        db.session.commit()
        return jsonify({"success": True, "message": "Service supprime avec succes."})

    @app.get("/api/services/<int:service_id>")
    @auth_required(allowed_roles={"client"})
    def get_service(service_id):
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404
        return jsonify({"success": True, "service": serialize_service(service, request.user_id)})

    @app.post("/api/reservations")
    @auth_required(allowed_roles={"client"})
    def create_reservation():
        payload = request.get_json(silent=True) or {}
        service_id = payload.get("service_id")
        date_value = (payload.get("date") or "").strip()
        notes = (payload.get("notes") or "").strip() or None
        location = (payload.get("location") or "").strip() or None
        details = (payload.get("details") or notes or "").strip() or None
        amount = payload.get("amount")

        if not service_id or not date_value:
            return jsonify({"success": False, "message": "service_id et date sont requis."}), 400

        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        try:
            amount_value = float(amount) if amount not in (None, "") else service.price
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "amount doit etre numerique."}), 400

        reservation = Reservation(
            client_id=request.user_id,
            service_id=service_id,
            date=date_value,
            location=location or service.city,
            amount=amount_value,
            notes=notes,
            details=details,
            status="pending",
        )
        db.session.add(reservation)
        db.session.commit()
        return jsonify({"success": True, "reservation": serialize_reservation(reservation)}), 201

    @app.get("/api/reservations")
    @auth_required(allowed_roles={"client"})
    def list_reservations():
        reservations = (
            Reservation.query.filter_by(client_id=request.user_id)
            .order_by(Reservation.created_at.desc())
            .all()
        )
        return jsonify({"success": True, "reservations": [serialize_reservation(item) for item in reservations]})

    @app.get("/api/favorites")
    @auth_required(allowed_roles={"client"})
    def list_favorites():
        favorites = Favorite.query.filter_by(client_id=request.user_id).order_by(Favorite.created_at.desc()).all()
        services = (
            Service.query.filter(Service.prestataire_id.in_([item.prestataire_id for item in favorites]))
            .order_by(Service.rating.desc())
            .all()
            if favorites
            else []
        )
        return jsonify(
            {
                "success": True,
                "favorites": [
                    {
                        "favorite_id": item.id,
                        "prestataire_id": item.prestataire_id,
                        "prestataire_name": User.query.get(item.prestataire_id).username if User.query.get(item.prestataire_id) else "",
                    }
                    for item in favorites
                ],
                "services": [serialize_service(item, request.user_id) for item in services],
            }
        )

    @app.post("/api/favorites")
    @auth_required(allowed_roles={"client"})
    def add_favorite():
        payload = request.get_json(silent=True) or {}
        prestataire_id = payload.get("prestataire_id")

        if not prestataire_id:
            return jsonify({"success": False, "message": "prestataire_id est requis."}), 400

        prestataire = User.query.filter_by(id=prestataire_id, role="prestataire").first()
        if not prestataire:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        existing = Favorite.query.filter_by(client_id=request.user_id, prestataire_id=prestataire_id).first()
        if existing:
            return jsonify({"success": True, "message": "Deja en favoris.", "favorite": {"id": existing.id}})

        favorite = Favorite(client_id=request.user_id, prestataire_id=prestataire_id)
        db.session.add(favorite)
        db.session.commit()
        return jsonify({"success": True, "favorite": {"id": favorite.id}}), 201

    @app.delete("/api/favorites/<int:favorite_id>")
    @auth_required(allowed_roles={"client"})
    def remove_favorite(favorite_id):
        favorite = Favorite.query.filter_by(id=favorite_id, client_id=request.user_id).first()
        if not favorite:
            return jsonify({"success": False, "message": "Favori introuvable."}), 404
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({"success": True, "message": "Favori supprime."})

    @app.get("/api/chat")
    @auth_required(allowed_roles={"client"})
    def get_chat():
        with_user_id = request.args.get("with_user_id", type=int)
        query = Message.query.filter(
            db.or_(Message.sender_id == request.user_id, Message.receiver_id == request.user_id)
        )
        if with_user_id:
            query = query.filter(
                db.or_(
                    db.and_(Message.sender_id == request.user_id, Message.receiver_id == with_user_id),
                    db.and_(Message.sender_id == with_user_id, Message.receiver_id == request.user_id),
                )
            )
        messages = query.order_by(Message.timestamp.asc()).all()
        return jsonify({"success": True, "messages": [serialize_message(item) for item in messages]})

    @app.post("/api/chat/send")
    @auth_required(allowed_roles={"client"})
    def send_chat_message():
        payload = request.get_json(silent=True) or {}
        receiver_id = payload.get("receiver_id")
        content = (payload.get("content") or "").strip()

        if not receiver_id or not content:
            return jsonify({"success": False, "message": "receiver_id et content sont requis."}), 400

        receiver = User.query.filter_by(id=receiver_id, role="prestataire").first()
        if not receiver:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        message = Message(sender_id=request.user_id, receiver_id=receiver_id, content=content)
        db.session.add(message)
        db.session.commit()
        return jsonify({"success": True, "message": serialize_message(message)}), 201

    @app.get("/api/planner")
    @auth_required(allowed_roles={"client"})
    def get_planner():
        items = PlannerItem.query.filter_by(client_id=request.user_id).order_by(PlannerItem.id.desc()).all()
        return jsonify({"success": True, "items": [serialize_planner_item(item) for item in items]})

    @app.post("/api/planner")
    @auth_required(allowed_roles={"client"})
    def create_planner_item():
        payload = request.get_json(silent=True) or {}
        title = (payload.get("title") or "").strip()
        if not title:
            return jsonify({"success": False, "message": "title est requis."}), 400

        item = PlannerItem(client_id=request.user_id, title=title, completed=False)
        db.session.add(item)
        db.session.commit()
        return jsonify({"success": True, "item": serialize_planner_item(item)}), 201

    @app.put("/api/planner/<int:item_id>")
    @auth_required(allowed_roles={"client"})
    def update_planner_item(item_id):
        item = PlannerItem.query.filter_by(id=item_id, client_id=request.user_id).first()
        if not item:
            return jsonify({"success": False, "message": "Element introuvable."}), 404

        payload = request.get_json(silent=True) or {}
        if "title" in payload and str(payload["title"]).strip():
            item.title = str(payload["title"]).strip()
        if "completed" in payload:
            item.completed = bool(payload["completed"])

        db.session.commit()
        return jsonify({"success": True, "item": serialize_planner_item(item)})

    @app.post("/api/payment")
    @auth_required(allowed_roles={"client"})
    def payment():
        payload = request.get_json(silent=True) or {}
        reservation_id = payload.get("reservation_id")
        if not reservation_id:
            return jsonify({"success": False, "message": "reservation_id est requis."}), 400

        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        reservation.status = "paid"
        reservation.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "reservation": serialize_reservation(reservation), "message": "Paiement simule avec succes."})

    return app


def seed_data():
    if not User.query.filter_by(email=DEFAULT_ADMIN["email"]).first():
        db.session.add(
            User(
                username=DEFAULT_ADMIN["username"],
                email=DEFAULT_ADMIN["email"],
                password=bcrypt.generate_password_hash(DEFAULT_ADMIN["password"]).decode("utf-8"),
                role=DEFAULT_ADMIN["role"],
            )
        )

    for provider in DEFAULT_PRESTATAIRES:
        if not User.query.filter_by(email=provider["email"]).first():
            db.session.add(
                User(
                    username=provider["username"],
                    email=provider["email"],
                    password=bcrypt.generate_password_hash(provider["password"]).decode("utf-8"),
                    role=provider["role"],
                )
            )

    if not User.query.filter_by(email=DEFAULT_CLIENT["email"]).first():
        db.session.add(
            User(
                username=DEFAULT_CLIENT["username"],
                email=DEFAULT_CLIENT["email"],
                password=bcrypt.generate_password_hash(DEFAULT_CLIENT["password"]).decode("utf-8"),
                role=DEFAULT_CLIENT["role"],
            )
        )

    db.session.commit()

    studio = User.query.filter_by(email="studio@3arrasli.com").first()
    palais = User.query.filter_by(email="palais@3arrasli.com").first()
    client = User.query.filter_by(email=DEFAULT_CLIENT["email"]).first()

    if studio:
        studio.phone = studio.phone or "+216 55 123 456"
        studio.city = studio.city or "Tunis"
        studio.category = studio.category or "Photographe"
        studio.instagram = studio.instagram or "@studio.lumiere.weddings"
        studio.website = studio.website or "www.studiolumiere.tn"
        studio.description = studio.description or (
            "Prestataire mariage premium specialise dans les reportages editoriaux, "
            "les portraits lumineux et les histoires visuelles elegantes."
        )
        studio.profile_photo = studio.profile_photo or (
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=90"
        )
        studio.cover_photo = studio.cover_photo or (
            "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=90"
        )

    if palais:
        palais.phone = palais.phone or "+216 73 900 320"
        palais.city = palais.city or "Sousse"
        palais.category = palais.category or "Salle"
        palais.instagram = palais.instagram or "@palais.jasmine.events"
        palais.website = palais.website or "www.palaisjasmine.tn"
        palais.description = palais.description or (
            "Lieu de reception raffine pour mariages, ceremonies et experiences haut de gamme."
        )
        palais.profile_photo = palais.profile_photo or (
            "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=90"
        )
        palais.cover_photo = palais.cover_photo or (
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=90"
        )

    if studio and Service.query.count() == 0:
        db.session.add_all(
            [
                Service(
                    provider_id=studio.id,
                    title="Studio Lumiere - Photographe",
                    description="Couverture photo premium du mariage.",
                    price=1200,
                    city="Tunis",
                    category="Photographe",
                    type="photographer",
                    image="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=90",
                    rating=4.9,
                    image_url="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=90",
                    status="Actif",
                    prestataire_id=studio.id,
                ),
                Service(
                    provider_id=studio.id,
                    title="Saveurs Royales - Traiteur",
                    description="Menu sur mesure pour evenements mariage.",
                    price=1800,
                    city="Tunis",
                    category="Traiteur",
                    type="traiteur",
                    image="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=90",
                    rating=4.7,
                    image_url="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=90",
                    status="Actif",
                    prestataire_id=studio.id,
                ),
            ]
        )

    if palais and Service.query.filter_by(prestataire_id=palais.id).count() == 0:
        db.session.add(
            Service(
                provider_id=palais.id,
                title="Palais Jasmine - Salle de fete",
                description="Salle elegante pour ceremonies et receptions.",
                price=3500,
                city="Sousse",
                category="Salle",
                type="salle",
                image="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=90",
                rating=4.8,
                image_url="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=90",
                status="Actif",
                prestataire_id=palais.id,
            )
        )

    db.session.commit()

    if client and Reservation.query.count() == 0:
        studio_service = Service.query.filter(
            db.or_(Service.provider_id == (studio.id if studio else None), Service.prestataire_id == (studio.id if studio else None))
        ).first()
        palais_service = Service.query.filter(
            db.or_(Service.provider_id == (palais.id if palais else None), Service.prestataire_id == (palais.id if palais else None))
        ).first()

        reservations_to_add = []
        if studio_service:
            reservations_to_add.append(
                Reservation(
                    client_id=client.id,
                    service_id=studio_service.id,
                    date=f"{datetime.utcnow().date().replace(day=12).isoformat()} 10:00",
                    location=studio_service.city or "Tunis",
                    amount=studio_service.price,
                    notes="Reservation de demonstration pour le calendrier prestataire.",
                    details="Reservation de demonstration pour le calendrier prestataire.",
                    status="paid",
                )
            )
        if palais_service:
            reservations_to_add.append(
                Reservation(
                    client_id=client.id,
                    service_id=palais_service.id,
                    date=f"{datetime.utcnow().date().replace(day=18).isoformat()} 15:00",
                    location=palais_service.city or "Sousse",
                    amount=palais_service.price,
                    notes="Reservation de demonstration pour le calendrier prestataire.",
                    details="Reservation de demonstration pour le calendrier prestataire.",
                    status="pending",
                )
            )
        if reservations_to_add:
            db.session.add_all(reservations_to_add)
            db.session.commit()

    if studio and ProviderCalendarBlock.query.count() == 0:
        next_week_start = get_week_start(datetime.utcnow().date()) + timedelta(days=7)
        db.session.add(
            ProviderCalendarBlock(
                provider_id=studio.id,
                date=next_week_start + timedelta(days=1),
                start_time="14:00",
                end_time="15:00",
                type="occupied",
            )
        )
        db.session.commit()


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
