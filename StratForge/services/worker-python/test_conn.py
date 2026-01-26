import redis
import psycopg2
import os

def test():
    print("Testing Python Connectivity...")

    # Redis
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.set('foo', 'bar')
    print(f"Redis Get: {r.get('foo')}")

    # Postgres
    # Connect to host port 5433
    try:
        conn = psycopg2.connect(
            dbname="stratforge",
            user="stratforge",
            password="changeme",
            host="localhost",
            port="5433"
        )
        cur = conn.cursor()
        cur.execute("SELECT NOW();")
        print(f"Postgres Time: {cur.fetchone()[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Postgres Error: {e}")

if __name__ == "__main__":
    test()
