from fastapi import FastAPI, UploadFile, File, HTTPException
import httpx
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import tempfile
import ollama
# import streamlit as st
import chromadb
from chromadb.utils.embedding_functions.ollama_embedding_function import OllamaEmbeddingFunction
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import string
import asyncio
from sat_examples import sat_question_examples
import json

class PromptResponse(BaseModel):
    status: str
    response: str
    context: str
    
class PromptRequest(BaseModel):
    prompt: str

class QuizResponse(BaseModel):
    status: str
    question_type: str
    question: str
    choices: list[str]
    answer: str
    explanation: str

class CustomOllamaEmbeddingFunction(OllamaEmbeddingFunction):
    def __init__(self, url: str, model_name: str):
        self.url = url
        self.model_name = model_name
    def __call__(self, texts):
        import requests
        import numpy as np

        embeddings = []
        for text in texts:
            try:
                print("Making request to Ollama API...")
                response = requests.post(
                    f"{self.url}/api/embeddings",
                    json={"model": self.model_name, "prompt": text}
                )
                print(f"Response status code: {response.status_code}")
                print(f"Raw response text: {response.text[:100]}...")  # Print first 100 chars
                
                if response.status_code != 200:
                    raise RuntimeError(f"Ollama API returned status code {response.status_code}")
                
                response_json = response.json()
                print(f"Parsed JSON keys: {response_json.keys()}")
                
                embedding = response_json.get('embedding')
                if not embedding:
                    raise ValueError("No embedding found in response")
                
                print(f"Embedding length: {len(embedding)}")
                embeddings.append(embedding)
                
            except Exception as e:
                print(f"Error processing text: {str(e)}")
                print(f"Text being processed: {text[:100]}...")  # Print first 100 chars
                raise
        
        return embeddings

system_prompt = """
You are an AI assistant tasked with providing detailed answers based solely on the given context. Your goal is to analyze the information provided and provide a detailed and comprehensive response to the prompt.

Context will be passed as "Context:" and the user's prompt will be passed as "Prompt:"

1. Thoroughly analyze the context, identifying key information and concepts relevant to the prompt.
2. Organize your thoughts and plan your response in a way that is easy to understand and follow.
3. Formulate a detailed and comprehensive response to the prompt and directly answer the prompt and covers all the aspects of the prompt.
4. If the context does not provide enough information to answer the prompt, state that you cannot answer the prompt.

Format your response as follows:
1. Use clear, concise language.
2. Organize your answers into paragraphs for readability.
3. Use bullet points and numbered lists where appropriate to break down complex information.
4. If relevant, include headings and subheadings to organize the information.
5. Ensure proper grammar, punctuation, and spelling throughout your response.
6. Format it in non-markdown format.
"""

quiz_prompt = """
You are an AI assistant tasked with generating SAT-style reading comprehension questions based on the given context.

Context will be passed as "Context:"

Here's an example of the SAT-style question format to follow:
{sat_examples}

Guidelines:
1. Create questions that test deep understanding and analysis, not just fact recall
2. Include 4 multiple-choice options for each question if multiple choice, or True/False if true/false
3. Questions should focus on:
   - Main idea and purpose
   - Supporting details
   - Inference and interpretation
   - Author's tone and style
   - Evidence-based conclusions

Format your response as a JSON object with the following structure for each question:
{
    "question_type": "mc",
    "question": "The question text",
    "choices": ["choice", "choice", "choice", "choice"],
    "answer": "the correct choice",
    "explanation": "detailed explanation"
}
or
{
    "question_type": "truefalse",
    "question": "The question text",
    "choices": ["True", "False"],
    "answer": "correct answer",
    "explanation": "detailed explanation"
}
"""

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_origins=["https://recall-ai-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "API is running"
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        normalized_filename = file.filename.translate(
            str.maketrans(string.punctuation, "_" * len(string.punctuation))
        )
        all_splits = process_file(file)
        add_documents_to_vector_collection(all_splits, normalized_filename)
        return {
            "status": "success",
            "message": "File processed successfully",
            "splits": len(all_splits)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "status": "error",
            "message": str(e)
            }
        )

@app.post("/prompt")
async def process_prompt(request: PromptRequest):
    try:
        query_results = query_collection(request.prompt)
        
        if not query_results or not query_results.get("documents") or len(query_results["documents"]) == 0:
            raise HTTPException(
                status_code=404,
                detail={
                    "status": "error",
                    "message": "No relevant context found for the prompt"
                }
            )
                
        context = query_results["documents"][0]
        if isinstance(context, list):
            context = " ".join(context)
        response = await call_llm_normal(context, request.prompt)
        
        return PromptResponse(
            status="success",
            response=response,
            context=context
        )
    except Exception as e:
        return PromptResponse(
            status="Error",
            response=f"Error processing prompt: {str(e)}",
            context=""
        )

def process_file(uploaded_file: UploadFile) -> list[Document]:
    temp_file = tempfile.NamedTemporaryFile("wb", suffix=".pdf", delete=False)
    temp_file.write(uploaded_file.file.read())
    
    loader = PyMuPDFLoader(temp_file.name)
    docs = loader.load()
    os.unlink(temp_file.name)
    
    # Split the documents into chunks so digestible by embedding model
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=400, # how many characters to split
        chunk_overlap=300, # how many characters to overlap, we want as much semantic meaning as possible
        separators=["\n\n", "\n", ".", "?", "!", " ", ""]
    )
    return text_splitter.split_documents(docs)

def get_vector_collection() -> chromadb.Collection:
    ollama_ef = CustomOllamaEmbeddingFunction(
        url="http://localhost:11434",
        model_name="nomic-embed-text"
    )

    chroma_client = chromadb.PersistentClient(path="./rag-chroma")
    return chroma_client.get_or_create_collection(
        name="rag_app",
        embedding_function=ollama_ef,
        metadata={"hnsw:space": "cosine"} # cosine similarity is the best for this use case
    )

def add_documents_to_vector_collection(all_splits: list[Document], file_name: str):
    try:
        vector_collection = get_vector_collection()
        existing_ids = vector_collection.get()["ids"]
        if existing_ids:
            # Delete all existing documents if there are any
            vector_collection.delete(ids=existing_ids) # clear the prior collection
        documents, metadata, ids = [], [], []
        
        for idx, split in enumerate(all_splits):
            
            documents.append(split.page_content)
            metadata.append(split.metadata)
            ids.append(f"{file_name}_{idx}")
        try:
            vector_collection.upsert(
                documents=documents,
                metadatas=metadata,
                ids=ids
            )
            print("Upsert completed successfully")
        except Exception as e:
            print(f"Upsert failed with error: {str(e)}")
            raise
            
    except Exception as e:
        print(f"Overall function failed with error: {str(e)}")
        raise

def query_collection(prompt: str, n_results: int = 10):
    vector_collection = get_vector_collection()
    return vector_collection.query(query_texts=[prompt], n_results=n_results)

async def call_llm_normal(context: str, prompt: str):
    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: ollama.chat(
                model="llama3.2:3b",
                stream=False,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user", 
                        "content": f"Context: {context}\n\nPrompt: {prompt}"
                    }
                ]
            )
        )
        return response['message']['content']
    except Exception as e:
        print(f"LLM call failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling LLM: {str(e)}")

@app.post("/quiz")
async def generate_quiz():
    try:
        vector_collection = get_vector_collection()
        all_docs = vector_collection.get()
        context = " ".join(all_docs['documents'][0] if all_docs['documents'] else "")
        
        if not context:
            return QuizResponse(
                status="error",
                message="No documents found to generate quiz from"
            )

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: ollama.chat(
                model="llama3.2:3b",
                stream=False,
                messages=[
                    {
                        "role": "system",
                        "content": quiz_prompt
                    },
                    {
                        "role": "user", 
                        "content": f"Context: {context}\n\nGenerate at least 3 SAT-style reading comprehension questions based on the context, and more if necessary to cover all the important contents and aspects of the file. Return ONLY valid JSON in a list of objects."
                    }
                ]
            )
        )
        
        content = response['message']['content']
        questions = json.loads(content)
        return_object = [
            QuizResponse(
                status="success",
                question_type=entry["question_type"],
                question=entry["question"],
                choices=entry["choices"],
                answer=entry["answer"],
                explanation=entry["explanation"]
            ).dict() for entry in questions
        ]
        return return_object
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": f"Error generating quiz: {str(e)}"
            }
        )
            
    except Exception as e:
        error_msg = f"Error generating quiz: {str(e)}"
        return []