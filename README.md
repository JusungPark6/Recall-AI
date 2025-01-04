# Recall AI

A reading retention tool that helps users better understand and remember their study materials.

## Features

- PDF document upload and processing
- AI-powered question answering
- Interactive quiz generation
- Progress tracking
- Real-time feedback

## Setup

### Prerequisites

- Node.js
- Python 3.10+
- pip

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JusungPark6/recall-ai.git
cd recall-ai
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Start the development server:
Frontend:
```bash
cd ..
npm run dev
```
Backend:
```bash
cd backend
python main.py
```
