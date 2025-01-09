# Recall AI

Recall AI is an AI-powered reading retention tool designed to enhance users' understanding and memory of study materials. The application uses cutting-edge AI technologies to generate quizzes and provide interactive question-answering functionality, helping users actively engage with and retain information. 

## Overview

Growing up, many of us participated in reading comprehension tests that helped develop literacy and understanding. Recall AI brings this concept into the modern age by integrating active recall techniques into everyday study workflows. By leveraging vector databases and Large Language Models (LLMs), Recall AI enables users to:

1. **Upload documents** for processing and embedding.
2. **Generate AI-powered quizzes** to test comprehension.
3. **Ask questions** about the document for detailed clarification.
4. **Iteratively improve understanding** with new quizzes based on the user's progress.

This tool is ideal for students, professionals, or anyone looking to retain knowledge more effectively.

---

## Key Features

### 1. **AI-Powered Quiz Generation**
- Automatically generates quizzes based on uploaded content.
- Encourages active recall to deepen understanding.
- Generates unique quizzes on demand, ensuring dynamic engagement.

### 2. **Interactive Question-Answering**
- Users can ask custom questions about the uploaded material.
- The LLM integrates user prompts with document embeddings from the vector database to deliver comprehensive answers.

### 3. **Document Embedding with Vector Database**
- Uploaded documents are embedded into a vector database for efficient querying and retrieval.
- Ensures contextual relevance in both quizzes and Q&A responses.

### 4. **Dynamic and Adaptive Learning**
- Users can test their knowledge, receive feedback, and generate new quizzes to track and improve retention.
- Promotes iterative learning through customized interactions with the material.

---

## Setup

### Prerequisites

- **Frontend**: Node.js (v16+)
- **Backend**: Python 3.9 and pip
- **Database**: A vector database

### Installation and Usage

1. **Clone the repository**:
   ```bash
   git clone https://github.com/JusungPark6/recall-ai.git
   cd recall-ai
  ```
2. **Frontend Setup**:
  ```bash
  npm install
  ```
3. **Backend Setup**:
  ```bash
  cd api
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```
4. **Start the Development Servers**:

Frontend:
```bash
cd ..
npm run dev
```
Backend:
Copy code
cd api
uvicorn main:app --reload
```
Access the Application: Open your browser and navigate to http://localhost:3000 to use Recall AI.
