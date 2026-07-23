"""
InvestMitra RAG Document Processor
Handles text extraction, chunking, security sanitization (prompt injection removal), and embedding generation.
"""

import re
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Prompt injection regex patterns to neutralize in untrusted document text
PROMPT_INJECTION_PATTERNS = [
    r'ignore\s+previous\s+instructions',
    r'ignore\s+all\s+prior\s+prompts',
    r'system\s+prompt\s+override',
    r'you\s+are\s+now\s+a',
    r'act\s+as\s+a\s+DAN',
    r'reveal\s+secret\s+key'
]


def sanitize_document_content(text: str) -> str:
    """
    Sanitizes untrusted text retrieved from external documents/filings/web to prevent prompt injection.
    """
    if not text or not isinstance(text, str):
        return ""

    sanitized = text
    for pattern in PROMPT_INJECTION_PATTERNS:
        sanitized = re.sub(pattern, '[REDACTED_SECURITY_PROMPT]', sanitized, flags=re.IGNORECASE)

    return sanitized


def chunk_document_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
    """
    Splits text into overlapping semantic chunks for RAG processing.
    """
    sanitized = sanitize_document_content(text)
    words = sanitized.split()
    chunks = []
    
    if not words:
        return chunks

    i = 0
    chunk_index = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk_text = " ".join(chunk_words)
        
        chunks.append({
            "chunk_index": chunk_index,
            "content": chunk_text,
            "sanitized_content": chunk_text,
            "word_count": len(chunk_words)
        })
        
        chunk_index += 1
        i += (chunk_size - overlap)
        
    return chunks


def generate_simulated_embedding(text: str, dimension: int = 1536) -> List[float]:
    """
    Generate normalized float vector embedding representation.
    """
    # Deterministic vector representation using hashing
    vec = [0.0] * dimension
    for i, char in enumerate(text[:500]):
        idx = (ord(char) * (i + 1)) % dimension
        vec[idx] += 0.1
        
    norm = float(sum(x ** 2 for x in vec) ** 0.5)
    if norm > 0:
        vec = [float(x / norm) for x in vec]
        
    return vec
