from pydantic import BaseModel

class ConferenceCreate(BaseModel):
    name: str
    logo: str | None = None
    description: str | None = None


class ConferenceUpdate(BaseModel):
    name: str | None = None
    logo: str | None = None
    description: str | None = None


class ConferenceResponse(BaseModel):
    id: int
    name: str
    logo: str | None
    description: str | None
    created_by: int

    class Config:
        from_attributes = True


class ConferenceUpdateResult(BaseModel):
    before_update: ConferenceResponse
    after_update: ConferenceResponse

class ConferenceDeleteResult(BaseModel):
    message: str
    deleted_conference: ConferenceResponse
