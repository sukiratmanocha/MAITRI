// Frankfurter API — free, no auth required
// Docs: https://www.frankfurter.app/docs

export async function fetchExchangeRates() {
    // Base currency is EUR (Frankfurter limitation), so we convert:
    // Fetch EUR→INR and EUR→AED to derive INR→AED
    const res = await fetch('https://api.frankfurter.app/latest?from=INR&to=AED,USD');
    if (!res.ok) throw new Error(`Exchange rate fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    //  data.rates = { AED: X, USD: Y }  (per 1 INR)
    return {
        base: 'INR',
        aed: data.rates.AED,       // 1 INR → X AED
        usd: data.rates.USD,       // 1 INR → X USD
        fetchedAt: new Date().toISOString(),
    };
}
