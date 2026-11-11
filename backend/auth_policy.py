"""Supported member-auth policy and public configuration, without network or startup effects."""
from __future__ import annotations
import re
from email.utils import parseaddr
from urllib.parse import urlparse


def email_configured(env) -> bool:
    sender = str(env.get('MANA_VIVAHA_EMAIL_FROM', '')).strip()
    if any(c in sender for c in ('\r', '\n')):
        return False
    _, address = parseaddr(sender)
    valid_address = re.fullmatch(r'[^<>\s@]+@(mail\.)?manavivaha\.in', address, re.I)
    valid_wrapper = ('<' not in sender and '>' not in sender) or (sender.count('<') == 1 and sender.count('>') == 1 and sender.endswith('>'))
    return bool(str(env.get('EMAIL_MODE', 'off')).strip().lower() == 'resend'
                and str(env.get('RESEND_API_KEY', '')).strip() and valid_address and valid_wrapper)


def validate_production_email(env):
    if not email_configured(env):
        raise RuntimeError('Production verified-email recovery requires EMAIL_MODE=resend, RESEND_API_KEY and an approved manavivaha.in sender; off/mock or invalid sender is not supported')


def capabilities(env):
    # Phone delivery is deliberately unavailable for this supported deployment.
    # A bridge URL/key existing is not evidence the phone is paired or delivery works.
    rp = str(env.get('PASSKEY_RP_ID', '')).strip().lower()
    origins = [o.strip() for o in str(env.get('PASSKEY_ALLOWED_ORIGINS', '')).split(',') if o.strip()]
    passkeys = bool(rp and rp != 'localhost' and origins and all(
        urlparse(o).scheme == 'https' and (urlparse(o).hostname == rp or (urlparse(o).hostname or '').endswith('.' + rp))
        for o in origins))
    return {'password_login': True, 'login_identifier': 'phone', 'phone_otp': False,
            'email_recovery_configured': email_configured(env), 'passkeys_configured': passkeys,
            'email_optional_at_registration': True}


def auth_enforced(env):
    def flag(key): return str(env.get(key, '')).strip().lower()
    return not (flag('TSAP_AUTH_MODE') in {'off','dev','test'}
                or flag('TSAP_AUTH_ENFORCE') in {'0','false','no'}
                or flag('WA_TEST_FAST') in {'1','true','yes','on'})
