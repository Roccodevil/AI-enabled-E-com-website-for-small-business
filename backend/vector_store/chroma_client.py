from typing import Optional

import chromadb

from core.config import settings


_client: Optional[chromadb.PersistentClient] = None


def get_vector_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
    return _client
