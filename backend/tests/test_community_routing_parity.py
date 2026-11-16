"""No network, no member writes: preserve explicit shared-community routes."""
import sys
from pathlib import Path
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import channels_config as C

CASES = [
    ('Agnikula Kshatriya', 'others_bc'), ('agnikulakshatriya', 'others_bc'),
    ('Are Katika', 'others_bc'), ('Bondili', 'others_bc'), ('Meru', 'others_bc'),
    ('Togata', 'padmashali_weavers'), ('Togata Kshatriya', 'padmashali_weavers'),
    ('Togataveera', 'padmashali_weavers'), ('Thogata', 'padmashali_weavers'),
    ('Devanga', 'padmashali_weavers'), ('Kshatriya', 'raju_kshatriya'),
    ('Raju', 'raju_kshatriya'), ('Koppula Velama', 'velama'),
]

@pytest.mark.parametrize('name,key', CASES)
def test_existing_canonical_names(name, key):
    assert C.resolve_caste_key(name) == key
    assert C.resolve_caste_key('  ' + name.upper().replace(' ', ' - ') + '  ') == key

@pytest.mark.parametrize('gender', ['Bride', 'Groom'])
@pytest.mark.parametrize('name,key', CASES)
def test_public_links_preserve_community_and_gender(name, key, gender):
    profile = {'caste':name, 'sub_caste':'Kshatriya', 'gender':gender, 'religion':'Hindu'}
    rows=C.caste_channel_links(profile, limit=20)
    community=[r['key'] for r in rows if r['key'].startswith('c_')]
    assert community and community[0] == f'c_{key}_{gender.lower()}'
    if key != 'raju_kshatriya':
        assert not any('raju_kshatriya' in x for x in community)


def test_selected_community_does_not_fall_back_to_subcommunity():
    rows=C.caste_channel_links({'caste':'Unlisted community','sub_caste':'Kshatriya','gender':'Bride'})
    assert not any(r['key'].startswith('c_') for r in rows)


def test_audited_communities_match_frontend_hub_resolver():
    import subprocess
    repo=Path(__file__).resolve().parents[2]
    script="""
import {communityHubPath} from './frontend/src/lib/community-hub.mjs';
const cases=JSON.parse(process.argv[1]);
const hubs=[...new Set(cases.map(([,key])=>key))].map(key=>({key,name:key}));
console.log(JSON.stringify(cases.map(([community])=>communityHubPath({community,gender:'Bride',hubs}).hubKey)));
"""
    import json
    # The frontend has no claim for Thogata or sub-community strings; compare
    # only the audited canonical registration choices, not invented aliases.
    cases=[(n,k) for n,k in CASES if n in ('Agnikula Kshatriya','Are Katika','Bondili','Meru','Togata','Devanga','Kshatriya','Raju','Koppula Velama')]
    result=subprocess.check_output(['node','--input-type=module','-e',script,json.dumps(cases)],cwd=repo,text=True)
    assert json.loads(result)==[k for n,k in cases]
