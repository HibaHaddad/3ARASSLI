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
6. Create database `3arrasli_db` in phpMyAdmin (or set your own name in env vars below).
7. (Optional) set env vars:
   - `DB_HOST=127.0.0.1`
   - `DB_PORT=3306`
   - `DB_USER=root`
   - `DB_PASSWORD=`
   - `DB_NAME=3arrasli_db`
   Or set one full URI with:
   - `DATABASE_URL=mysql+pymysql://root:@127.0.0.1:3306/3arrasli_db?charset=utf8mb4`
8. `python app.py`

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
