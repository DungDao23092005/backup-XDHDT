from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .database import get_db
from . import schemas, ai_engine, models
import time
from typing import List
import json

router = APIRouter()

# Hàm log chạy ngầm (Background Task)
def log_to_db(db: Session, user_id: int, role: str, feature: str, prompt: str, output: dict, duration: float):
    try:
        log = models.AILog(
            user_id=user_id,
            user_role=role,
            feature_type=feature,
            model_name="gemini-1.5-flash",
            input_prompt=prompt[:1000], 
            output_response=output,
            processing_time=duration
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Error logging AI usage: {e}")

# API 1: Author Refine
@router.post("/author/refine", response_model=schemas.RefineResponse)
async def refine_text(req: schemas.RefineRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    start = time.time()
    try:
        result = await ai_engine.AIEngine.refine_text(req.text, req.type)
        duration = time.time() - start
        
        bg_tasks.add_task(log_to_db, db, 1, "AUTHOR", "REFINE", req.text, result, duration)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API 2: Reviewer Analyze
@router.post("/reviewer/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_abstract(req: schemas.AnalyzeRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    start = time.time()
    try:
        result = await ai_engine.AIEngine.analyze_abstract(req.abstract_text)
        duration = time.time() - start
        
        bg_tasks.add_task(log_to_db, db, 2, "REVIEWER", "ANALYZE", req.abstract_text, result, duration)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API 3: Chair Match
@router.post("/chair/match", response_model=List[schemas.MatchResult])
async def match_reviewers(req: schemas.MatchRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    start = time.time()
    try:
        result_json = await ai_engine.AIEngine.match_reviewers(req.paper_abstract, req.candidates)
        duration = time.time() - start
        
        bg_tasks.add_task(log_to_db, db, 3, "CHAIR", "MATCHING", req.paper_abstract, result_json, duration)
        
        return result_json["matches"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API 4: Chair Email Draft
@router.post("/chair/email-draft", response_model=schemas.EmailDraftResponse)
async def draft_email(req: schemas.EmailDraftRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    start = time.time()
    try:
        result = await ai_engine.AIEngine.draft_email(req.decision, req.author_name, req.paper_title, req.comments)
        duration = time.time() - start
        
        bg_tasks.add_task(log_to_db, db, 3, "CHAIR", "EMAIL_DRAFT", str(req.model_dump()), result, duration)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))