# 3arrasli.tn

Wedding services platform with:
- React frontend (Home + Login + Sign Up)
- Flask backend (auth API + MySQL/XAMPP with SQLAlchemy)

## Project structure

- `frontend/src/App.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/services/api.js`
- `backend/app.py`
- `backend/models.py`
- `backend/extensions.py`

## Run backend

1. `cd backend`
2. `python -m venv .venv`
3. `.venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. Start XAMPP and make sure `Apache` and `MySQL` are running.
6. Copy `backend/.env.example` to `backend/.env`
7. Fill `backend/.env` with your database and SMTP values
8. `python app.py`

Example `backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ma_base

FRONTEND_BASE_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SENDER=your-email@gmail.com
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Notes:
- `SMTP_PASSWORD` should be an app password if you use Gmail.
- The backend now loads variables automatically from `backend/.env`.
- You can still override them with system environment variables if needed.

Backend URLs:
- `GET http://localhost:5000/api/health`
- `POST http://localhost:5000/register`
- `POST http://localhost:5000/login`

## Run frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

Frontend pages:
- `http://localhost:5173/` (Home)
- `http://localhost:5173/login`
- `http://localhost:5173/signup`
