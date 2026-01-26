import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (3 levels up from services/worker-python/src or 2 from services/worker-python)
# Assuming run from services/worker-python
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    # Add other config as needed

config = Config()
