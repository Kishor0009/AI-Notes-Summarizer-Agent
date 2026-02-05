"""PDF text extraction."""
from pypdf import PdfReader
from io import BytesIO


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n\n".join(parts).strip() or "No text could be extracted from this PDF."
