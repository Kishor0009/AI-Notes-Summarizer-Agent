import sqlite3
import os
from fastapi import HTTPException

DB_PATH = "usage.db"
MAX_SUMMARIES = 5

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_usage (
            email TEXT PRIMARY KEY,
            count INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def check_and_increment_usage(email: str):
    """
    Checks if user has exceeded limit. If not, increments count.
    Raises HTTPException if limit exceeded.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # Check current usage
        c.execute('SELECT count FROM user_usage WHERE email = ?', (email,))
        result = c.fetchone()
        
        current_count = result[0] if result else 0
        
        if current_count >= MAX_SUMMARIES:
            raise HTTPException(
                status_code=403, 
                detail=f"Usage limit exceeded. You have used {current_count}/{MAX_SUMMARIES} free summaries."
            )
        
        # Increment usage
        if result:
            c.execute('UPDATE user_usage SET count = count + 1 WHERE email = ?', (email,))
        else:
            c.execute('INSERT INTO user_usage (email, count) VALUES (?, 1)', (email,))
            
        conn.commit()
        return current_count + 1
    finally:
        conn.close()

# Initialize API on module load (simple for this scale)
init_db()
