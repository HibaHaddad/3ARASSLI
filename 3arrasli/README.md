# 3arrasli.tn

Wedding services platform with:
- React frontend (Home + Login + Sign Up)
- Flask backend (auth API + SQLite with SQLAlchemy)

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
5. `python app.py`

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
