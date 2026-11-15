from datetime import datetime, timezone

def snapshot(users, visitors, leads, partners, payouts, stories, spotlights, coverage):
    """Allowlisted in-memory counts. No member/contact/config records leave this boundary."""
    def count(rows, predicate=lambda r: True):
        if not isinstance(rows, list) or any(not isinstance(r, dict) for r in rows):
            return None
        return sum(1 for r in rows if predicate(r))
    today = datetime.now(timezone.utc).date().isoformat()
    def visits_today(r):
        return str(r.get('at', ''))[:10] == today
    return {
        'success': True, 'generated_at': datetime.now(timezone.utc).isoformat(),
        'sources': 'Current server in-memory stores; counts are not independently reconciled delivery or identity evidence.',
        'growth': {'visits': count(visitors), 'visits_today': count(visitors, visits_today),
                   'leads': count(leads), 'new_leads': count(leads, lambda r:r.get('status')=='new'),
                   'consented_leads': count(leads, lambda r:r.get('contact_consent') is True)},
        'referrals': {'partners': count(partners), 'referred_members': count(users, lambda r:bool(r.get('referred_by'))),
                      'payout_requests': count(payouts), 'requested_payouts': count(payouts, lambda r:r.get('status')=='requested')},
        'content': {'pending_stories': count(stories, lambda r:r.get('status')=='pending'),
                    'pending_spotlights': count(spotlights, lambda r:r.get('status')=='pending_review')},
        'channels': {k:coverage.get(k) if isinstance(coverage.get(k), int) and not isinstance(coverage.get(k), bool) and coverage[k]>=0 else None
                     for k in ['total','routing_eligible','with_whatsapp']},
        'notes': ['A lead is not a registration or sale.', 'Payout requests are review records, not transfers.',
                  'Channel counts describe saved configuration, not reachability or posting permission.'],
    }
