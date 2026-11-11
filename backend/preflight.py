"""Offline production checks only. Success does not approve or guarantee a restart.

Use the exact intended runtime environment and interpreter. This never starts
main, workers, email delivery, migrations or empty-database initialization.
"""import os
from auth_policy import auth_enforced
from control_auth import _accounts
from production_gates import configured_paths, validate_storage, validate_core_database, validate_operator_config


def run():
    validate_operator_config(os.environ, auth_enforced(os.environ), _accounts())
    token = os.getenv('TSAP_TOKEN_VERSIONS_FILE', '').strip()
    if not token:
        raise RuntimeError('TSAP_TOKEN_VERSIONS_FILE must be explicitly configured')
    paths = configured_paths(os.environ)
    validate_storage(paths, token)
    db = next(value for label, value, _ in paths if label == 'core profiles/payments database')
    validate_core_database(db)


if __name__ == '__main__':
    try:
        run()
    except Exception as exc:
        print('Preflight failed: ' + str(exc))
        raise SystemExit(1)
    print('Offline configuration and storage checks passed. Delivery, backup restore, runtime readiness and owner approval remain separate.')
