"""Saved-search restart restoration preserves owner, filters and notification opt-out."""
import ast
import json
import os
from pathlib import Path
import subprocess
import sys

BACKEND = Path(__file__).resolve().parents[1]


def test_startup_restores_saved_searches_before_workers():
    tree = ast.parse((BACKEND / 'main.py').read_text())
    startup = next(n for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef) and n.name == '_startup_publisher')
    calls = [(n.lineno, n.func.id) for n in ast.walk(startup) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
    assert next(line for line, name in calls if name == 'load_saved_searches') < next(line for line, name in calls if name == 'start_worker')


def test_saved_search_process_restart_and_delete(tmp_path):
    env = {**os.environ, 'MANA_VIVAHA_STATE_DIR': str(tmp_path)}
    def run(code):
        return subprocess.check_output([sys.executable, '-c', code], cwd=BACKEND, env=env, text=True).strip().splitlines()[-1]
    run("import quality as q; q.save_search('FICTIONAL_OWNER','Hyderabad 27-33',{'district':'Hyderabad','age_min':27,'age_max':33},alert=False)")
    rows = json.loads(run("import quality as q,json; q.load_saved_searches(); print(json.dumps(q.saved_for('FICTIONAL_OWNER'))); assert q.saved_for('OTHER')==[]"))
    assert len(rows) == 1
    assert rows[0]['alert'] is False
    assert rows[0]['filters'] == {'district': 'Hyderabad', 'age_min': 27, 'age_max': 33}
    run("import quality as q; q.load_saved_searches(); r=q.saved_for('FICTIONAL_OWNER')[0]; assert q.delete_search('FICTIONAL_OWNER',r['search_id'])")
    assert run("import quality as q; q.load_saved_searches(); print(len(q.saved_for('FICTIONAL_OWNER')))") == '0'
