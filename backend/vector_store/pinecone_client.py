from typing import Optional

from pinecone import Pinecone, ServerlessSpec

from core.config import settings


_client: Optional[Pinecone] = None
_index_cache = None


def get_pinecone_index(dimension: int):
    global _client, _index_cache

    if not settings.pinecone_api_key:
        return None

    if _client is None:
        _client = Pinecone(api_key=settings.pinecone_api_key)

    index_name = settings.pinecone_index_name
    list_result = _client.list_indexes()
    if hasattr(list_result, "names"):
        existing_names = set(list_result.names())
    else:
        existing_names = {index_info["name"] for index_info in list_result}
    if index_name not in existing_names:
        _client.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
        )

    if _index_cache is None:
        _index_cache = _client.Index(index_name)

    return _index_cache
