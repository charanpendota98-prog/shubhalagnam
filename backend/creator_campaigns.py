"""Creator campaign value objects. No transport, account writes or money mutations.

Endpoints own authentication and atomic persistence. This module deliberately
returns candidate records so a failed write cannot leave an in-memory campaign.
"""
from __future__ import annotations
import re
import secrets
from urllib.parse import urlsplit, urlencode

CHANNELS = frozenset({'whatsapp', 'telegram', 'youtube', 'instagram', 'website', 'other'})
TOKEN = re.compile(r'^[A-Za-z0-9_-]{24}$')
MAX_CAMPAIGNS = 100


def validate_video_url(value: str) -> str:
    url = str(value or '').strip()
    if not url:
        return ''
    if len(url) > 500 or any(ord(c) < 33 for c in url) or '\\' in url:
        raise ValueError('Video URL is invalid')
    try:
        p = urlsplit(url)
        port = p.port
    except ValueError as exc:
        raise ValueError('Video URL is invalid') from exc
    # A caption reference, never fetched by the server. Limit known video hosts
    # rather than accepting internal-network URLs or unexpected URL schemes.
    if (p.scheme != 'https' or p.username or p.password or port not in (None, 443)
            or (p.hostname or '').lower() not in {
                'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
                'instagram.com', 'www.instagram.com', 't.me'}):
        raise ValueError('Use an HTTPS YouTube, Instagram or Telegram URL')
    return url


def new_campaign(owner_code: str, existing: list[dict], payload: dict, now: str) -> dict:
    code = str(owner_code or '').strip().upper()
    if not re.fullmatch(r'[A-Z0-9_-]{1,80}', code):
        raise ValueError('Referral code is invalid')
    if len(existing) >= MAX_CAMPAIGNS:
        raise ValueError('Campaign limit reached')
    name = ' '.join(str(payload.get('name') or '').split())
    if not 2 <= len(name) <= 60 or re.search(r'[\x00-\x1f<>{}]', name):
        raise ValueError('Use a campaign name of 2 to 60 characters')
    channel = str(payload.get('channel') or '').strip().lower()
    if channel not in CHANNELS:
        raise ValueError('Choose a supported channel')
    if any(x.get('name', '').casefold() == name.casefold() for x in existing):
        raise ValueError('Choose a different campaign name')
    tokens = {x.get('id') for x in existing}
    token = secrets.token_urlsafe(18)
    while token in tokens:
        token = secrets.token_urlsafe(18)
    return {'id': token, 'owner_code': code, 'name': name, 'channel': channel,
            'video_url': validate_video_url(payload.get('video_url', '')),
            'status': 'active', 'created_at': now, 'updated_at': now, 'version': 1}


def resolve_campaign(owner_code: str, campaigns: list[dict], token: str, *, active: bool = True) -> dict | None:
    # Never discover a campaign across owners or infer ownership from a token.
    if not TOKEN.fullmatch(str(token or '')):
        return None
    code = str(owner_code or '').strip().upper()
    return next((x for x in campaigns if x.get('id') == token and x.get('owner_code') == code
                 and (not active or x.get('status') == 'active')), None)


def campaign_view(campaign: dict, site_url: str) -> dict:
    # Explicit whitelist. Caller-added user/contact/earnings fields cannot leak.
    safe = {k: campaign.get(k) for k in ('id', 'name', 'channel', 'video_url', 'status', 'created_at', 'updated_at')}
    code = campaign['owner_code']
    safe['link'] = f"{site_url.rstrip('/')}/r/{code}?{urlencode({'campaign': campaign['id']})}"
    safe['disclosure_en'] = 'Ad / referral link. I may receive a reward after your first qualifying paid plan. Registration alone is not a cash reward.'
    safe['disclosure_te'] = 'ప్రకటన / referral link. మీ మొదటి అర్హమైన paid plan తర్వాత నాకు reward రావచ్చు. నమోదు ఒక్కటే నగదు reward కాదు.'
    return safe

# One dedicated satellite next to the existing referral store. Runtime/test
# isolation follows that configured path; no production default is embedded.
import copy
import json
import os
import threading
from atomic_store import atomic_json_dump
_LOCK = threading.RLock()


class CampaignStoreUnreadable(OSError):
    pass


class CampaignStore:
    def __init__(self, path: str):
        self.path = path

    def _read(self) -> dict:
        if not os.path.exists(self.path):
            return {'version': 1, 'campaigns': [], 'clicks': []}
        try:
            with open(self.path, encoding='utf-8') as handle:
                data = json.load(handle)
            if (not isinstance(data, dict) or data.get('version') != 1
                    or not isinstance(data.get('campaigns'), list) or not isinstance(data.get('clicks'), list)):
                raise ValueError('invalid schema')
            seen = set()
            for row in data['campaigns']:
                if (not isinstance(row, dict) or not TOKEN.fullmatch(str(row.get('id', '')))
                        or row['id'] in seen or row.get('status') not in {'active', 'paused', 'archived'}
                        or not re.fullmatch(r'[A-Z0-9_-]{1,80}', str(row.get('owner_code', '')))
                        or not isinstance(row.get('name'), str) or row.get('channel') not in CHANNELS
                        or not isinstance(row.get('clicks', 0), int) or row.get('clicks', 0) < 0):
                    raise ValueError('invalid campaign')
                seen.add(row['id'])
            for click in data['clicks']:
                if not isinstance(click, dict) or not all(isinstance(click.get(k), str) for k in ('campaign', 'dedupe', 'at')):
                    raise ValueError('invalid click')
        except (ValueError, TypeError) as exc:
            raise CampaignStoreUnreadable('Campaign store is unreadable') from exc
        return data

    def create(self, owner_code: str, payload: dict, now: str) -> dict:
        with _LOCK:
            data = self._read()
            mine = [x for x in data['campaigns'] if x.get('owner_code') == owner_code]
            row = new_campaign(owner_code, mine, payload, now)
            if any(x.get('id') == row['id'] for x in data['campaigns']):
                raise ValueError('Try again to generate a new campaign link')
            data['campaigns'].append(row)
            atomic_json_dump(self.path, data)
            return copy.deepcopy(row)

    def set_status(self, owner_code: str, token: str, status: str, now: str) -> dict:
        if status not in {'active', 'paused', 'archived'}:
            raise ValueError('Campaign status is invalid')
        with _LOCK:
            data = self._read()
            row = resolve_campaign(owner_code, data['campaigns'], token, active=False)
            if row is None:
                raise LookupError('Campaign not found')
            if row.get('status') == 'archived':
                raise ValueError('Archived campaigns cannot be changed')
            row.update(status=status, updated_at=now)
            atomic_json_dump(self.path, data)
            return copy.deepcopy(row)

    def resolve(self, owner_code: str, token: str) -> dict | None:
        with _LOCK:
            return copy.deepcopy(resolve_campaign(owner_code, self._read()['campaigns'], token))

    def record_click(self, owner_code: str, token: str, dedupe_key: str, now: str) -> bool:
        from hashlib import sha256
        from datetime import datetime
        with _LOCK:
            data = self._read()
            row = resolve_campaign(owner_code, data['campaigns'], token)
            if row is None:
                return False
            digest = sha256(dedupe_key.encode()).hexdigest()
            for prior in reversed(data['clicks']):
                if prior.get('campaign') == token and prior.get('dedupe') == digest:
                    age = (datetime.fromisoformat(now) - datetime.fromisoformat(prior['at'])).total_seconds()
                    if 0 <= age <= 600:
                        return True
                    break
            data['clicks'].append({'campaign': token, 'dedupe': digest, 'at': now})
            # Aggregate stays durable after bounded raw replay keys are removed.
            row['clicks'] = int(row.get('clicks', 0)) + 1
            data['clicks'] = data['clicks'][-10000:]
            atomic_json_dump(self.path, data)
            return True

    def report(self, owner_code: str, users: list[dict], ledger: list[dict], site_url: str) -> list[dict]:
        with _LOCK:
            data = self._read()
            result = []
            # Only explicitly attached campaign fields count. Merely opening a
            # link, or adding a tag to an existing referral, earns nothing.
            for row in data['campaigns']:
                if row.get('owner_code') != owner_code:
                    continue
                joined = {u.get('tsap_id') for u in users if u.get('referred_by') == owner_code
                          and u.get('referral_campaign') == row['id']}
                eligible = {e.get('from'): e for e in ledger if e.get('from') in joined}
                result.append({**campaign_view(row, site_url), 'clicks': row.get('clicks', 0),
                               'registrations': len(joined), 'eligible_rewards': len(eligible),
                               'recorded_earnings_inr': sum(float(e.get('amount', 0)) for e in eligible.values()),
                               'sample_note': 'Counts are recorded events, not guaranteed income or match success.'})
            return result
