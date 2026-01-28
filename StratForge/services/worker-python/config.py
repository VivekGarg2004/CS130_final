import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
# Logic: services/worker-python -> services -> StratForge -> .env (3 levels up)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
if REDIS_HOST == 'redis':
    REDIS_HOST = 'localhost'

REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', 5432))
POSTGRES_DB = os.getenv('POSTGRES_DB', 'stratforge')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'postgres')
