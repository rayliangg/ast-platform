# ast platform

Web app: parse source to an AST and explore structure in a tree view (single files or folders).

## Languages

Python, JavaScript, TypeScript, Go, Rust, Java, C++, C, C#, PHP, Kotlin, Swift, Dart, Ruby, R.

## ⚡ Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`

