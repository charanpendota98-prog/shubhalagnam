"""Briefing copy uses plain Telugu without changing counts or ranking."""
import sys
from pathlib import Path
from datetime import datetime
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import matchbot

@pytest.mark.parametrize('populated',[False,True])
def test_briefing_plain_telugu_and_count_contract(populated):
    now=datetime(2026,11,20,9)
    me={'tsap_id':'TEST-BRIEFING','gender':'Groom','full_name':'Fictional member'}
    profiles=[{'tsap_id':'TEST-CANDIDATE','gender':'Bride','full_name':'Fictional candidate','is_approved':True,'created_at':'2026-11-19T09:00:00','district':'Hyderabad','age':26}] if populated else []
    interests=[{'from_id':'TEST-CANDIDATE','to_id':me['tsap_id'],'status':'pending'}] if populated else []
    views=[{'viewer_id':'TEST-CANDIDATE','tsap_id':me['tsap_id']}] if populated else []
    brief=matchbot.daily_briefing(me,profiles,interests,views,[],now=now)
    tips=matchbot.assistant_tips(me,brief)
    assert len(brief['matches'])==int(populated)
    assert brief['mutual']['interests_received']==int(populated)
    assert brief['mutual']['profile_views']==int(populated)
    assert isinstance(brief['nudge']['percent'],int)
    generated=[brief['summary_telugu'],brief['mutual']['note_telugu'],brief['nudge']['verdict_telugu']]+[t['telugu'] for t in tips]
    for text in generated:
        assert text and not any(term in text.lower() for term in ['profiles','interest','profile views','fields','visibility','privacy settings','identity verification'])
        assert not any(0x1F300<=ord(c)<=0x1FAFF for c in text)
    assert brief['tsap_id']==me['tsap_id'] and brief['success']
    if populated:assert brief['matches'][0]['tsap_id']=='TEST-CANDIDATE'
    assert all(t['cta'] in ['/me','/requests','/matches','/login'] for t in tips)
