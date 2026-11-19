/** Read only the public pricing sources and checkout-configuration state. No auth or user data. */
export async function loadPricingSnapshot(base, fetcher = fetch) {
  async function read(path) {
    try {
      const response = await fetcher(`${base}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  }
  const [catalogue, promotions, announcements, payment] = await Promise.all([
    read('/api/plans'), read('/api/offers/active'), read('/api/cms/banners?page=pricing'), read('/api/pay/config'),
  ]);
  const plansReady = Array.isArray(catalogue?.plans) && catalogue.plans.length > 0 && catalogue.plans.some(p => p.price === 0);
  const offersReady = promotions?.success === true && Array.isArray(promotions.offers);
  const bannersReady = announcements?.success === true && Array.isArray(announcements.banners);
  return {
    plans: plansReady ? [catalogue.plans[0], ...catalogue.plans.filter(p => p.price > 0)] : null,
    addons: plansReady && Array.isArray(catalogue.addons) ? catalogue.addons : [],
    offers: offersReady ? promotions.offers.slice(0, 3) : [],
    banners: bannersReady ? announcements.banners : [],
    paymentMode: payment?.success === true && ['unconfigured', 'manual_upi', 'razorpay'].includes(payment.mode) ? payment.mode : 'unknown',
    noticesUnavailable: !offersReady || !bannersReady,
  };
}
