"""Focused Nov 15 audit regressions. All storage is disposable and synthetic."""
import importlib
import sys
from datetime import datetime, timedelta, timezone
from test_storage import isolate_test_stores
isolate_test_stores('confirmed-audit-fixes')
import main as M
from fastapi import HTTPException
assert importlib.import_module('backend.main') is M
assert importlib.import_module('main') is M

def reject(fn, *args):
    try:
        fn(*args)
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError('Invalid profile value accepted')

for value in ['2026-02-30', '1998-1-01', '1998-01-01suffix', '2015-01-01', '', None, {}]:
    reject(M._validated_profile_birth, value, 'Bride')
today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
for gender, minimum in [('Bride', 18), ('Groom', 21)]:
    try:
        birthday = today.replace(year=today.year-minimum)
    except ValueError:
        birthday = today.replace(year=today.year-minimum, day=28)
    assert M._validated_profile_birth(birthday.isoformat(), gender)[1] == minimum
    reject(M._validated_profile_birth, (birthday+timedelta(days=1)).isoformat(), gender)
for state, district in [('TS', 'Visakhapatnam'), ('AP', 'Hyderabad'), ('Invalid', 'Hyderabad')]:
    reject(M._validated_profile_location, state, district)
assert M._validated_profile_location('TS', 'Hyderabad') == ('TS', 'Hyderabad')
assert M._validated_profile_location('AP', 'Guntur') == ('AP', 'Guntur')
print('Confirmed-fix module identity, strict DOB, legal age and location regressions passed')
