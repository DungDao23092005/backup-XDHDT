import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load file .env
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "UTH-ConfMS Intelligent Service"
    PROJECT_VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3310/intelligent_db"
    
    # Google AI
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")
    
    if not GOOGLE_API_KEY:
        print("WARNING: GOOGLE_API_KEY is missing in .env file!")

    PROJECT_NAME: str = "UTH-ConfMS Intelligent Service"
    PROJECT_VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env", 
        extra="ignore" 
    )

settings = Settings()