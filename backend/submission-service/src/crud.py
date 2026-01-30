from sqlalchemy.orm import Session, selectinload
import os
from sqlalchemy import desc
from datetime import datetime
from . import models, schemas, exceptions
import requests
from pypdf import PdfReader
from .config import settings


# Nghiệp vụ tạo bài báo mới
def create_paper(
    db: Session, 
    paper_data: schemas.PaperCreate, 
    submitter_id: int
) -> models.Paper:
    
    validate_submission_window(paper_data.conference_id)

    existing_paper = db.query(models.Paper).filter(
        models.Paper.submitter_id == submitter_id,
        models.Paper.conference_id == paper_data.conference_id,
        models.Paper.title == paper_data.title,
        
        models.Paper.status.notin_([
            models.PaperStatus.WITHDRAWN, 
            models.PaperStatus.REJECTED
        ])
    ).first()

    if existing_paper:
        raise exceptions.BusinessRuleError(
            f"Duplicate submission: You already have an active paper titled '{paper_data.title}' in this conference."
        )
    

    # Tạo bài báo
    db_paper = models.Paper(
        title=paper_data.title,
        abstract=paper_data.abstract,
        keywords=paper_data.keywords,
        conference_id=paper_data.conference_id,
        track_id=paper_data.track_id,
        submitter_id=submitter_id,
        is_blind_mode=paper_data.is_blind_mode,
        status=models.PaperStatus.SUBMITTED,
        submitted_at=datetime.utcnow()
    )
    db.add(db_paper)
    db.flush() # Để lấy ID

    # 2. Lưu danh sách đồng tác giả
    if paper_data.authors:
        db_authors = [
            models.PaperAuthor(
                paper_id=db_paper.id,
                full_name=author.full_name,
                email=author.email,
                organization=author.organization,
                is_corresponding=author.is_corresponding,
                user_id=author.user_id
            )
            for author in paper_data.authors
        ]
        db.add_all(db_authors)

    # 3. Lưu danh sách chủ đề
    if paper_data.topics:
        db_topics = [
            models.PaperTopic(
                paper_id=db_paper.id,
                topic_id=t.topic_id
            )
            for t in paper_data.topics
        ]
        db.add_all(db_topics)

    return db_paper
    
# Tạo phiên bản đầu tiên
def create_new_paper_version(
    db: Session, 
    paper_id: int, 
    file_url: str,
    is_blind_mode: bool,
    is_camera_ready: bool = False
)-> models.PaperVersion:
    
    # Lấy version mới nhất
    latest = (
        db.query(models.PaperVersion)
        .filter(models.PaperVersion.paper_id == paper_id)
        .order_by(desc(models.PaperVersion.version_number))
        .with_for_update()
        .first()
    )
    version_number = 1 if not latest else latest.version_number + 1
    
 
    db_version = models.PaperVersion(
        paper_id=paper_id,
        version_number=version_number,
        file_url=file_url,
        is_camera_ready=is_camera_ready,
        is_anonymous=is_blind_mode
    )
    db.add(db_version)
    return db_version    

# Nghiệp vụ lấy danh sách bài báo của tác giả
def get_papers_by_author(
    db: Session,
    submitter_id: int
) -> list[models.Paper]:
    return (
        db.query(models.Paper)
        .options(
            selectinload(models.Paper.authors),
            selectinload(models.Paper.topics),
            selectinload(models.Paper.versions)
        )
        .filter(models.Paper.submitter_id == submitter_id)
        .order_by(desc(models.Paper.submitted_at))
        .all()
    )

# Nghiệp vụ lấy chi tiết bài báo
def get_author_paper_detail(
    db: Session,
    paper_id: int,
    submitter_id: int
) -> models.Paper:
    
    # Tìm bài báo theo id
    paper = (
            db.query(models.Paper)
            .options(
                selectinload(models.Paper.authors),
                selectinload(models.Paper.topics),
                selectinload(models.Paper.versions)
            )
            .filter(models.Paper.id == paper_id)
            .first()
        )
    
    if not paper:
        raise exceptions.PaperNotFoundError(f"Paper with id {paper_id} not found")

    if paper.submitter_id != submitter_id:
        raise exceptions.NotAuthorizedError("You do not have permission to view this paper")

    return paper


def check_paper_ownership(db: Session, paper_id: int, submitter_id: int):
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id).first()
    if not paper:
        raise exceptions.PaperNotFoundError(f"Paper {paper_id} not found")
    
    if paper.submitter_id != submitter_id:
        raise exceptions.NotAuthorizedError("You are not the owner of this paper")
    
    return paper

def add_author(db: Session, paper_id: int, submitter_id: int, author_data: schemas.AuthorAdd):
    paper = check_paper_ownership(db, paper_id, submitter_id)
    
    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED, models.PaperStatus.WITHDRAWN]:
        raise exceptions.BusinessRuleError("Cannot add authors to a closed paper.")

    if paper.status != models.PaperStatus.REVISION_REQUIRED:
        validate_submission_window(paper.conference_id)

    exists = db.query(models.PaperAuthor).filter(
        models.PaperAuthor.paper_id == paper_id,
        models.PaperAuthor.email == author_data.email
    ).first()
    
    if exists:
        raise exceptions.BusinessRuleError(f"Author with email '{author_data.email}' already exists in this paper.")

    new_author = models.PaperAuthor(
        paper_id=paper_id,
        full_name=author_data.full_name,
        email=author_data.email,
        organization=author_data.organization,
        is_corresponding=author_data.is_corresponding,
        user_id=author_data.user_id
    )
    
    db.add(new_author)
    db.commit()
    db.refresh(new_author)
    return new_author

def remove_author(db: Session, paper_id: int, author_id: int, submitter_id: int):
    paper = check_paper_ownership(db, paper_id, submitter_id)

    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED]:
        raise exceptions.BusinessRuleError("Cannot remove authors from a closed paper.")
    
    if paper.status != models.PaperStatus.REVISION_REQUIRED:
        validate_submission_window(paper.conference_id)

    author = db.query(models.PaperAuthor).filter(
        models.PaperAuthor.id == author_id,
        models.PaperAuthor.paper_id == paper_id
    ).first()

    if not author:
        raise exceptions.AuthorNotFoundError(f"Author {author_id} not found in paper {paper_id}")

    db.delete(author)
    db.commit()
    return True




def withdraw_paper(db: Session, paper_id: int, submitter_id: int) -> models.Paper:
    
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id).first()
    
    if not paper:
        raise exceptions.PaperNotFoundError(f"Paper {paper_id} not found")
    
    if paper.submitter_id != submitter_id:
        raise exceptions.NotAuthorizedError("You are not the owner of this paper")

    validate_submission_window(paper.conference_id)

    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED]:
        raise exceptions.BusinessRuleError("Cannot withdraw a paper that has been Accepted or Rejected.")

    if paper.status == models.PaperStatus.WITHDRAWN:
        raise exceptions.BusinessRuleError("This paper is already withdrawn.")

    paper.status = models.PaperStatus.WITHDRAWN
    
    db.commit()
    db.refresh(paper)
    return paper


def update_paper_metadata(
    db: Session, 
    paper_id: int, 
    submitter_id: int, 
    update_data: schemas.PaperUpdate
) -> models.Paper:
    
    paper = check_paper_ownership(db, paper_id, submitter_id)

    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED, models.PaperStatus.WITHDRAWN]:
        raise exceptions.BusinessRuleError("Cannot edit a closed paper.")

    if paper.status != models.PaperStatus.REVISION_REQUIRED:
        validate_submission_window(paper.conference_id)
        

    if update_data.title is not None:
        if update_data.title != paper.title:
            exists = db.query(models.Paper).filter(
                models.Paper.submitter_id == submitter_id,
                models.Paper.conference_id == paper.conference_id,
                models.Paper.title == update_data.title,
                models.Paper.status.notin_([models.PaperStatus.WITHDRAWN, models.PaperStatus.REJECTED])
            ).first()
            if exists:
                raise exceptions.BusinessRuleError("Title already exists in another active submission.")
        
        paper.title = update_data.title

    if update_data.abstract is not None:
        paper.abstract = update_data.abstract
        
    if update_data.keywords is not None:
        paper.keywords = update_data.keywords

    if update_data.topics is not None:
        db.query(models.PaperTopic).filter(models.PaperTopic.paper_id == paper_id).delete()
        
        new_topics = [
            models.PaperTopic(paper_id=paper_id, topic_id=t.topic_id)
            for t in update_data.topics
        ]
        db.add_all(new_topics)

    db.commit()
    db.refresh(paper)
    return paper

def get_next_version_number(db: Session, paper_id: int) -> int:
    last_ver = (
        db.query(models.PaperVersion)
        .filter(models.PaperVersion.paper_id == paper_id)
        .order_by(desc(models.PaperVersion.version_number))
        .first()
    )
    return 1 if not last_ver else last_ver.version_number + 1

def upload_new_version(
    db: Session, 
    paper_id: int, 
    submitter_id: int, 
    file_path: str,
    version_number: int,
    is_blind_mode: bool
) -> models.PaperVersion:
    
    paper = check_paper_ownership(db, paper_id, submitter_id)
    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED, models.PaperStatus.WITHDRAWN]:
        raise exceptions.BusinessRuleError("Cannot upload a new file for a closed paper.")

    if paper.status != models.PaperStatus.REVISION_REQUIRED:
        validate_submission_window(paper.conference_id)
    
    # 2. Lưu record vào DB (Dùng version_number được truyền vào)
    new_version = models.PaperVersion(
        paper_id=paper_id,
        version_number=version_number, # Dùng số đã tính
        file_url=file_path,
        is_camera_ready=False,
        is_anonymous=is_blind_mode
    )
    db.add(new_version)

    # 3. Update Status bài báo
    if paper.status == models.PaperStatus.REVISION_REQUIRED:
        paper.status = models.PaperStatus.SUBMITTED
    paper.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(new_version)
    return new_version


# --- HÀM HELPER: KIỂM TRA DEADLINE ---
def validate_submission_window(conference_id: int):

    try:
        url = f"{settings.CONFERENCE_SERVICE_URL}/conferences/{conference_id}"
        resp = requests.get(url, timeout=5)
        
        if resp.status_code == 404:
            raise exceptions.BusinessRuleError(f"Conference {conference_id} not found.")
        
        if resp.status_code != 200:
            print(f"Error calling Conference Service: {resp.text}")
            raise Exception("Cannot connect to Conference Service")
            
        conf_info = schemas.ConferenceExternalInfo(**resp.json())
        
        if conf_info.submission_deadline:
            now = datetime.utcnow()
            deadline = conf_info.submission_deadline.replace(tzinfo=None) 
            if now > deadline:
                raise exceptions.DeadlineExceededError(
                    f"Submission deadline passed. The deadline was {deadline}."
                )
        return conf_info
    
    except requests.RequestException:
        raise Exception("Failed to validate conference deadline.")
    


def update_paper_decision(
    db: Session, 
    paper_id: int, 
    decision_data: schemas.PaperDecision
) -> models.Paper:
    
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id).first()
    
    if not paper:
        raise exceptions.PaperNotFoundError(f"Paper {paper_id} not found")

    if paper.status == models.PaperStatus.WITHDRAWN:
        raise exceptions.BusinessRuleError("Cannot change status of a withdrawn paper.")
    
    paper.status = decision_data.status
    
    if decision_data.note is not None:
        paper.decision_note = decision_data.note
    
    db.commit()
    db.refresh(paper)
    return paper

def submit_camera_ready(
    db: Session, 
    paper_id: int, 
    submitter_id: int, 
    file_path: str
) -> models.PaperVersion:
    
    paper = db.query(models.Paper).filter(models.Paper.id == paper_id).first()
    if not paper:
        raise exceptions.PaperNotFoundError(f"Paper {paper_id} not found")
    
    if paper.submitter_id != submitter_id:
        raise exceptions.BusinessRuleError("You are not the owner of this paper.")

    if paper.status != models.PaperStatus.ACCEPTED:
        raise exceptions.BusinessRuleError(
            f"Cannot submit Camera-Ready version. Paper status is '{paper.status}', but must be 'ACCEPTED'."
        )

    try:
        reader = PdfReader(file_path)
        num_pages = len(reader.pages)
        

        MAX_PAGES = 15
        if num_pages > MAX_PAGES:
            os.remove(file_path)
            raise exceptions.BusinessRuleError(f"File exceeds page limit. Max is {MAX_PAGES}, got {num_pages}.")
            
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise exceptions.BusinessRuleError(f"Invalid PDF file. Details: {str(e)}")

    next_ver = get_next_version_number(db, paper_id)

    new_version = models.PaperVersion(
        paper_id=paper_id,
        version_number=next_ver,
        file_url=file_path,
        is_camera_ready=True,  
        is_anonymous=False 
    )
    
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    return new_version

def check_spelling_with_ai(text: str):
    payload = {
        "text": text,
        "type": "ABSTRACT"
    }
    try:
        response = requests.post(f"{settings.INTELLIGENT_URL}/author/refine", json=payload, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"AI Service unavailable: {e}")
        return None
    
def send_notification_email(to_email: str, subject: str, content: str):
    payload = {
        "email": to_email,
        "subject": subject,
        "content": content
    }
    
    try:
        requests.post(settings.NOTIFICATION_URL, json=payload, timeout=5)
    except Exception as e:
        print(f"Failed to send email notification: {e}")

def update_author(db: Session, paper_id: int, author_id: int, submitter_id: int, author_data: schemas.AuthorUpdate):
    paper = check_paper_ownership(db, paper_id, submitter_id)

    if paper.status in [models.PaperStatus.ACCEPTED, models.PaperStatus.REJECTED, models.PaperStatus.WITHDRAWN]:
        raise exceptions.BusinessRuleError("Cannot edit authors of a closed paper.")

    if paper.status != models.PaperStatus.REVISION_REQUIRED:
        validate_submission_window(paper.conference_id)

    author = db.query(models.PaperAuthor).filter(
        models.PaperAuthor.id == author_id,
        models.PaperAuthor.paper_id == paper_id
    ).first()

    if not author:
        raise exceptions.AuthorNotFoundError(f"Author {author_id} not found in paper {paper_id}")

    # email duplicate check nếu đổi email
    if author_data.email and author_data.email != author.email:
        exists = db.query(models.PaperAuthor).filter(
            models.PaperAuthor.paper_id == paper_id,
            models.PaperAuthor.email == author_data.email
        ).first()
        if exists:
            raise exceptions.BusinessRuleError(f"Author with email '{author_data.email}' already exists in this paper.")

    if author_data.full_name is not None:
        author.full_name = author_data.full_name
    if author_data.email is not None:
        author.email = author_data.email
    if author_data.organization is not None:
        author.organization = author_data.organization

    # nếu set corresponding = true thì đảm bảo chỉ 1 người corresponding
    if author_data.is_corresponding is not None:
        if author_data.is_corresponding:
            db.query(models.PaperAuthor).filter(
                models.PaperAuthor.paper_id == paper_id
            ).update({models.PaperAuthor.is_corresponding: False})
        author.is_corresponding = author_data.is_corresponding

    db.commit()
    db.refresh(author)
    return author

def get_papers_for_bidding(db: Session, exclude_submitter_id: int = None) -> list[models.Paper]:
    """
    Lấy danh sách bài cho Reviewer chọn (Bidding).
    - Status: SUBMITTED
    - Exclude: Bài do chính reviewer đó nộp (tránh COI trực tiếp)
    - Relations: Chỉ load Topics, KHÔNG load Authors.
    """
    query = (
        db.query(models.Paper)
        .options(
            selectinload(models.Paper.topics), # Chỉ cần Topics để Reviewer xem chuyên môn
            # KHÔNG load authors, versions để nhẹ query và bảo mật
        )
        .filter(models.Paper.status == models.PaperStatus.SUBMITTED)
    )

    # Nếu Reviewer cũng là tác giả nộp bài, ẩn bài của họ đi
    if exclude_submitter_id:
        query = query.filter(models.Paper.submitter_id != exclude_submitter_id)

    return query.order_by(desc(models.Paper.submitted_at)).all()