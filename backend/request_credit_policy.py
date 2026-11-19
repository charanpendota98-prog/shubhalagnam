"""The published request-credit promise is a release invariant, not an account toggle.

No state is read or written here, so offline production preflight can use this
without importing the application, starting workers or contacting providers.
"""


def validate_request_credit_policy(env):
    enabled = str(env.get('INTEREST_REFUND_ON_DECLINE', 'true')).strip().lower()
    if enabled not in {'1', 'true', 'yes', 'on'}:
        raise RuntimeError('INTEREST_REFUND_ON_DECLINE must be true: the published policy returns one request credit on decline')
    if str(env.get('INTEREST_EXPIRY_DAYS', '7')).strip() != '7':
        raise RuntimeError('INTEREST_EXPIRY_DAYS must be 7: the published policy returns unanswered request credits after seven days')
