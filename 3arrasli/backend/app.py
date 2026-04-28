from calendar import monthrange
from datetime import date, datetime, time, timedelta
from email.message import EmailMessage
from functools import wraps
import json
import os
import smtplib
from pathlib import Path
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from uuid import uuid4

import jwt
import pymysql
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import ConnectionRefusedError, disconnect, emit, join_room
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlalchemy import inspect, or_, text
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from extensions import bcrypt, db, socketio
from models import Appointment, Favorite, Message, Notification, PlannerItem, ProviderAvailabilitySlot, ProviderCalendarBlock, Reservation, Review, Service, ServiceImage, User


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")


JWT_SECRET = (os.getenv("JWT_SECRET") or "").strip()
if not JWT_SECRET:
    JWT_SECRET = "dev-only-change-me"
    print("WARNING: JWT_SECRET is not set. Using insecure development fallback.")
JWT_ALGORITHM = (os.getenv("JWT_ALGORITHM") or "HS256").strip()
JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "12") or 12)

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
DEFAULT_ADVANCE_RATIO = 0.5


def get_frontend_base_url():
    return (os.getenv("FRONTEND_BASE_URL") or "http://localhost:5173").rstrip("/")


def get_stripe_secret_key():
    return (os.getenv("STRIPE_SECRET_KEY") or "").strip()


def get_stripe_publishable_key():
    return (os.getenv("STRIPE_PUBLISHABLE_KEY") or "").strip()


def is_stripe_configured():
    return bool(get_stripe_secret_key() and get_stripe_publishable_key())


def get_stripe_currency():
    return (os.getenv("STRIPE_CURRENCY") or "eur").strip().lower()


def format_currency(amount):
    value = float(amount or 0)
    return f"{value:.2f} TND"


def amount_to_minor_units(amount):
    return max(int(round(float(amount or 0) * 100)), 0)


def build_storage_relative_path(folder, filename):
    return f"uploads/{folder}/{filename}"


def resolve_document_url(path):
    value = str(path or "").strip()
    if not value:
        return None
    return f"/{value.lstrip('/')}"


def escape_pdf_text(value):
    return str(value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_simple_pdf(file_path, title, lines):
    text_lines = [str(title or "").strip()] + [str(line or "").strip() for line in lines if str(line or "").strip()]
    stream_parts = ["BT", "/F1 18 Tf", "50 780 Td"]
    first_line = True
    for line in text_lines:
        if not first_line:
            stream_parts.append("0 -24 Td")
        stream_parts.append(f"({escape_pdf_text(line)}) Tj")
        first_line = False
    stream_parts.append("ET")
    stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        f"5 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n",
    ]

    content = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(content))
        content.extend(obj)

    xref_offset = len(content)
    content.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    content.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        content.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    content.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )

    with open(file_path, "wb") as pdf_file:
        pdf_file.write(content)


def write_invoice_pdf(file_path, invoice_data):
    reservation_id = invoice_data.get("reservation_id")
    reservation_date = str(invoice_data.get("reservation_date") or "--")
    created_at = str(invoice_data.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M"))
    client_name = str(invoice_data.get("client_name") or "Client")
    provider_name = str(invoice_data.get("provider_name") or "Prestataire")
    service_name = str(invoice_data.get("service_name") or "Service mariage")
    location = str(invoice_data.get("location") or "Tunisie")
    payment_status = str(invoice_data.get("payment_status") or "UNPAID")
    total_amount_value = float(invoice_data.get("total_amount") or 0)
    paid_amount_value = float(invoice_data.get("paid_amount") or 0)
    remaining_amount_value = max(total_amount_value - paid_amount_value, 0)
    total_amount_label = format_currency(total_amount_value)
    paid_amount_label = format_currency(paid_amount_value)
    remaining_amount_label = format_currency(remaining_amount_value)

    stream_parts = []

    def add(command):
        stream_parts.append(command)

    def text(x, y, value, size=11):
        add("BT")
        add(f"/F1 {size} Tf")
        add(f"1 0 0 1 {x} {y} Tm")
        add(f"({escape_pdf_text(value)}) Tj")
        add("ET")

    # Background header strip
    add("0.12 0.20 0.33 rg")
    add("0.12 0.20 0.33 RG")
    add("40 760 515 52 re f")

    # Header title and metadata
    add("1 1 1 rg")
    text(52, 790, "3ARRASLI", 18)
    text(52, 772, "FACTURE OFFICIELLE", 11)
    text(420, 790, f"Facture N° {reservation_id}", 10)
    text(420, 774, f"Date: {created_at}", 10)

    # Section labels
    add("0.12 0.20 0.33 rg")
    text(52, 735, "Facture de", 10)
    text(300, 735, "Emise par", 10)

    # Information blocks
    add("0.95 0.96 0.98 rg")
    add("0.85 0.88 0.92 RG")
    add("40 656 250 74 re B")
    add("295 656 260 74 re B")
    add("0 0 0 rg")
    text(52, 710, f"Client: {client_name}", 11)
    text(52, 692, f"Date reservation: {reservation_date}", 10)
    text(52, 676, f"Lieu: {location}", 10)

    text(307, 710, f"Prestataire: {provider_name}", 11)
    text(307, 692, "Plateforme: 3arrasli", 10)
    text(307, 676, "Email: contact@3arrasli.tn", 10)

    # Services table
    add("0.12 0.20 0.33 rg")
    add("0.12 0.20 0.33 RG")
    add("40 620 515 26 re f")
    add("1 1 1 rg")
    text(52, 628, "Description", 10)
    text(392, 628, "Montant", 10)

    add("1 1 1 rg")
    add("0.78 0.80 0.84 RG")
    add("40 566 515 54 re B")
    add("0 0 0 rg")
    text(52, 596, service_name, 11)
    text(52, 578, f"Reservation #{reservation_id} - Paiement {payment_status}", 9)
    text(392, 588, total_amount_label, 12)

    # Totals block
    add("0.93 0.95 0.98 rg")
    add("0.80 0.83 0.88 RG")
    add("300 484 255 76 re B")
    add("0 0 0 rg")
    text(314, 542, "Montant total:", 10)
    text(470, 542, total_amount_label, 10)
    text(314, 526, "Somme payee:", 10)
    text(470, 526, paid_amount_label, 10)
    add("0.12 0.20 0.33 rg")
    text(314, 504, "Reste a payer:", 12)
    text(450, 504, remaining_amount_label, 12)

    # Footer note
    add("0 0 0 rg")
    text(40, 470, "Merci pour votre confiance. Cette facture est generee automatiquement par 3arrasli.", 9)
    text(40, 454, "Statut de paiement:", 9)
    add("0.08 0.45 0.20 rg" if payment_status == "PAID" else "0.65 0.12 0.12 rg")
    text(138, 454, payment_status, 9)

    stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        f"5 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n",
    ]

    content = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(content))
        content.extend(obj)

    xref_offset = len(content)
    content.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    content.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        content.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    content.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )

    with open(file_path, "wb") as pdf_file:
        pdf_file.write(content)


def write_contract_pdf(file_path, contract_data):
    reservation_id = contract_data.get("reservation_id")
    created_at = str(contract_data.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d %H:%M"))
    reservation_date = str(contract_data.get("reservation_date") or "--")
    client_name = str(contract_data.get("client_name") or "Client")
    provider_name = str(contract_data.get("provider_name") or "Prestataire")
    service_name = str(contract_data.get("service_name") or "Service mariage")
    location = str(contract_data.get("location") or "Tunisie")
    total_amount = format_currency(contract_data.get("total_amount") or 0)
    paid_amount = format_currency(contract_data.get("paid_amount") or 0)
    remaining_amount = format_currency(contract_data.get("remaining_amount") or 0)
    signed_at = str(contract_data.get("signed_at") or "")
    has_client_signature = bool(contract_data.get("has_client_signature"))

    stream_parts = []

    def add(command):
        stream_parts.append(command)

    def text(x, y, value, size=10):
        add("BT")
        add(f"/F1 {size} Tf")
        add(f"1 0 0 1 {x} {y} Tm")
        add(f"({escape_pdf_text(value)}) Tj")
        add("ET")

    add("0.17 0.22 0.32 rg")
    add("40 776 515 38 re f")
    add("1 1 1 rg")
    text(52, 792, "CONTRAT DE PRESTATION - 3ARRASLI", 12)
    text(400, 792, f"N° {reservation_id}", 10)

    add("0 0 0 rg")
    text(52, 758, f"Date d'emission: {created_at}", 9)
    text(300, 758, f"Date de reservation: {reservation_date}", 9)

    add("0.95 0.96 0.98 rg")
    add("0.84 0.86 0.90 RG")
    add("40 700 250 48 re B")
    add("295 700 260 48 re B")
    add("0 0 0 rg")
    text(52, 730, "Partie Cliente", 10)
    text(52, 714, client_name, 10)
    text(307, 730, "Prestataire", 10)
    text(307, 714, provider_name, 10)

    text(52, 680, "Objet du contrat:", 10)
    text(150, 680, service_name, 10)
    text(52, 662, "Lieu de prestation:", 10)
    text(150, 662, location, 10)

    add("0.92 0.94 0.98 rg")
    add("0.80 0.82 0.88 RG")
    add("40 610 515 40 re B")
    add("0 0 0 rg")
    text(52, 634, f"Montant total: {total_amount}", 10)
    text(230, 634, f"Somme payee: {paid_amount}", 10)
    text(405, 634, f"Reste: {remaining_amount}", 10)

    text(52, 588, "Clause 1 - Le prestataire s'engage a executer la prestation convenue selon la reservation validee.", 9)
    text(52, 572, "Clause 2 - Le client confirme l'exactitude des informations et accepte les conditions de la prestation.", 9)
    text(52, 556, "Clause 3 - En cas d'annulation, les montants deja verses suivent les conditions definies par la plateforme.", 9)
    text(52, 540, "Clause 4 - Le contrat prend effet a la date de signature electronique du client.", 9)

    # Signature zones
    add("0.98 0.98 0.99 rg")
    add("0.80 0.82 0.88 RG")
    add("40 410 240 110 re B")
    add("315 410 240 110 re B")
    add("0 0 0 rg")
    text(52, 500, "Signature Client", 10)
    text(327, 500, "Signature Prestataire", 10)

    if has_client_signature:
        text(52, 474, "Signe electroniquement via espace client", 9)
        text(52, 458, f"Date de signature: {signed_at}", 9)
        text(52, 438, "Statut: VALIDE", 10)
    else:
        text(52, 462, "En attente de signature client", 9)
        text(52, 438, "Statut: NON SIGNE", 10)

    text(327, 462, "Zone reservee au prestataire", 9)
    text(327, 438, "Statut: EN ATTENTE", 10)

    text(40, 388, "Ce document est genere automatiquement par 3arrasli et conserve une trace de signature numerique.", 8)

    stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        f"5 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n",
    ]

    content = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(content))
        content.extend(obj)

    xref_offset = len(content)
    content.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    content.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        content.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    content.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("ascii")
    )

    with open(file_path, "wb") as pdf_file:
        pdf_file.write(content)


def stripe_api_request(method, path, form_data=None):
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise RuntimeError("Stripe n'est pas configure.")

    encoded = None
    if form_data is not None:
        encoded = urllib_parse.urlencode(form_data, doseq=True).encode("utf-8")

    request_obj = urllib_request.Request(
        f"https://api.stripe.com{path}",
        data=encoded,
        method=method.upper(),
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib_request.urlopen(request_obj, timeout=25) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(payload)
            message = parsed.get("error", {}).get("message") or "Erreur Stripe."
        except json.JSONDecodeError:
            message = payload or "Erreur Stripe."
        raise RuntimeError(message) from exc


def normalize_payment_status(status):
    value = str(status or "").strip().upper()
    if value in {"PAID", "UNPAID", "PENDING"}:
        return value
    if value in {"PAID_FULL", "CONFIRMED"}:
        return "PAID"
    return "UNPAID"


def serialize_review(review):
    client = User.query.get(review.client_id)
    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment or "",
        "client_id": review.client_id,
        "client_name": client.username if client else "Client",
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


def get_service_rating_summary(service_id):
    reviews = Review.query.filter_by(service_id=service_id).order_by(Review.created_at.desc()).all()
    review_count = len(reviews)
    average_rating = round(sum(review.rating for review in reviews) / review_count, 1) if review_count else 0
    return {
        "average": average_rating,
        "count": review_count,
        "reviews": reviews,
    }


def update_service_rating(service):
    summary = get_service_rating_summary(service.id)
    service.rating = summary["average"] or service.rating or 0
    db.session.commit()
    return summary


def send_provider_approval_email(recipient_email, provider_name):
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587") or 587)
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_sender = os.getenv("SMTP_SENDER", smtp_user or "").strip()
    use_tls = str(os.getenv("SMTP_USE_TLS", "true")).strip().lower() != "false"
    use_ssl = str(os.getenv("SMTP_USE_SSL", "false")).strip().lower() == "true"

    if not smtp_host or not smtp_sender:
        return False, "Configuration SMTP manquante. Definissez SMTP_HOST et SMTP_SENDER."

    login_url = f"{get_frontend_base_url()}/login"
    message = EmailMessage()
    message["Subject"] = "Votre compte prestataire 3arrasli a ete approuve"
    message["From"] = smtp_sender
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                f"Bonjour {provider_name},",
                "",
                "Votre compte prestataire 3arrasli a ete approuve par l'administrateur.",
                f"Email de connexion : {recipient_email}",
                "Mot de passe : utilisez le mot de passe que vous avez choisi lors de l'inscription.",
                f"Vous pouvez maintenant vous connecter ici : {login_url}",
                "",
                "Merci,",
                "L'equipe 3arrasli",
            ]
        )
    )
    message.add_alternative(
        "\n".join(
            [
                "<html><body>",
                f"<p>Bonjour {provider_name},</p>",
                "<p>Votre compte prestataire 3arrasli a ete approuve par l'administrateur.</p>",
                f"<p><strong>Email de connexion :</strong> {recipient_email}</p>",
                "<p><strong>Mot de passe :</strong> utilisez le mot de passe choisi lors de l'inscription.</p>",
                f"<p><a href=\"{login_url}\">Acceder a la page de connexion</a></p>",
                "<p>Merci,<br/>L'equipe 3arrasli</p>",
                "</body></html>",
            ]
        ),
        subtype="html",
    )

    try:
        smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_class(smtp_host, smtp_port, timeout=20) as server:
            if not use_ssl and use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(message)
        return True, None
    except Exception as exc:
        return False, str(exc)


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
        "approval_status": str(getattr(user, "approval_status", "approved") or "approved"),
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
        "profilePhoto": user.profile_photo,
        "coverPhoto": user.cover_photo,
        "rating": average_rating,
        "status": (
            "pending-approval"
            if str(getattr(user, "approval_status", "approved") or "approved") == "pending"
            else ("active" if bool(getattr(user, "is_active", True)) else "inactive")
        ),
        "joinedAt": user.created_at.date().isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
    }


def serialize_service(service, client_id=None):
    provider_id = service.provider_id or service.prestataire_id
    favorite = None
    if client_id:
        favorite = Favorite.query.filter_by(user_id=client_id, service_id=service.id).first()

    prestataire = User.query.get(provider_id) if provider_id else None
    rating_summary = get_service_rating_summary(service.id)
    gallery = [
        {"id": item.id, "image_path": item.image_path, "url": item.image_path}
        for item in getattr(service, "images", [])
    ]
    if not gallery and (service.image or service.image_url):
        gallery = [{"id": None, "image_path": service.image or service.image_url, "url": service.image or service.image_url}]
    primary_image = gallery[0]["image_path"] if gallery else (service.image or service.image_url)
    return {
        "id": service.id,
        "title": service.title,
        "description": service.description,
        "price": service.price,
        "city": service.city,
        "type": service.category or service.type,
        "category": service.category or service.type,
        "image": primary_image,
        "images": gallery,
        "rating": service.rating,
        "status": service.status or "Actif",
        "provider_id": provider_id,
        "prestataire_id": provider_id,
        "prestataire_name": prestataire.username if prestataire else "Prestataire",
        "provider_name": prestataire.username if prestataire else "Prestataire",
        "provider_description": prestataire.description if prestataire else "",
        "provider_image": prestataire.profile_photo if prestataire else None,
        "provider_cover": prestataire.cover_photo if prestataire else None,
        "provider_category": prestataire.category if prestataire else (service.category or service.type),
        "provider_city": prestataire.city if prestataire else service.city,
        "review_count": rating_summary["count"],
        "is_favorite": bool(favorite),
        "favorite_id": favorite.id if favorite else None,
        "created_at": service.created_at.isoformat() if service.created_at else None,
        "updated_at": service.updated_at.isoformat() if getattr(service, "updated_at", None) else None,
    }


def serialize_reservation(reservation):
    service = Service.query.get(reservation.service_id)
    provider = User.query.get(get_service_provider_id(service)) if service else None
    return {
        "id": reservation.id,
        "client_id": reservation.client_id,
        "service_id": reservation.service_id,
        "service_title": service.title if service else "",
        "provider_name": provider.username if provider else "Prestataire",
        "date": reservation.date,
        "location": reservation.location,
        "amount": reservation.amount if reservation.amount is not None else (service.price if service else 0),
        "notes": reservation.notes,
        "details": reservation.details,
        "payment_status": normalize_payment_status(getattr(reservation, "payment_status", None)),
        "payment_option": getattr(reservation, "payment_option", None) or "full",
        "invoice_url": resolve_document_url(getattr(reservation, "invoice_path", None)),
        "contract_url": resolve_document_url(getattr(reservation, "contract_path", None)),
        "signed_at": reservation.signed_at.isoformat() if getattr(reservation, "signed_at", None) else None,
        "has_signature": bool(getattr(reservation, "signature_data", None)),
        "created_at": reservation.created_at.isoformat() if reservation.created_at else None,
        "updated_at": reservation.updated_at.isoformat() if getattr(reservation, "updated_at", None) else None,
    }


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
    total_amount = amount if amount is not None else (service.price if service else 0)
    paid_amount = total_amount if normalize_payment_status(getattr(reservation, "payment_status", None)) == "PAID" else 0
    remaining_amount = max(float(total_amount or 0) - float(paid_amount or 0), 0)
    provider_id = get_service_provider_id(service)
    slot_date = parse_date_value(booking_date)
    calendar_slot_locked = False
    calendar_block_id = None

    if provider_id and slot_date and booking_time:
        block = ProviderCalendarBlock.query.filter_by(
            provider_id=provider_id,
            date=slot_date,
            start_time=booking_time,
            type="reserved",
            reservation_id=reservation.id,
        ).first()
        calendar_slot_locked = block is not None
        calendar_block_id = block.id if block else None

    return {
        "id": reservation.id,
        "clientId": reservation.client_id,
        "client": client.username if client else "Client",
        "serviceId": reservation.service_id,
        "service": service.title if service else "Service",
        "date": booking_date,
        "time": booking_time,
        "location": getattr(reservation, "location", None) or (service.city if service else "") or "--",
        "amount": total_amount,
        "totalAmount": total_amount,
        "paidAmount": paid_amount,
        "remainingAmount": remaining_amount,
        "paymentStatus": normalize_payment_status(getattr(reservation, "payment_status", None)),
        "notes": reservation.notes or "",
        "details": details,
        "invoiceUrl": resolve_document_url(getattr(reservation, "invoice_path", None)),
        "contractUrl": resolve_document_url(getattr(reservation, "contract_path", None)),
        "calendarSlotLocked": calendar_slot_locked,
        "calendarBlockId": calendar_block_id,
        "calendarMessage": (
            "Cette reservation est liee a un creneau calendrier et ne peut pas etre validee ou refusee manuellement."
            if calendar_slot_locked
            else ""
        ),
        "createdAt": reservation.created_at.isoformat() if reservation.created_at else None,
        "updatedAt": reservation.updated_at.isoformat() if getattr(reservation, "updated_at", None) else None,
    }


def serialize_notification(notification):
    reservation = Reservation.query.get(notification.reservation_id) if notification.reservation_id else None
    appointment = Appointment.query.get(notification.appointment_id) if getattr(notification, "appointment_id", None) else None
    booking_date, booking_time = split_booking_datetime(reservation.date) if reservation else (None, None)
    appointment_date = appointment.date.isoformat() if appointment else None
    return {
        "id": notification.id,
        "userId": notification.user_id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "reservationId": notification.reservation_id,
        "appointmentId": getattr(notification, "appointment_id", None),
        "isRead": bool(notification.is_read),
        "createdAt": notification.created_at.isoformat() if notification.created_at else None,
        "target": {
            "kind": "appointment",
            "id": appointment.id,
            "date": appointment_date,
            "time": appointment.start_time,
        } if appointment else {
            "kind": "reservation",
            "id": reservation.id,
            "date": booking_date,
            "time": booking_time,
        } if reservation else None,
        "reservation": {
            "id": reservation.id,
            "date": booking_date,
            "time": booking_time,
        } if reservation else None,
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


def normalize_socket_role(value):
    role = str(value or "").strip().lower()
    if role == "prestataire":
        return "prestataire"
    if role == "client":
        return "client"
    if role == "admin":
        return "admin"
    return ""


def build_chat_room(client_id, provider_id):
    return f"chat:client:{int(client_id)}:provider:{int(provider_id)}"


def make_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def make_signature_token(reservation_id, client_id, expires_minutes=30):
    payload = {
        "purpose": "reservation_signature",
        "reservation_id": int(reservation_id),
        "client_id": int(client_id),
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_signature_token(token):
    cleaned = str(token or "").strip()
    if not cleaned:
        raise ValueError("Token de signature manquant.")
    try:
        payload = jwt.decode(cleaned, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Le lien de signature a expire.") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Lien de signature invalide.") from exc

    if payload.get("purpose") != "reservation_signature":
        raise ValueError("Lien de signature invalide.")

    reservation_id = int(payload.get("reservation_id") or 0)
    client_id = int(payload.get("client_id") or 0)
    if reservation_id <= 0 or client_id <= 0:
        raise ValueError("Lien de signature invalide.")
    return reservation_id, client_id


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
    if "approval_status" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'approved'")
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
    if "approval_status" in columns:
        db.session.execute(
            text(
                "UPDATE users "
                "SET approval_status = CASE "
                "WHEN approval_status IS NULL OR approval_status = '' THEN "
                "CASE WHEN role = 'prestataire' AND COALESCE(is_active, 1) = 0 THEN 'pending' ELSE 'approved' END "
                "ELSE approval_status END"
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


def ensure_service_images_schema():
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()
    if "service_images" not in table_names:
        ServiceImage.__table__.create(db.engine, checkfirst=True)
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()

    if "services" in table_names:
        db.session.execute(
            text(
                "INSERT INTO service_images (service_id, image_path, created_at) "
                "SELECT services.id, COALESCE(services.image, services.image_url), COALESCE(services.created_at, CURRENT_TIMESTAMP) "
                "FROM services "
                "WHERE COALESCE(services.image, services.image_url) IS NOT NULL "
                "AND COALESCE(services.image, services.image_url) != '' "
                "AND NOT EXISTS ("
                "SELECT 1 FROM service_images WHERE service_images.service_id = services.id"
                ")"
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
    if "payment_status" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN payment_status VARCHAR(40) NOT NULL DEFAULT 'UNPAID'")
    if "payment_option" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN payment_option VARCHAR(40) NULL")
    if "stripe_session_id" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN stripe_session_id VARCHAR(255) NULL")
    if "stripe_payment_intent_id" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL")
    if "invoice_path" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN invoice_path TEXT NULL")
    if "contract_path" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN contract_path TEXT NULL")
    if "signature_data" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN signature_data LONGTEXT NULL")
    if "signed_at" not in columns:
        statements.append("ALTER TABLE reservations ADD COLUMN signed_at DATETIME NULL")

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
    if "payment_status" in columns:
        db.session.execute(
            text(
                "UPDATE reservations "
                "SET payment_status = COALESCE(payment_status, 'UNPAID') "
                "WHERE payment_status IS NULL OR payment_status = ''"
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


def ensure_review_schema():
    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())
    if "reviews" not in tables:
        return

    try:
        unique_constraints = inspector.get_unique_constraints("reviews")
    except Exception:
        unique_constraints = []

    unique_names = {
        (constraint.get("name") or "").strip()
        for constraint in unique_constraints
        if (constraint.get("name") or "").strip()
    }

    target_unique = "uq_service_client_review"
    if target_unique not in unique_names:
        return

    engine_name = db.engine.dialect.name
    if engine_name == "mysql":
        db.session.execute(text(f"ALTER TABLE reviews DROP INDEX {target_unique}"))
        db.session.commit()


def ensure_notification_schema():
    inspector = inspect(db.engine)
    if "notifications" not in inspector.get_table_names():
        Notification.__table__.create(db.engine, checkfirst=True)
        return

    columns = {column["name"] for column in inspector.get_columns("notifications")}
    if "appointment_id" not in columns:
        db.session.execute(text("ALTER TABLE notifications ADD COLUMN appointment_id INTEGER NULL"))
        db.session.commit()


def ensure_favorite_schema():
    inspector = inspect(db.engine)
    if "favorites" not in inspector.get_table_names():
        Favorite.__table__.create(db.engine, checkfirst=True)
        return

    columns = {column["name"] for column in inspector.get_columns("favorites")}
    if "user_id" not in columns:
        db.session.execute(text("ALTER TABLE favorites ADD COLUMN user_id INTEGER NULL"))
        if "client_id" in columns:
            db.session.execute(text("UPDATE favorites SET user_id = client_id WHERE user_id IS NULL"))
        db.session.commit()
        columns.add("user_id")

    if "service_id" not in columns:
        db.session.execute(text("ALTER TABLE favorites ADD COLUMN service_id INTEGER NULL"))
        db.session.commit()
        columns.add("service_id")

    if db.engine.dialect.name == "mysql":
        # Keep the legacy unique index because MySQL may use it to support the
        # prestataire_id foreign key. New rows use NULL in legacy columns, so it
        # does not block service-level favorites.
        if "client_id" in columns:
            db.session.execute(text("ALTER TABLE favorites MODIFY client_id INTEGER NULL"))
        if "prestataire_id" in columns:
            db.session.execute(text("ALTER TABLE favorites MODIFY prestataire_id INTEGER NULL"))
        db.session.commit()

    if "prestataire_id" in columns:
        legacy_rows = db.session.execute(
            text("SELECT id, prestataire_id FROM favorites WHERE service_id IS NULL AND prestataire_id IS NOT NULL")
        ).mappings().all()
        for row in legacy_rows:
            service = (
                Service.query.filter(
                    or_(
                        Service.prestataire_id == row["prestataire_id"],
                        Service.provider_id == row["prestataire_id"],
                    )
                )
                .order_by(Service.id.asc())
                .first()
            )
            if service:
                db.session.execute(
                    text("UPDATE favorites SET service_id = :service_id WHERE id = :favorite_id"),
                    {"service_id": service.id, "favorite_id": row["id"]},
                )
        db.session.commit()

    duplicate_rows = db.session.execute(
        text(
            """
            SELECT user_id, service_id, MIN(id) AS keep_id
            FROM favorites
            WHERE user_id IS NOT NULL AND service_id IS NOT NULL
            GROUP BY user_id, service_id
            HAVING COUNT(*) > 1
            """
        )
    ).mappings().all()
    for row in duplicate_rows:
        db.session.execute(
            text(
                """
                DELETE FROM favorites
                WHERE user_id = :user_id
                  AND service_id = :service_id
                  AND id <> :keep_id
                """
            ),
            {"user_id": row["user_id"], "service_id": row["service_id"], "keep_id": row["keep_id"]},
        )
    if duplicate_rows:
        db.session.commit()

    inspector = inspect(db.engine)
    unique_names = {
        (constraint.get("name") or "").strip()
        for constraint in inspector.get_unique_constraints("favorites")
        if (constraint.get("name") or "").strip()
    }
    index_names = {
        (index.get("name") or "").strip()
        for index in inspector.get_indexes("favorites")
        if (index.get("name") or "").strip()
    }
    if "uq_user_service_favorite" not in unique_names and "uq_user_service_favorite" not in index_names:
        if db.engine.dialect.name == "mysql":
            db.session.execute(
                text("ALTER TABLE favorites ADD CONSTRAINT uq_user_service_favorite UNIQUE (user_id, service_id)")
            )
        else:
            db.session.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_service_favorite ON favorites (user_id, service_id)")
            )
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
    app.config["INVOICE_UPLOAD_FOLDER"] = os.path.join(app.config["UPLOAD_ROOT"], "invoices")
    app.config["CONTRACT_UPLOAD_FOLDER"] = os.path.join(app.config["UPLOAD_ROOT"], "contracts")

    os.makedirs(app.config["SERVICE_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["PROFILE_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["COVER_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["INVOICE_UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["CONTRACT_UPLOAD_FOLDER"], exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/login": {"origins": "*"}, r"/register": {"origins": "*"}})

    db.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    with app.app_context():
        db.create_all()
        ensure_user_schema()
        ensure_service_schema()
        ensure_service_images_schema()
        ensure_reservation_schema()
        ensure_message_schema()
        ensure_notification_schema()
        ensure_favorite_schema()
        ensure_review_schema()
        seed_data()

    connected_socket_counts = {}
    socket_session_state = {}

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(_error):
        return jsonify({"success": False, "message": "Image trop volumineuse. Taille max: 2 MB."}), 413

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        normalized = str(filename or "").replace("\\", "/").lstrip("/")
        if normalized.startswith("invoices/invoice-") and normalized.endswith(".pdf"):
            invoice_id_part = normalized[len("invoices/invoice-") : -len(".pdf")]
            if invoice_id_part.isdigit():
                reservation = Reservation.query.get(int(invoice_id_part))
                if reservation:
                    generate_reservation_documents(reservation)
                    db.session.commit()
        if normalized.startswith("contracts/contract-") and normalized.endswith(".pdf"):
            contract_id_part = normalized[len("contracts/contract-") : -len(".pdf")]
            if contract_id_part.isdigit():
                reservation = Reservation.query.get(int(contract_id_part))
                if reservation:
                    generate_reservation_documents(reservation)
                    db.session.commit()
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

    def validate_provider_profile_payload(payload, profile_photo=None, cover_photo=None, require_provider_assets=False):
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

        if require_provider_assets:
            if not category:
                errors["category"] = "Le service du prestataire est obligatoire."
            if not city:
                errors["city"] = "La ville du prestataire est obligatoire."
            if not website:
                errors["website"] = "Le lien du prestataire est obligatoire."
            if not profile_photo:
                errors["profilePhoto"] = "La photo principale du service est obligatoire."
            if not cover_photo:
                errors["coverPhoto"] = "La photo supplementaire du service est obligatoire."

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

    def get_service_image_files():
        files = []
        for field_name in ("images[]", "images", "image"):
            files.extend([item for item in request.files.getlist(field_name) if item and item.filename])
        return files

    def get_removed_service_image_ids(payload):
        raw_values = payload.getlist("removed_image_ids[]") if hasattr(payload, "getlist") else []
        raw_values.extend(payload.getlist("removed_image_ids") if hasattr(payload, "getlist") else [])
        ids = []
        for raw_value in raw_values:
            for item in str(raw_value or "").split(","):
                item = item.strip()
                if item.isdigit():
                    ids.append(int(item))
        return ids

    def validate_service_payload(payload, image_files=None, existing_images_count=0):
        errors = {}
        image_files = image_files or []

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

        if not image_files and existing_images_count <= 0:
            errors["image"] = "image est requis."
        for image_file in image_files:
            filename = image_file.filename or ""
            if not filename or not allowed_image_file(filename):
                errors["image"] = "Formats acceptes: jpg, jpeg, png."
                break

        if not description:
            errors["description"] = "description est requis."

        return errors, {
            "title": title,
            "price": price,
            "category": category,
            "description": description,
            "status": status,
        }

    def refresh_service_primary_image(service):
        first_image = (
            ServiceImage.query.filter_by(service_id=service.id)
            .order_by(ServiceImage.id.asc())
            .first()
        )
        image_path = first_image.image_path if first_image else ""
        service.image = image_path
        service.image_url = image_path

    def save_service_gallery_images(service, image_files):
        saved_paths = []
        for image_file in image_files:
            image_path, image_error = save_service_image(image_file)
            if image_error:
                for saved_path in saved_paths:
                    delete_uploaded_file(app, saved_path)
                return image_error
            saved_paths.append(image_path)
            db.session.add(ServiceImage(service_id=service.id, image_path=image_path))
        if saved_paths and not service.image:
            service.image = saved_paths[0]
            service.image_url = saved_paths[0]
        return None

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
        contexts = {}
        if service_ids:
            reservations = (
                Reservation.query.filter(Reservation.service_id.in_(service_ids))
                .order_by(Reservation.created_at.desc(), Reservation.id.desc())
                .all()
            )
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

        direct_messages = (
            Message.query.filter(
                db.or_(Message.sender_id == provider_id, Message.receiver_id == provider_id)
            )
            .order_by(Message.timestamp.desc(), Message.id.desc())
            .all()
        )
        for message in direct_messages:
            other_user_id = message.receiver_id if message.sender_id == provider_id else message.sender_id
            client = User.query.filter_by(id=other_user_id, role="client").first()
            if not client or other_user_id in contexts:
                continue

            contexts[other_user_id] = {
                "client_id": other_user_id,
                "subject": "Conversation client",
                "reservation": None,
            }

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

    def get_provider_appointment_or_404(appointment_id):
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return None, (
                jsonify({"success": False, "message": "Rendez-vous introuvable."}),
                404,
            )
        if appointment.provider_id != request.user_id:
            return None, (
                jsonify({"success": False, "message": "Acces non autorise."}),
                403,
            )
        return appointment, None

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

    def serialize_provider_appointment(appointment):
        service = Service.query.get(appointment.service_id)
        client = User.query.get(appointment.client_id)
        provider = User.query.get(appointment.provider_id)
        return {
            "appointmentId": appointment.id,
            "id": appointment.id,
            "clientId": appointment.client_id,
            "clientName": client.username if client else "Client",
            "serviceId": appointment.service_id,
            "serviceTitle": service.title if service else "Service",
            "providerName": provider.username if provider else "Prestataire",
            "date": appointment.date.isoformat() if appointment.date else None,
            "time": appointment.start_time,
            "start_time": appointment.start_time,
            "end_time": appointment.end_time,
            "note": appointment.message or "",
            "message": appointment.message or "",
            "appointmentStatus": appointment.status or "pending",
        }

    def get_provider_week_appointments(provider_id, start_date, end_date):
        appointments = (
            Appointment.query.filter(
                Appointment.provider_id == provider_id,
                Appointment.date >= start_date,
                Appointment.date <= end_date,
                Appointment.status != "refused",
            )
            .order_by(Appointment.date.asc(), Appointment.start_time.asc())
            .all()
        )
        return {
            (appointment.date.isoformat(), appointment.start_time): serialize_provider_appointment(appointment)
            for appointment in appointments
        }

    def build_provider_week_calendar(provider_id, start_date):
        end_date = start_date + timedelta(days=6)
        blocks = (
            ProviderCalendarBlock.query.filter(
                ProviderCalendarBlock.provider_id == provider_id,
                ProviderCalendarBlock.date >= start_date,
                ProviderCalendarBlock.date <= end_date,
                ProviderCalendarBlock.type.in_(("occupied", "reserved")),
            )
            .order_by(ProviderCalendarBlock.date.asc(), ProviderCalendarBlock.start_time.asc())
            .all()
        )
        blocked_by_slot = {
            (block.date.isoformat(), block.start_time): block for block in blocks
        }
        reservations_by_slot = get_provider_week_reservations(provider_id, start_date, end_date)
        appointments_by_slot = get_provider_week_appointments(provider_id, start_date, end_date)

        days = []
        for offset in range(7):
            current_date = start_date + timedelta(days=offset)
            slots = []
            for start_time_label in STANDARD_WORKING_HOURS:
                slot_key = (current_date.isoformat(), start_time_label)
                reservation_payload = reservations_by_slot.get(slot_key)
                appointment_payload = appointments_by_slot.get(slot_key)
                calendar_block = blocked_by_slot.get(slot_key)

                status = "free"
                event_type = None
                block_id = None
                reservation_id = None
                appointment_id = None
                client_name = None
                service_title = None
                appointment_status = None
                note = None
                provider_name = None

                if reservation_payload:
                    status = "reserved"
                    event_type = "reservation"
                    reservation_id = reservation_payload["reservationId"]
                    client_name = reservation_payload["clientName"]
                    service_title = reservation_payload["serviceTitle"]
                elif appointment_payload:
                    status = "appointment"
                    event_type = "appointment"
                    appointment_id = appointment_payload["appointmentId"]
                    client_name = appointment_payload["clientName"]
                    service_title = appointment_payload["serviceTitle"]
                    appointment_status = appointment_payload["appointmentStatus"]
                    note = appointment_payload["note"]
                    provider_name = appointment_payload["providerName"]
                elif calendar_block:
                    status = calendar_block.type
                    block_id = calendar_block.id
                    reservation_id = calendar_block.reservation_id

                slots.append(
                    {
                        "date": current_date.isoformat(),
                        "time": start_time_label,
                        "start_time": start_time_label,
                        "end_time": plus_one_hour(start_time_label),
                        "status": status,
                        "eventType": event_type,
                        "blockId": block_id,
                        "reservationId": reservation_id,
                        "appointmentId": appointment_id,
                        "clientName": client_name,
                        "serviceTitle": service_title,
                        "appointmentStatus": appointment_status,
                        "note": note,
                        "providerName": provider_name,
                    }
                )

            days.append(serialize_weekly_day(current_date, slots))

        return {
            "weekLabel": build_week_label(start_date),
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "days": days,
        }

    def get_provider_reservations_lookup(provider_id, start_date, end_date):
        provider_services = Service.query.filter(
            db.or_(Service.provider_id == provider_id, Service.prestataire_id == provider_id)
        ).all()
        if not provider_services:
            return {}

        services_by_id = {service.id: service for service in provider_services}
        reservations = Reservation.query.filter(
            Reservation.service_id.in_(services_by_id.keys())
        ).all()

        reservations_by_slot = {}
        for reservation in reservations:
            reservation_dt = parse_reservation_datetime(reservation.date)
            if not reservation_dt:
                continue
            reservation_date = reservation_dt.date()
            if reservation_date < start_date or reservation_date > end_date:
                continue
            reservations_by_slot[(reservation_date.isoformat(), reservation_dt.strftime("%H:%M"))] = reservation
        return reservations_by_slot

    def get_provider_occupied_blocks_lookup(provider_id, start_date, end_date):
        blocks = ProviderCalendarBlock.query.filter(
            ProviderCalendarBlock.provider_id == provider_id,
            ProviderCalendarBlock.date >= start_date,
            ProviderCalendarBlock.date <= end_date,
            ProviderCalendarBlock.type.in_(("occupied", "reserved", "appointment")),
        ).all()
        return {(block.date.isoformat(), block.start_time): block for block in blocks}

    def build_service_availability(provider_id, start_date=None, days_count=14):
        base_date = start_date or datetime.utcnow().date()
        end_date = base_date + timedelta(days=max(days_count - 1, 0))
        reservations_by_slot = get_provider_reservations_lookup(provider_id, base_date, end_date)
        occupied_by_slot = get_provider_occupied_blocks_lookup(provider_id, base_date, end_date)

        days = []
        next_available = None
        for offset in range(days_count):
            current_date = base_date + timedelta(days=offset)
            slots = []
            for start_time_label in STANDARD_WORKING_HOURS:
                slot_key = (current_date.isoformat(), start_time_label)
                is_available = slot_key not in reservations_by_slot and slot_key not in occupied_by_slot
                if is_available and next_available is None:
                    next_available = {
                        "date": current_date.isoformat(),
                        "time": start_time_label,
                    }
                slots.append(
                    {
                        "time": start_time_label,
                        "end_time": plus_one_hour(start_time_label),
                        "available": is_available,
                    }
                )

            available_count = sum(1 for slot in slots if slot["available"])
            days.append(
                {
                    "date": current_date.isoformat(),
                    "label": f"{FRENCH_WEEKDAYS[current_date.weekday()]} {current_date.day} {FRENCH_MONTHS[current_date.month]}",
                    "available": available_count > 0,
                    "available_count": available_count,
                    "slots": slots,
                }
            )

        return {
            "days": days,
            "next_available": next_available,
            "availability_label": (
                f"Prochain creneau: {next_available['date']} a {next_available['time']}"
                if next_available
                else "Aucun creneau disponible pour le moment"
            ),
        }

    def assert_slot_available(provider_id, slot_date, start_time_label):
        reservations_by_slot = get_provider_reservations_lookup(provider_id, slot_date, slot_date)
        occupied_by_slot = get_provider_occupied_blocks_lookup(provider_id, slot_date, slot_date)
        slot_key = (slot_date.isoformat(), start_time_label)
        return slot_key not in reservations_by_slot and slot_key not in occupied_by_slot

    def accepted_appointment_exists(provider_id, slot_date, start_time_label, excluded_appointment_id=None):
        query = Appointment.query.filter_by(
            provider_id=provider_id,
            date=slot_date,
            start_time=start_time_label,
            status="accepted",
        )
        if excluded_appointment_id:
            query = query.filter(Appointment.id != excluded_appointment_id)
        return query.first() is not None

    def reserve_calendar_slot(provider_id, reservation, slot_date, start_time_label):
        block = ProviderCalendarBlock.query.filter_by(
            provider_id=provider_id,
            date=slot_date,
            start_time=start_time_label,
        ).first()
        if not block:
            block = ProviderCalendarBlock(
                provider_id=provider_id,
                date=slot_date,
                start_time=start_time_label,
                end_time=plus_one_hour(start_time_label),
            )
            db.session.add(block)

        block.type = "reserved"
        block.reservation_id = reservation.id
        block.end_time = plus_one_hour(start_time_label)
        block.updated_at = datetime.utcnow()

        availability_slot = ProviderAvailabilitySlot.query.filter_by(
            provider_id=provider_id,
            date=slot_date,
            start_time=start_time_label,
        ).first()
        if availability_slot:
            availability_slot.status = "reserved"
            availability_slot.reservation_id = reservation.id
            availability_slot.note = f"Reservation #{reservation.id}"
            availability_slot.updated_at = datetime.utcnow()
        return block

    def create_reservation_notification(provider_id, reservation, service, client, slot_date, start_time_label):
        date_label = slot_date.isoformat() if slot_date else reservation.date
        time_label = start_time_label or "--"
        notification = Notification(
            user_id=provider_id,
            type="reservation",
            title="Nouvelle reservation",
            message=(
                f"{client.username if client else 'Client'} a reserve {service.title if service else 'un service'} "
                f"le {date_label} a {time_label}."
            ),
            reservation_id=reservation.id,
            is_read=False,
        )
        db.session.add(notification)
        return notification

    def create_appointment_notification(provider_id, appointment, service, client):
        notification = Notification(
            user_id=provider_id,
            type="appointment_request",
            title="Nouvelle demande de rendez-vous",
            message=(
                f"{client.username if client else 'Client'} demande un rendez-vous pour "
                f"{service.title if service else 'un service'} le {appointment.date.isoformat()} a {appointment.start_time}."
            ),
            appointment_id=appointment.id,
            is_read=False,
        )
        db.session.add(notification)
        return notification

    def create_reminder_notifications(provider_id):
        tomorrow = datetime.utcnow().date() + timedelta(days=1)
        service_ids = get_provider_service_ids(provider_id)

        if service_ids:
            reservations = Reservation.query.filter(Reservation.service_id.in_(service_ids)).all()
            for reservation in reservations:
                reservation_dt = parse_reservation_datetime(reservation.date)
                if not reservation_dt or reservation_dt.date() != tomorrow:
                    continue
                exists = Notification.query.filter_by(
                    user_id=provider_id,
                    type="reservation_reminder",
                    reservation_id=reservation.id,
                ).first()
                if exists:
                    continue
                service = Service.query.get(reservation.service_id)
                db.session.add(
                    Notification(
                        user_id=provider_id,
                        type="reservation_reminder",
                        title="Rappel reservation demain",
                        message=(
                            f"Reservation demain pour {service.title if service else 'un service'} "
                            f"a {reservation_dt.strftime('%H:%M')}."
                        ),
                        reservation_id=reservation.id,
                        is_read=False,
                    )
                )

        appointments = Appointment.query.filter(
            Appointment.provider_id == provider_id,
            Appointment.date == tomorrow,
            Appointment.status == "accepted",
        ).all()
        for appointment in appointments:
            exists = Notification.query.filter_by(
                user_id=provider_id,
                type="appointment_reminder",
                appointment_id=appointment.id,
            ).first()
            if exists:
                continue
            service = Service.query.get(appointment.service_id)
            db.session.add(
                Notification(
                    user_id=provider_id,
                    type="appointment_reminder",
                    title="Rappel rendez-vous demain",
                    message=(
                        f"Rendez-vous demain pour {service.title if service else 'un service'} "
                        f"a {appointment.start_time}."
                    ),
                    appointment_id=appointment.id,
                    is_read=False,
                )
            )
        db.session.commit()

    def generate_reservation_documents(reservation):
        service = Service.query.get(reservation.service_id)
        client = User.query.get(reservation.client_id)
        provider = User.query.get(get_service_provider_id(service)) if service else None
        total_amount = float(service.price) if service and service.price is not None else float(reservation.amount or 0)
        advance_amount = float(reservation.amount or 0)
        paid_amount = advance_amount if normalize_payment_status(reservation.payment_status) == "PAID" else 0.0

        invoice_name = f"invoice-{reservation.id}.pdf"
        contract_name = f"contract-{reservation.id}.pdf"
        invoice_relative = build_storage_relative_path("invoices", invoice_name)
        contract_relative = build_storage_relative_path("contracts", contract_name)
        invoice_absolute = os.path.join(app.root_path, invoice_relative.replace("/", os.sep))
        contract_absolute = os.path.join(app.root_path, contract_relative.replace("/", os.sep))

        write_invoice_pdf(
            invoice_absolute,
            {
                "reservation_id": reservation.id,
                "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                "reservation_date": reservation.date,
                "client_name": client.username if client else "Client",
                "provider_name": provider.username if provider else "Prestataire",
                "service_name": service.title if service else "Service",
                "location": reservation.location or (service.city if service else "Tunisie"),
                "payment_status": normalize_payment_status(reservation.payment_status),
                "total_amount": total_amount,
                "paid_amount": paid_amount,
            },
        )
        write_contract_pdf(
            contract_absolute,
            {
                "reservation_id": reservation.id,
                "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                "reservation_date": reservation.date,
                "client_name": client.username if client else "Client",
                "provider_name": provider.username if provider else "Prestataire",
                "service_name": service.title if service else "Service",
                "location": reservation.location or (service.city if service else "Tunisie"),
                "total_amount": total_amount,
                "paid_amount": paid_amount,
                "remaining_amount": max(total_amount - paid_amount, 0),
                "has_client_signature": bool(reservation.signature_data),
                "signed_at": (
                    reservation.signed_at.isoformat()
                    if reservation.signed_at
                    else datetime.utcnow().isoformat()
                ),
            },
        )

        reservation.invoice_path = invoice_relative
        reservation.contract_path = contract_relative

    def mark_reservation_paid(reservation, payment_intent_id=None, stripe_session_id=None):
        reservation.payment_status = "PAID"
        reservation.stripe_payment_intent_id = payment_intent_id or reservation.stripe_payment_intent_id
        reservation.stripe_session_id = stripe_session_id or reservation.stripe_session_id
        reservation.updated_at = datetime.utcnow()
        generate_reservation_documents(reservation)

    def create_checkout_session(reservation, service):
        frontend_base_url = get_frontend_base_url()
        payment_amount = reservation.amount if reservation.amount is not None else service.price
        form_data = {
            "mode": "payment",
            "success_url": (
                f"{frontend_base_url}/client/reservations"
                f"?checkout=success&reservation_id={reservation.id}&session_id={{CHECKOUT_SESSION_ID}}"
            ),
            "cancel_url": f"{frontend_base_url}/client/reservations?checkout=cancel&reservation_id={reservation.id}",
            "metadata[reservation_id]": str(reservation.id),
            "metadata[client_id]": str(reservation.client_id),
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": get_stripe_currency(),
            "line_items[0][price_data][unit_amount]": str(amount_to_minor_units(payment_amount)),
            "line_items[0][price_data][product_data][name]": service.title,
            "line_items[0][price_data][product_data][description]": service.description or service.title,
        }
        return stripe_api_request("POST", "/v1/checkout/sessions", form_data=form_data)

    def create_payment_intent(reservation, service):
        payment_amount = reservation.amount if reservation.amount is not None else service.price
        form_data = {
            "amount": str(amount_to_minor_units(payment_amount)),
            "currency": get_stripe_currency(),
            "automatic_payment_methods[enabled]": "true",
            "metadata[reservation_id]": str(reservation.id),
            "metadata[client_id]": str(reservation.client_id),
            "description": service.title,
        }
        return stripe_api_request("POST", "/v1/payment_intents", form_data=form_data)

    def confirm_checkout_session(session_id):
        encoded_session_id = urllib_parse.quote(session_id, safe="")
        session = stripe_api_request("GET", f"/v1/checkout/sessions/{encoded_session_id}")
        reservation_id = int(session.get("metadata", {}).get("reservation_id") or 0)
        if not reservation_id:
            raise RuntimeError("Session Stripe invalide.")
        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            raise RuntimeError("Reservation introuvable.")

        if session.get("payment_status") == "paid":
            mark_reservation_paid(
                reservation,
                payment_intent_id=session.get("payment_intent"),
                stripe_session_id=session.get("id"),
            )
        else:
            reservation.payment_status = "UNPAID"
            reservation.stripe_session_id = session.get("id")
            reservation.updated_at = datetime.utcnow()

        db.session.commit()
        return reservation

    def confirm_payment_intent(payment_intent_id):
        encoded_payment_intent_id = urllib_parse.quote(payment_intent_id, safe="")
        payment_intent = stripe_api_request("GET", f"/v1/payment_intents/{encoded_payment_intent_id}")
        reservation_id = int(payment_intent.get("metadata", {}).get("reservation_id") or 0)
        if not reservation_id:
            raise RuntimeError("Paiement Stripe invalide.")

        reservation = Reservation.query.get(reservation_id)
        if not reservation:
            raise RuntimeError("Reservation introuvable.")

        if payment_intent.get("status") == "succeeded":
            mark_reservation_paid(
                reservation,
                payment_intent_id=payment_intent.get("id"),
            )
        else:
            reservation.payment_status = "UNPAID"
            reservation.stripe_payment_intent_id = payment_intent.get("id")
            reservation.updated_at = datetime.utcnow()

        db.session.commit()
        return reservation, payment_intent

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

    def decode_auth_token(token):
        cleaned = str(token or "").replace("Bearer ", "").strip()
        if not cleaned:
            raise ValueError("Authentification requise.")

        try:
            payload = jwt.decode(cleaned, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError as exc:
            raise ValueError("Session expiree.") from exc
        except jwt.InvalidTokenError as exc:
            raise ValueError("Token invalide.") from exc

        user_id = int(payload["sub"])
        user_role = normalize_socket_role(payload.get("role"))
        if not user_role:
            raise ValueError("Role utilisateur invalide.")
        return user_id, user_role

    def get_socket_identity(auth_payload=None):
        auth_payload = auth_payload or {}
        token = auth_payload.get("token") or request.args.get("token") or request.headers.get("Authorization", "")
        user_id, user_role = decode_auth_token(token)
        user = User.query.get(user_id)
        if not user:
            raise ValueError("Utilisateur introuvable.")
        return user, user_role

    def get_or_create_client_provider_pair(current_user_id, current_user_role, other_user_id):
        other_user = User.query.get(int(other_user_id)) if other_user_id else None
        if not other_user:
            return None, None, None, "Conversation introuvable."

        other_role = normalize_socket_role(other_user.role)
        if current_user_role == "client":
            if other_role != "prestataire":
                return None, None, None, "Prestataire introuvable."
            return current_user_id, other_user.id, other_user, None

        if current_user_role == "prestataire":
            if other_role != "client":
                return None, None, None, "Client introuvable."
            provider_contexts = get_provider_client_contexts(current_user_id)
            if int(other_user.id) not in provider_contexts:
                return None, None, None, "Conversation non autorisee."
            return other_user.id, current_user_id, other_user, None

        return None, None, None, "Permission insuffisante."

    def get_room_presence_payload(client_id, provider_id):
        client_online = connected_socket_counts.get(int(client_id), 0) > 0
        provider_online = connected_socket_counts.get(int(provider_id), 0) > 0
        return {
            "client_id": int(client_id),
            "provider_id": int(provider_id),
            "online_users": [user_id for user_id, online in ((int(client_id), client_online), (int(provider_id), provider_online)) if online],
            "client_online": client_online,
            "provider_online": provider_online,
        }

    def emit_presence_update(room, client_id, provider_id):
        socketio.emit(
            "presence:update",
            {
                "room": room,
                **get_room_presence_payload(client_id, provider_id),
            },
            room=room,
        )

    def emit_provider_chat_update(provider_id, client_id):
        provider = User.query.get(int(provider_id))
        client = User.query.filter_by(id=int(client_id), role="client").first()
        if not provider or not client:
            return

        contexts = get_provider_client_contexts(provider.id)
        context = contexts.get(client.id)
        if not context:
            return

        socketio.emit(
            "provider_chat_updated",
            {
                "chat": serialize_provider_chat(client, context, provider.id),
            },
            room=f"user:{provider.id}",
        )

    @socketio.on("connect")
    def on_socket_connect(auth):
        try:
            user, user_role = get_socket_identity(auth)
        except ValueError as error:
            raise ConnectionRefusedError(str(error)) from error

        print(f"[socket] connect user={user.id} role={user_role} sid={request.sid}")
        join_room(f"user:{user.id}")
        connected_socket_counts[user.id] = connected_socket_counts.get(user.id, 0) + 1
        socket_session_state[request.sid] = {
            "user_id": user.id,
            "user_role": user_role,
            "rooms": set(),
        }
        emit(
            "socket:ready",
            {
                "user_id": user.id,
                "role": user_role,
            },
        )

    @socketio.on("disconnect")
    def on_socket_disconnect():
        session_state = socket_session_state.pop(request.sid, None)
        if not session_state:
            return

        user_id = int(session_state["user_id"])
        print(f"[socket] disconnect user={user_id} sid={request.sid}")
        next_count = max(connected_socket_counts.get(user_id, 0) - 1, 0)
        if next_count == 0:
            connected_socket_counts.pop(user_id, None)
        else:
            connected_socket_counts[user_id] = next_count

        for room in session_state.get("rooms", set()):
            parts = room.split(":")
            if len(parts) != 5:
                continue
            emit_presence_update(room, parts[2], parts[4])

    @socketio.on("join_conversation")
    def on_join_conversation(payload):
        payload = payload or {}
        session_state = socket_session_state.get(request.sid)
        if not session_state:
            disconnect()
            return

        client_id, provider_id, _, error_message = get_or_create_client_provider_pair(
            session_state["user_id"],
            session_state["user_role"],
            payload.get("other_user_id"),
        )
        if error_message:
            emit("socket:error", {"message": error_message})
            return

        room = build_chat_room(client_id, provider_id)
        print(
            f"[socket] join_conversation user={session_state['user_id']} other={payload.get('other_user_id')} room={room}"
        )
        join_room(room)
        session_state["rooms"].add(room)
        emit(
            "conversation_joined",
            {
                "room": room,
                "client_id": client_id,
                "provider_id": provider_id,
            },
        )
        emit_presence_update(room, client_id, provider_id)

    @socketio.on("typing_status")
    def on_typing_status(payload):
        payload = payload or {}
        session_state = socket_session_state.get(request.sid)
        if not session_state:
            disconnect()
            return

        client_id, provider_id, _, error_message = get_or_create_client_provider_pair(
            session_state["user_id"],
            session_state["user_role"],
            payload.get("other_user_id"),
        )
        if error_message:
            emit("socket:error", {"message": error_message})
            return

        room = build_chat_room(client_id, provider_id)
        print(
            f"[socket] typing_status user={session_state['user_id']} other={payload.get('other_user_id')} room={room} typing={bool(payload.get('is_typing'))}"
        )
        emit(
            "typing_status",
            {
                "room": room,
                "user_id": session_state["user_id"],
                "user_role": session_state["user_role"],
                "is_typing": bool(payload.get("is_typing")),
            },
            room=room,
            include_self=False,
        )

    @socketio.on("send_message")
    def on_send_message(payload):
        payload = payload or {}
        session_state = socket_session_state.get(request.sid)
        if not session_state:
            disconnect()
            return {"success": False, "message": "Session socket invalide."}

        content = str(payload.get("content") or "").strip()
        if not content:
            return {"success": False, "message": "Le message ne peut pas etre vide."}

        client_id, provider_id, other_user, error_message = get_or_create_client_provider_pair(
            session_state["user_id"],
            session_state["user_role"],
            payload.get("receiver_id"),
        )
        if error_message:
            return {"success": False, "message": error_message}

        message = Message(
            sender_id=session_state["user_id"],
            receiver_id=other_user.id,
            content=content,
            is_read=False,
        )
        db.session.add(message)
        db.session.commit()

        room = build_chat_room(client_id, provider_id)
        message_payload = serialize_message(message)
        socket_payload = {
            "room": room,
            "message": message_payload,
            "client_id": client_id,
            "provider_id": provider_id,
        }

        print(
            f"[socket] send_message sender={session_state['user_id']} receiver={other_user.id} room={room} message_id={message.id}"
        )
        socketio.emit("receive_message", socket_payload, room=room)
        emit_provider_chat_update(provider_id, client_id)

        return {
            "success": True,
            "message": "Message envoye avec succes.",
            "messagePayload": socket_payload,
        }

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
        is_multipart = request.content_type and "multipart/form-data" in request.content_type
        payload = request.form if is_multipart else (request.get_json(silent=True) or {})

        username = (payload.get("name") or payload.get("username") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        role = (payload.get("role") or "client").strip().lower()
        website = (payload.get("website") or "").strip()
        city = (payload.get("city") or "").strip()
        profile_photo = request.files.get("profilePhoto") if is_multipart else None
        cover_photo = request.files.get("coverPhoto") if is_multipart else None

        if not username or not email or not password:
            return jsonify({"success": False, "message": "Nom, email et mot de passe sont obligatoires."}), 400

        if role not in {"client", "prestataire", "admin"}:
            return jsonify({"success": False, "message": "Role invalide."}), 400

        if len(password) < 6:
            return jsonify({"success": False, "message": "Le mot de passe doit contenir au moins 6 caracteres."}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "Cet email est deja utilise."}), 409

        if role == "prestataire":
            provider_errors, provider_payload = validate_provider_profile_payload(
                {
                    "name": username,
                    "email": email,
                    "category": payload.get("category"),
                    "city": city,
                    "website": website,
                },
                profile_photo=profile_photo,
                cover_photo=cover_photo,
                require_provider_assets=True,
            )
            if provider_errors:
                first_error = next(iter(provider_errors.values()))
                return jsonify({"success": False, "message": first_error, "errors": provider_errors}), 400

            profile_photo_path = None
            cover_photo_path = None

            if profile_photo:
                profile_photo_path, image_error = save_provider_profile_image(
                    profile_photo,
                    "PROFILE_UPLOAD_FOLDER",
                )
                if image_error:
                    return jsonify({"success": False, "message": image_error, "errors": {"profilePhoto": image_error}}), 400

            if cover_photo:
                cover_photo_path, image_error = save_provider_profile_image(
                    cover_photo,
                    "COVER_UPLOAD_FOLDER",
                )
                if image_error:
                    return jsonify({"success": False, "message": image_error, "errors": {"coverPhoto": image_error}}), 400
        else:
            provider_payload = {"website": ""}
            profile_photo_path = None
            cover_photo_path = None

        user = User(
            username=username,
            email=email,
            password=bcrypt.generate_password_hash(password).decode("utf-8"),
            role=role,
            is_active=False if role == "prestataire" else True,
            approval_status="pending" if role == "prestataire" else "approved",
            category=provider_payload.get("category") or None,
            city=provider_payload.get("city") or None,
            website=provider_payload.get("website") or None,
            profile_photo=profile_photo_path,
            cover_photo=cover_photo_path,
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

        if role == "prestataire":
            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Votre demande d'acces prestataire a bien ete envoyee. Merci d'attendre l'approbation de l'administrateur.",
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

        if user.role == "prestataire" and str(getattr(user, "approval_status", "approved") or "approved") != "approved":
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Votre demande d'acces prestataire est en attente d'approbation par l'administrateur.",
                    }
                ),
                403,
            )

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

    @app.get("/api/client/profile")
    @auth_required(allowed_roles={"client"})
    def get_client_profile():
        user = User.query.filter_by(id=request.user_id, role="client").first()
        if not user:
            return jsonify({"success": False, "message": "Client introuvable."}), 404

        return jsonify(
            {
                "success": True,
                "message": "Profil client recupere avec succes.",
                "user": serialize_user(user),
            }
        )

    @app.put("/api/client/profile")
    @app.post("/api/client/profile")
    @auth_required(allowed_roles={"client"})
    def update_client_profile():
        user = User.query.filter_by(id=request.user_id, role="client").first()
        if not user:
            return jsonify({"success": False, "message": "Client introuvable."}), 404

        is_multipart = request.content_type and "multipart/form-data" in request.content_type.lower()
        payload = request.form if is_multipart else (request.get_json(silent=True) or {})
        profile_photo = request.files.get("profilePhoto") if is_multipart else None

        errors, normalized = validate_provider_profile_payload(payload, profile_photo=profile_photo)

        if User.query.filter(User.email == normalized["email"], User.id != request.user_id).first():
            errors["email"] = "Cet email est deja utilise."

        if errors:
            return jsonify({"success": False, "message": "Erreur de validation", "errors": errors}), 400

        previous_profile_photo = user.profile_photo

        if profile_photo:
            profile_photo_path, image_error = save_provider_profile_image(
                profile_photo,
                "PROFILE_UPLOAD_FOLDER",
            )
            if image_error:
                return jsonify({"success": False, "message": image_error, "errors": {"profilePhoto": image_error}}), 400
            user.profile_photo = profile_photo_path

        user.username = normalized["name"]
        user.email = normalized["email"]
        user.phone = normalized["phone"] or None
        user.city = normalized["city"] or None
        user.instagram = normalized["instagram"] or None
        user.website = normalized["website"] or None
        user.description = normalized["description"] or None
        user.updated_at = datetime.utcnow()

        db.session.commit()

        if profile_photo and previous_profile_photo and previous_profile_photo != user.profile_photo:
            delete_uploaded_file(app, previous_profile_photo)

        return jsonify(
            {
                "success": True,
                "message": "Profil client mis a jour avec succes.",
                "user": serialize_user(user),
            }
        )

    @app.put("/api/admin/providers/<int:provider_id>")
    @app.patch("/api/admin/providers/<int:provider_id>")
    @auth_required(allowed_roles={"admin"})
    def update_admin_provider(provider_id):
        provider = User.query.filter_by(id=provider_id, role="prestataire").first()
        if not provider:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        previous_approval_status = str(getattr(provider, "approval_status", "approved") or "approved")
        previous_is_active = bool(getattr(provider, "is_active", True))

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

        if status and status not in {"active", "inactive", "pending-approval"}:
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
        required_for_approval = [
            ("category", provider.category),
            ("website", provider.website),
            ("profile_photo", provider.profile_photo),
            ("cover_photo", provider.cover_photo),
        ]
        if status == "active" and any(not str(value or "").strip() for _, value in required_for_approval):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Impossible d'approuver ce prestataire tant que les champs service, lien et photos ne sont pas completes.",
                    }
                ),
                400,
            )

        if status == "pending-approval":
            provider.approval_status = "pending"
            provider.is_active = False
        elif status == "active":
            provider.approval_status = "approved"
            provider.is_active = True
        elif status == "inactive":
            provider.approval_status = "approved"
            provider.is_active = False
        provider.updated_at = datetime.utcnow()

        db.session.commit()

        email_message = "Prestataire mis a jour avec succes."
        should_send_approval_email = (
            status == "active" and (previous_approval_status == "pending" or not previous_is_active)
        )
        if should_send_approval_email:
            email_sent, email_error = send_provider_approval_email(provider.email, provider.username)
            if email_sent:
                email_message = "Prestataire approuve et email envoye avec succes."
            else:
                email_message = (
                    "Prestataire approuve, mais l'email n'a pas pu etre envoye. "
                    f"Detail: {email_error}"
                )

        return jsonify(
            {
                "success": True,
                "message": email_message,
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
        ).first()
        if existing_block and existing_block.type == "reserved":
            return jsonify({"success": False, "message": "Ce creneau est deja reserve et ne peut pas etre bloque manuellement."}), 409
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

    @app.patch("/api/provider/appointments/<int:appointment_id>/status")
    @auth_required(allowed_roles={"prestataire"})
    def update_provider_appointment_status(appointment_id):
        appointment, error_response = get_provider_appointment_or_404(appointment_id)
        if error_response:
            return error_response

        payload = request.get_json(silent=True) or {}
        next_status = str(payload.get("status") or "").strip().lower()
        if next_status not in {"accepted", "refused"}:
            return jsonify({"success": False, "message": "Statut rendez-vous invalide."}), 400

        if next_status == "accepted":
            if not assert_slot_available(appointment.provider_id, appointment.date, appointment.start_time):
                return jsonify({"success": False, "message": "Cette date et cette heure ne sont pas disponibles."}), 409
            if accepted_appointment_exists(
                appointment.provider_id,
                appointment.date,
                appointment.start_time,
                excluded_appointment_id=appointment.id,
            ):
                return jsonify({"success": False, "message": "Cette date et cette heure ne sont pas disponibles."}), 409

            block = ProviderCalendarBlock.query.filter_by(
                provider_id=appointment.provider_id,
                date=appointment.date,
                start_time=appointment.start_time,
                type="appointment",
            ).first()
            if not block:
                block = ProviderCalendarBlock(
                    provider_id=appointment.provider_id,
                    date=appointment.date,
                    start_time=appointment.start_time,
                    end_time=appointment.end_time,
                    type="appointment",
                )
                db.session.add(block)
        else:
            ProviderCalendarBlock.query.filter_by(
                provider_id=appointment.provider_id,
                date=appointment.date,
                start_time=appointment.start_time,
                type="appointment",
            ).delete()

        appointment.status = next_status
        appointment.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Rendez-vous mis a jour avec succes.",
                "appointment": serialize_provider_appointment(appointment),
            }
        )

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

        room = build_chat_room(client.id, request.user_id)
        socket_payload = {
            "room": room,
            "message": serialize_message(message),
            "client_id": client.id,
            "provider_id": request.user_id,
        }
        socketio.emit("receive_message", socket_payload, room=room)
        emit_provider_chat_update(request.user_id, client.id)

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Message envoye avec succes.",
                    "sentMessage": serialize_provider_chat_message(message, request.user_id),
                    "chat": serialize_provider_chat(client, context, request.user_id),
                    "messagePayload": socket_payload,
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

    @app.get("/api/provider/notifications")
    @auth_required(allowed_roles={"prestataire"})
    def list_provider_notifications():
        create_reminder_notifications(request.user_id)
        notifications = (
            Notification.query.filter_by(user_id=request.user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(30)
            .all()
        )
        unread_count = Notification.query.filter_by(user_id=request.user_id, is_read=False).count()
        return jsonify(
            {
                "success": True,
                "message": "Notifications recuperees avec succes.",
                "notifications": [serialize_notification(item) for item in notifications],
                "unreadCount": unread_count,
            }
        )

    @app.patch("/api/provider/notifications/<int:notification_id>/read")
    @auth_required(allowed_roles={"prestataire"})
    def mark_provider_notification_read(notification_id):
        notification = Notification.query.filter_by(id=notification_id, user_id=request.user_id).first()
        if not notification:
            return jsonify({"success": False, "message": "Notification introuvable."}), 404

        notification.is_read = True
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Notification marquee comme lue.",
                "notification": serialize_notification(notification),
            }
        )

    @app.get("/api/services")
    @auth_required(allowed_roles={"client"})
    def list_services():
        city = (request.args.get("city") or "").strip().lower()
        provider_id = (request.args.get("provider_id") or "").strip()
        min_price = request.args.get("min_price")
        max_price = request.args.get("max_price")
        service_type = (request.args.get("type") or "").strip().lower()
        q = (request.args.get("q") or "").strip().lower()

        query = Service.query
        if provider_id:
            try:
                provider_id_value = int(provider_id)
            except ValueError:
                return jsonify({"success": False, "message": "provider_id doit etre numerique."}), 400
            query = query.filter(
                db.or_(
                    Service.provider_id == provider_id_value,
                    Service.prestataire_id == provider_id_value,
                )
            )
        if city:
            query = query.filter(db.func.lower(Service.city) == city)
        if service_type:
            query = query.filter(
                db.or_(
                    db.func.lower(Service.type).contains(service_type),
                    db.func.lower(Service.category).contains(service_type),
                )
            )
        if q:
            provider_ids = db.session.query(User.id).filter(db.func.lower(User.username).contains(q))
            query = query.filter(
                db.or_(
                    db.func.lower(Service.title).contains(q),
                    db.func.lower(Service.description).contains(q),
                    db.func.lower(Service.type).contains(q),
                    db.func.lower(Service.category).contains(q),
                    Service.provider_id.in_(provider_ids),
                    Service.prestataire_id.in_(provider_ids),
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
        image_files = get_service_image_files()
        errors, normalized = validate_service_payload(payload, image_files=image_files)

        if errors:
            return jsonify({"success": False, "message": "Validation echouee.", "errors": errors}), 400

        service = Service(
            provider_id=request.user_id,
            prestataire_id=request.user_id,
            title=normalized["title"],
            price=normalized["price"],
            category=normalized["category"],
            type=normalized["category"],
            image="",
            image_url="",
            description=normalized["description"],
            status=normalized["status"],
            rating=4.5,
            city="",
        )
        db.session.add(service)
        db.session.flush()

        image_error = save_service_gallery_images(service, image_files)
        if image_error:
            db.session.rollback()
            return jsonify({"success": False, "message": image_error, "errors": {"image": image_error}}), 400

        refresh_service_primary_image(service)
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
        image_files = get_service_image_files()
        removed_image_ids = get_removed_service_image_ids(payload)
        existing_images_query = ServiceImage.query.filter_by(service_id=service.id)
        if removed_image_ids:
            existing_images_query = existing_images_query.filter(~ServiceImage.id.in_(removed_image_ids))
        existing_images_count = existing_images_query.count()
        errors, normalized = validate_service_payload(
            payload,
            image_files=image_files,
            existing_images_count=existing_images_count,
        )

        if errors:
            return jsonify({"success": False, "message": "Validation echouee.", "errors": errors}), 400

        if image_files:
            image_error = save_service_gallery_images(service, image_files)
            if image_error:
                db.session.rollback()
                return jsonify({"success": False, "message": image_error, "errors": {"image": image_error}}), 400

        if removed_image_ids:
            images_to_remove = ServiceImage.query.filter(
                ServiceImage.service_id == service.id,
                ServiceImage.id.in_(removed_image_ids),
            ).all()
            for image_item in images_to_remove:
                delete_uploaded_file(app, image_item.image_path)
                db.session.delete(image_item)

        service.title = normalized["title"]
        service.price = normalized["price"]
        service.category = normalized["category"]
        service.type = normalized["category"]
        service.description = normalized["description"]
        service.status = normalized["status"]
        service.provider_id = request.user_id
        service.prestataire_id = request.user_id
        service.updated_at = datetime.utcnow()
        refresh_service_primary_image(service)

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

        for image_item in list(getattr(service, "images", [])):
            delete_uploaded_file(app, image_item.image_path)
        if not getattr(service, "images", []):
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
        provider_id = get_service_provider_id(service)
        availability = build_service_availability(provider_id) if provider_id else {"days": [], "next_available": None}
        rating_summary = get_service_rating_summary(service.id)
        return jsonify(
            {
                "success": True,
                "service": serialize_service(service, request.user_id),
                "reviews": [serialize_review(review) for review in rating_summary["reviews"]],
                "availability": availability,
                "stripe": {
                    "enabled": is_stripe_configured(),
                    "publishable_key": get_stripe_publishable_key(),
                },
            }
        )

    @app.get("/api/services/<int:service_id>/availability")
    @auth_required(allowed_roles={"client"})
    def get_service_availability(service_id):
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        provider_id = get_service_provider_id(service)
        if not provider_id:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404

        start_date = parse_date_value(request.args.get("start")) or datetime.utcnow().date()
        days_count = min(max(request.args.get("days", type=int) or 14, 1), 30)
        return jsonify({"success": True, "availability": build_service_availability(provider_id, start_date, days_count)})

    @app.get("/api/services/<int:service_id>/reviews")
    @auth_required(allowed_roles={"client"})
    def list_service_reviews(service_id):
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404
        rating_summary = get_service_rating_summary(service.id)
        return jsonify(
            {
                "success": True,
                "rating": rating_summary["average"],
                "count": rating_summary["count"],
                "reviews": [serialize_review(review) for review in rating_summary["reviews"]],
            }
        )

    @app.post("/api/services/<int:service_id>/reviews")
    @auth_required(allowed_roles={"client"})
    def create_service_review(service_id):
        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        payload = request.get_json(silent=True) or {}
        rating = int(payload.get("rating") or 0)
        comment = (payload.get("comment") or "").strip()

        if rating < 1 or rating > 5:
            return jsonify({"success": False, "message": "La note doit etre comprise entre 1 et 5."}), 400

        review = Review(
            service_id=service.id,
            client_id=request.user_id,
            provider_id=get_service_provider_id(service),
            rating=rating,
            comment=comment,
        )
        db.session.add(review)

        db.session.commit()
        summary = update_service_rating(service)
        return jsonify(
            {
                "success": True,
                "review": serialize_review(review),
                "rating": summary["average"],
                "count": summary["count"],
            }
        ), 201

    @app.post("/api/reservations")
    @auth_required(allowed_roles={"client"})
    def create_reservation():
        payload = request.get_json(silent=True) or {}
        service_id = payload.get("service_id")
        date_value = (payload.get("date") or "").strip()
        start_time_label = str(payload.get("start_time") or "").strip()
        notes = (payload.get("notes") or "").strip() or None
        location = (payload.get("location") or "").strip() or None
        details = (payload.get("details") or notes or "").strip() or None
        amount = payload.get("amount")
        payment_option = str(payload.get("payment_option") or "full").strip().lower()

        if not service_id or not date_value or not start_time_label:
            return jsonify({"success": False, "message": "service_id, date et start_time sont requis."}), 400

        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        provider_id = get_service_provider_id(service)
        parsed_date = parse_date_value(date_value)
        if not parsed_date:
            return jsonify({"success": False, "message": "date est invalide."}), 400
        if start_time_label and not parse_time_value(start_time_label):
            return jsonify({"success": False, "message": "start_time est invalide."}), 400
        if start_time_label not in STANDARD_WORKING_HOURS:
            return jsonify({"success": False, "message": "Cette heure n'est pas proposee par le calendrier."}), 400
        if not provider_id:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404
        if not assert_slot_available(provider_id, parsed_date, start_time_label):
            return jsonify({"success": False, "message": "Cette date et cette heure ne sont pas disponibles."}), 409

        try:
            if amount in (None, ""):
                if payment_option == "partial":
                    amount_value = round(float(service.price) * DEFAULT_ADVANCE_RATIO, 2)
                else:
                    amount_value = float(service.price)
            else:
                amount_value = float(amount)
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "amount doit etre numerique."}), 400

        if amount_value <= 0:
            return jsonify({"success": False, "message": "amount doit etre superieur a zero."}), 400
        if amount_value > float(service.price):
            return jsonify({"success": False, "message": "Le montant ne peut pas depasser le prix du service."}), 400

        reservation_datetime = date_value
        if parsed_date and start_time_label:
            reservation_datetime = f"{parsed_date.isoformat()} {start_time_label}"

        reservation = Reservation(
            client_id=request.user_id,
            service_id=service_id,
            date=reservation_datetime,
            location=location or service.city,
            amount=amount_value,
            notes=notes,
            details=details,
            payment_status="UNPAID",
            payment_option=payment_option,
        )
        db.session.add(reservation)
        db.session.flush()

        client = User.query.get(request.user_id)
        reserve_calendar_slot(provider_id, reservation, parsed_date, start_time_label)
        create_reservation_notification(provider_id, reservation, service, client, parsed_date, start_time_label)
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Reservation effectuee avec succes.",
                "reservation": serialize_reservation(reservation),
            }
        ), 201

    @app.post("/api/appointments")
    @auth_required(allowed_roles={"client"})
    def create_appointment():
        payload = request.get_json(silent=True) or {}
        service_id = payload.get("service_id")
        slot_date = parse_date_value(payload.get("date"))
        start_time_label = str(payload.get("start_time") or "").strip()
        end_time_label = str(payload.get("end_time") or plus_one_hour(start_time_label)).strip()
        message = (payload.get("message") or "").strip() or None

        if not service_id or not slot_date or not parse_time_value(start_time_label):
            return jsonify({"success": False, "message": "service_id, date et start_time sont requis."}), 400

        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        provider_id = get_service_provider_id(service)
        if not provider_id:
            return jsonify({"success": False, "message": "Prestataire introuvable."}), 404
        if not assert_slot_available(provider_id, slot_date, start_time_label) or accepted_appointment_exists(provider_id, slot_date, start_time_label):
            return jsonify({"success": False, "message": "Cette date et cette heure ne sont pas disponibles."}), 409

        appointment = Appointment(
            client_id=request.user_id,
            provider_id=provider_id,
            service_id=service.id,
            date=slot_date,
            start_time=start_time_label,
            end_time=end_time_label,
            message=message,
            status="pending",
        )
        db.session.add(appointment)
        db.session.flush()
        client = User.query.get(request.user_id)
        create_appointment_notification(provider_id, appointment, service, client)
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "appointment": {
                    "id": appointment.id,
                    "date": appointment.date.isoformat(),
                    "start_time": appointment.start_time,
                    "end_time": appointment.end_time,
                    "message": appointment.message,
                    "status": appointment.status,
                },
            }
        ), 201

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
        favorites = Favorite.query.filter_by(user_id=request.user_id).order_by(Favorite.created_at.desc()).all()
        services_by_id = {
            service.id: service
            for service in Service.query.filter(Service.id.in_([item.service_id for item in favorites])).all()
        } if favorites else {}
        services = [services_by_id[item.service_id] for item in favorites if item.service_id in services_by_id]
        return jsonify(
            {
                "success": True,
                "favorites": [
                    {
                        "favorite_id": item.id,
                        "service_id": item.service_id,
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
        service_id = payload.get("service_id")

        if not service_id:
            return jsonify({"success": False, "message": "service_id est requis."}), 400

        service = Service.query.get(service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        existing = Favorite.query.filter_by(user_id=request.user_id, service_id=service.id).first()
        if existing:
            return jsonify(
                {
                    "success": True,
                    "message": "Deja en favoris.",
                    "favorite": {"id": existing.id, "service_id": service.id},
                }
            )

        favorite = Favorite(user_id=request.user_id, service_id=service.id)
        db.session.add(favorite)
        db.session.commit()
        return jsonify({"success": True, "favorite": {"id": favorite.id, "service_id": service.id}}), 201

    @app.delete("/api/favorites/<int:favorite_id>")
    @auth_required(allowed_roles={"client"})
    def remove_favorite(favorite_id):
        favorite = Favorite.query.filter_by(id=favorite_id, user_id=request.user_id).first()
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
        room = build_chat_room(request.user_id, receiver_id)
        socket_payload = {
            "room": room,
            "message": serialize_message(message),
            "client_id": request.user_id,
            "provider_id": int(receiver_id),
        }
        socketio.emit("receive_message", socket_payload, room=room)
        emit_provider_chat_update(receiver_id, request.user_id)
        return jsonify({"success": True, "message": serialize_message(message), "messagePayload": socket_payload}), 201

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

        mark_reservation_paid(reservation)
        db.session.commit()
        return jsonify({"success": True, "reservation": serialize_reservation(reservation), "message": "Paiement simule avec succes."})

    @app.post("/api/reservations/<int:reservation_id>/payment/session")
    @auth_required(allowed_roles={"client"})
    def create_reservation_payment_session(reservation_id):
        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        service = Service.query.get(reservation.service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        if not is_stripe_configured():
            return jsonify({"success": False, "message": "Stripe n'est pas configure. Ajoutez les cles Stripe dans backend/.env."}), 503

        try:
            session = create_checkout_session(reservation, service)
        except RuntimeError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        reservation.stripe_session_id = session.get("id")
        reservation.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "checkout_url": session.get("url"),
                "session_id": session.get("id"),
                "reservation": serialize_reservation(reservation),
            }
        )

    @app.post("/api/reservations/<int:reservation_id>/payment/intent")
    @auth_required(allowed_roles={"client"})
    def create_reservation_payment_intent(reservation_id):
        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        service = Service.query.get(reservation.service_id)
        if not service:
            return jsonify({"success": False, "message": "Service introuvable."}), 404

        if not is_stripe_configured():
            return jsonify({"success": False, "message": "Stripe n'est pas configure. Ajoutez les cles Stripe dans backend/.env."}), 503

        try:
            payment_intent = create_payment_intent(reservation, service)
        except RuntimeError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        reservation.stripe_payment_intent_id = payment_intent.get("id")
        reservation.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "payment_intent_id": payment_intent.get("id"),
                "client_secret": payment_intent.get("client_secret"),
                "publishable_key": get_stripe_publishable_key(),
                "reservation": serialize_reservation(reservation),
            }
        )

    @app.get("/api/payments/confirm")
    @auth_required(allowed_roles={"client"})
    def confirm_payment():
        session_id = (request.args.get("session_id") or "").strip()
        if not session_id:
            return jsonify({"success": False, "message": "session_id est requis."}), 400

        try:
            reservation = confirm_checkout_session(session_id)
        except RuntimeError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        if reservation.client_id != request.user_id:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        return jsonify(
            {
                "success": True,
                "reservation": serialize_reservation(reservation),
                "message": "Paiement confirme avec succes." if reservation.payment_status == "PAID" else "Paiement non finalise.",
            }
        )

    @app.post("/api/reservations/<int:reservation_id>/payment/confirm-intent")
    @auth_required(allowed_roles={"client"})
    def confirm_reservation_payment_intent(reservation_id):
        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        payload = request.get_json(silent=True) or {}
        payment_intent_id = str(payload.get("payment_intent_id") or reservation.stripe_payment_intent_id or "").strip()
        if not payment_intent_id:
            return jsonify({"success": False, "message": "payment_intent_id est requis."}), 400

        try:
            confirmed_reservation, payment_intent = confirm_payment_intent(payment_intent_id)
        except RuntimeError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        if confirmed_reservation.client_id != request.user_id or confirmed_reservation.id != reservation_id:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404

        return jsonify(
            {
                "success": True,
                "reservation": serialize_reservation(confirmed_reservation),
                "payment_status": payment_intent.get("status"),
                "message": "Paiement confirme avec succes." if confirmed_reservation.payment_status == "PAID" else "Paiement non finalise.",
            }
        )

    @app.post("/api/reservations/<int:reservation_id>/sign")
    @auth_required(allowed_roles={"client"})
    def sign_reservation_contract(reservation_id):
        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404
        if normalize_payment_status(reservation.payment_status) != "PAID":
            return jsonify({"success": False, "message": "Le contrat peut etre signe apres le paiement."}), 409

        payload = request.get_json(silent=True) or {}
        signature_data = (payload.get("signature_data") or "").strip()
        if not signature_data:
            return jsonify({"success": False, "message": "signature_data est requis."}), 400

        reservation.signature_data = signature_data
        reservation.signed_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()
        generate_reservation_documents(reservation)
        db.session.commit()
        return jsonify(
            {
                "success": True,
                "reservation": serialize_reservation(reservation),
                "message": "Signature enregistree avec succes.",
            }
        )

    @app.post("/api/reservations/<int:reservation_id>/signature-link")
    @auth_required(allowed_roles={"client"})
    def create_reservation_signature_link(reservation_id):
        reservation = Reservation.query.filter_by(id=reservation_id, client_id=request.user_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404
        if normalize_payment_status(reservation.payment_status) != "PAID":
            return jsonify({"success": False, "message": "Le contrat peut etre signe apres le paiement."}), 409
        if reservation.signature_data:
            return jsonify({"success": False, "message": "Ce contrat est deja signe."}), 409

        token = make_signature_token(reservation.id, reservation.client_id, expires_minutes=30)
        return jsonify({"success": True, "token": token})

    @app.get("/api/public/signature-session")
    def get_public_signature_session():
        token = (request.args.get("token") or "").strip()
        try:
            reservation_id, client_id = decode_signature_token(token)
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        reservation = Reservation.query.filter_by(id=reservation_id, client_id=client_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404
        if normalize_payment_status(reservation.payment_status) != "PAID":
            return jsonify({"success": False, "message": "Le contrat ne peut pas etre signe pour le moment."}), 409

        return jsonify({"success": True, "reservation": serialize_reservation(reservation)})

    @app.post("/api/public/signature-session/sign")
    def sign_public_signature_session():
        payload = request.get_json(silent=True) or {}
        token = str(payload.get("token") or "").strip()
        signature_data = str(payload.get("signature_data") or "").strip()
        if not signature_data:
            return jsonify({"success": False, "message": "signature_data est requis."}), 400

        try:
            reservation_id, client_id = decode_signature_token(token)
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400

        reservation = Reservation.query.filter_by(id=reservation_id, client_id=client_id).first()
        if not reservation:
            return jsonify({"success": False, "message": "Reservation introuvable."}), 404
        if normalize_payment_status(reservation.payment_status) != "PAID":
            return jsonify({"success": False, "message": "Le contrat ne peut pas etre signe pour le moment."}), 409
        if reservation.signature_data:
            return jsonify({"success": False, "message": "Ce contrat est deja signe."}), 409

        reservation.signature_data = signature_data
        reservation.signed_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()
        generate_reservation_documents(reservation)
        db.session.commit()
        return jsonify({"success": True, "message": "Signature enregistree avec succes."})

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
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
