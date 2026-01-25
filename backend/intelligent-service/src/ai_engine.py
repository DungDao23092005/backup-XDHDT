import google.generativeai as genai
import json
from .config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)

model = genai.GenerativeModel(
    'gemini-1.5-flash',
    generation_config={"response_mime_type": "application/json"}
)

class AIEngine:
    
    @staticmethod
    async def refine_text(text: str, text_type: str) -> dict:
        prompt = f"""
        Act as an Academic Editor. Review this {text_type}: "{text}"
        Task: Fix grammar, improve academic tone, extract 3 keywords.
        Output JSON: {{ "refined_text": "...", "changes": ["fixed error 1", ...], "keywords": ["..."] }}
        """
        response = model.generate_content(prompt)
        return json.loads(response.text)

    @staticmethod
    async def analyze_abstract(text: str) -> dict:
        prompt = f"""
        Act as a PC Member. Analyze this abstract: "{text}"
        Task: 1. Write a neutral summary (150 words). 2. Extract claims, methods, datasets.
        Output JSON: {{ "neutral_summary": "...", "key_points": {{ "claims": [], "methods": [], "datasets": [] }} }}
        """
        response = model.generate_content(prompt)
        return json.loads(response.text)

    @staticmethod
    async def match_reviewers(abstract: str, candidates: list) -> dict:
        candidates_json = json.dumps([c.model_dump() for c in candidates])
        
        prompt = f"""
        Act as a Chair. Match paper abstract to reviewers based on expertise.
        Abstract: "{abstract}"
        Reviewers: {candidates_json}
        Task: Score relevance (0-100) and explain why.
        Output JSON: {{ "matches": [ {{ "reviewer_id": 1, "name": "A", "score": 90, "reason": "..." }} ] }}
        """
        response = model.generate_content(prompt)
        return json.loads(response.text)

    @staticmethod
    async def draft_email(decision: str, author: str, title: str, comments: str) -> dict:
        prompt = f"""
        Act as a Chair. Draft a formal email.
        Decision: {decision}. Author: {author}. Paper: {title}. Comments: {comments}
        Output JSON: {{ "subject": "...", "body": "..." }}
        """
        response = model.generate_content(prompt)
        return json.loads(response.text)