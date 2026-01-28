import psycopg2
from psycopg2.extras import RealDictCursor
from config import POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

class DBClient:
    def get_connection(self):
        return psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD
        )

    def fetch_strategy(self, strategy_id: str):
        conn = None
        try:
            conn = self.get_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            query = "SELECT * FROM strategies WHERE id = %s"
            cur.execute(query, (strategy_id,))
            result = cur.fetchone()
            
            cur.close()
            return result
        except Exception as e:
            print(f"[DB] Error fetching strategy: {e}")
            return None
        finally:
            if conn:
                conn.close()
