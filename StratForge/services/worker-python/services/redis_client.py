import redis
import os
from config import REDIS_HOST, REDIS_PORT

class RedisClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance.client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True
            )
        return cls._instance

    def get_client(self):
        return self.client

    def get_pubsub(self):
        return self.client.pubsub()
    
    def test_connection(self):
        try:
            return self.client.ping()
        except redis.ConnectionError:
            return False
