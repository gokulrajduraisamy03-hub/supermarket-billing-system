# SuperMart – Billing & Invoice Management System

## Project Overview
SuperMart is a full-stack supermarket billing and invoice management application built using React.js and Django REST Framework.

It helps supermarket owners manage products, track stock, generate customer bills, calculate GST, and maintain invoice records through a simple and responsive interface.

## Technologies Used
- **Frontend:** React.js, HTML, CSS, JavaScript
- **Backend:** Python, Django, Django REST Framework
- **Database:** SQLite
- **API Testing:** Postman
- **Authentication:** Token Authentication

## Features
- User Login and Logout
- Dashboard with Sales and Product Statistics
- Add, Edit, and Delete Products
- Product Stock Management
- Low Stock Alerts
- Billing and GST Calculation
- Automatic Stock Reduction
- Invoice Generation and Printing
- Invoice History and Search
- Date Filtering
- Responsive User Interface

## Project Structure
```text
supermarket-billing/
├── backend/
│   ├── config/
│   ├── billing/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

## Local Setup

### Backend Setup

```bash
cd backend
python -m venv env
```

Activate the virtual environment:

**Windows PowerShell:**
```powershell
.\env\Scripts\Activate.ps1
```

Install dependencies and run migrations:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Configure the backend `.env` file with your Django secret key and development settings.

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure the frontend `.env` file:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## Project Status
Core features and functional testing completed successfully. Production deployment is pending.

## Security Note
Environment files containing secret keys or sensitive configuration should never be uploaded to GitHub.
