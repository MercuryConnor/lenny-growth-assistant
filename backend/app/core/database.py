import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Fallback to a default database URL if not provided by Docker
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://lenny:password@localhost:5432/lenny_db")

engine = create_engine(DATABASE_URL)

# Create vector extension if it doesn't exist
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
