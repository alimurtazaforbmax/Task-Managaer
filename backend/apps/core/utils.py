import uuid
from pathlib import Path

from django.conf import settings


def unique_upload_path(folder: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return f"{folder}/{uuid.uuid4().hex}{ext}"


def validate_file_size(file_obj, max_mb: int) -> None:
    max_bytes = max_mb * 1024 * 1024
    if file_obj.size > max_bytes:
        raise ValueError(f"File exceeds maximum size of {max_mb}MB")


def validate_mime_type(file_obj, allowed_types: list[str]) -> None:
    content_type = getattr(file_obj, "content_type", None)
    if content_type and content_type not in allowed_types:
        raise ValueError(f"File type '{content_type}' is not allowed")
