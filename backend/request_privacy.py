"""Keep bearer review tokens out of operational paths and log messages."""
import hashlib
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
    def marker(token):
        if re.fullmatch(r"\{token:[a-f0-9]{12}\}", token):
            return token
        return "{token:" + hashlib.sha256(token.encode("utf-8")).hexdigest()[:12] + "}"
    text = _REVIEW_PATH.sub(lambda match: match[1] + marker(match[0][len(match[1]):]), text)
    return _REVIEW_TOKEN.sub(lambda match: marker(match[0]), text)


def safe_request_path(request):
    path = request.url.path if request is not None else "?"
    return re.sub(r"\{token:[a-f0-9]{12}\}", "{token}", redact_review_tokens(path)).split("?", 1)[0].split("#", 1)[0]


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


def rate_limit_identity(value):
    """Keep distinct bearer buckets without retaining the bearer in memory keys."""
    value = str(value)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def redact_log_data(value):
    if isinstance(value, str):
        return redact_review_tokens(value)
    if isinstance(value, dict):
        return {redact_review_tokens(k): redact_log_data(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact_log_data(v) for v in value]
    return value


def install_review_log_filters():
    """Cover direct uvicorn, containers and PM2 without replacing handler style."""
    privacy_filter = ReviewTokenFilter()
    loggers = [logging.getLogger(), logging.getLogger('uvicorn'),
               logging.getLogger('uvicorn.access'), logging.getLogger('uvicorn.error')]
    for logger in loggers:
        for target in [logger, *logger.handlers]:
            if not any(isinstance(item, ReviewTokenFilter) for item in target.filters):
                target.addFilter(privacy_filter)
