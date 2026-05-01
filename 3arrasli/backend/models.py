from datetime import date, datetime

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column("name", db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="client")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    approval_status = db.Column(db.String(30), nullable=False, default="approved")
    phone = db.Column(db.String(40), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    category = db.Column(db.String(120), nullable=True)
    instagram = db.Column(db.String(160), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    profile_photo = db.Column(db.Text, nullable=True)
    cover_photo = db.Column(db.Text, nullable=True)
    reset_code = db.Column(db.String(12), nullable=True)
    reset_code_expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(120), nullable=False)
    image = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(40), nullable=False, default="Actif")
    is_visible = db.Column(db.Boolean, nullable=False, default=True)
    city = db.Column(db.String(120), nullable=True)
    type = db.Column(db.String(120), nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, nullable=False, default=4.5)
    prestataire_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    images = db.relationship(
        "ServiceImage",
        backref="service",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="ServiceImage.id.asc()",
    )


class ServiceImage(db.Model):
    __tablename__ = "service_images"

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False, index=True)
    image_path = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    date = db.Column(db.String(40), nullable=False)
    location = db.Column(db.String(160), nullable=True)
    amount = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    details = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(40), nullable=False, default="pending")
    payment_status = db.Column(db.String(40), nullable=False, default="UNPAID")
    payment_option = db.Column(db.String(40), nullable=True)
    stripe_session_id = db.Column(db.String(255), nullable=True)
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True)
    invoice_path = db.Column(db.Text, nullable=True)
    contract_path = db.Column(db.Text, nullable=True)
    signature_data = db.Column(db.Text, nullable=True)
    signed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Contract(db.Model):
    __tablename__ = "contracts"

    id = db.Column(db.Integer, primary_key=True)
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=False, index=True)
    payment_id = db.Column(db.String(255), nullable=True)
    invoice_id = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(60), nullable=False, default="pending_provider_signature")
    provider_signature = db.Column(db.Text, nullable=True)
    provider_signed_at = db.Column(db.DateTime, nullable=True)
    provider_signature_ip = db.Column(db.String(80), nullable=True)
    client_signature = db.Column(db.Text, nullable=True)
    client_signed_at = db.Column(db.DateTime, nullable=True)
    client_signature_ip = db.Column(db.String(80), nullable=True)
    refusal_reason = db.Column(db.Text, nullable=True)
    final_contract_path = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "service_id", name="uq_user_service_favorite"),
    )


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, nullable=False, default=False)


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(60), nullable=False, default="reservation")
    title = db.Column(db.String(180), nullable=False)
    message = db.Column(db.Text, nullable=False)
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=True, index=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=True, index=True)
    pack_id = db.Column(db.Integer, db.ForeignKey("packs.id"), nullable=True, index=True)
    pack_item_id = db.Column(db.Integer, db.ForeignKey("pack_items.id"), nullable=True, index=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class PlannerItem(db.Model):
    __tablename__ = "planner_items"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(40), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(40), nullable=False, default="published")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint("service_id", "client_id", name="uq_service_client_review"),
    )


class Pack(db.Model):
    __tablename__ = "packs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False, default=0)
    expires_at = db.Column(db.Date, nullable=True, index=True)
    status = db.Column(db.String(40), nullable=False, default="pending")
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    items = db.relationship(
        "PackItem",
        backref="pack",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="PackItem.id.asc()",
    )


class PackItem(db.Model):
    __tablename__ = "pack_items"

    id = db.Column(db.Integer, primary_key=True)
    pack_id = db.Column(db.Integer, db.ForeignKey("packs.id"), nullable=False, index=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=True, index=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    service_category = db.Column(db.String(120), nullable=False)
    response_status = db.Column(db.String(40), nullable=False, default="pending")
    invited_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
class ProviderAvailabilitySlot(db.Model):
    __tablename__ = "provider_availability_slots"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True, default=date.today)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="free")
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "provider_id",
            "date",
            "start_time",
            name="uq_provider_availability_date_time",
        ),
    )


class ProviderCalendarBlock(db.Model):
    __tablename__ = "provider_calendar_blocks"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True, default=date.today)
    start_time = db.Column(db.String(5), nullable=False)
    end_time = db.Column(db.String(5), nullable=False)
    type = db.Column(db.String(20), nullable=False, default="occupied")
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "provider_id",
            "date",
            "start_time",
            "type",
            name="uq_provider_calendar_block_slot",
        ),
    )
