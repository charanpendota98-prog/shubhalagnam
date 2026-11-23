"""Keep bearer review tokens out of operational paths and log messages."""
import logging
import re
from urllib.parse import unquote

_REVIEW_PATH = re.compile(r"(/api/review-links/)[^/\s?\#\"'<>]+", re.I)
_REVIEW_TOKEN = re.compile(r"rv_[A-Za-z0-9_-]+", re.I)


def redact_review_tokens(value):
    original = text = str(value)
    # ASGI paths are decoded; log records can contain URL-encoded request targets.
    for _ in range(3):
        decoded = unquote(text)
        if decoded == text:
            break
        text = decoded
    if not (_REVIEW_PATH.search(text) or _REVIEW_TOKEN.search(text)):
        return original
    text = _REVIEW_PATH.sub(r"\1{token}", text)
    return _REVIEW_TOKEN.sub("{token}", text)


def safe_request_path(request):
    path = request.url.path if request is not None else "?"
    return redact_review_tokens(path).split("?", 1)[0].split("#", 1)[0]


class ReviewTokenFilter(logging.Filter):
    """Redact after formatting, including exception text, before handler output."""
    def filter(self, record):
        record.msg = redact_review_tokens(record.getMessage())
        record.args = ()
        if record.exc_info:
            record.exc_text = redact_review_tokens(logging.Formatter().formatException(record.exc_info))
            record.exc_info = None
        if record.exc_text:
            record.exc_text = redact_review_tokens(record.exc_text)
        if record.stack_info:
            record.stack_info = redact_review_tokens(record.stack_info)
        return True
