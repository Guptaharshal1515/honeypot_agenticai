
// Simple regex-based scam intelligence extraction

export type IntelItem = {
  type: 'upi' | 'bank_account' | 'phone' | 'url' | 'crypto';
  value: string;
  context: string;
};

export function analyzeMessageForIntel(content: string): IntelItem[] {
  const intel: IntelItem[] = [];
  const extractedValues = new Set<string>(); // FIX ISSUE #3: Track to prevent double-classification

  // PRIORITY ORDER: Bank > UPI > Phone (prevents overlap)

  // 1. Bank Details FIRST (Highest priority - most specific)
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  const ifscMatches = content.match(ifscRegex);
  if (ifscMatches) {
    ifscMatches.forEach(match => {
      extractedValues.add(match);
      intel.push({ type: 'bank_account', value: match, context: 'Detected Bank IFSC Code' });
    });
  }

  const accRegex = /\b\d{9,18}\b/g;
  const accMatches = content.match(accRegex);
  if (accMatches) {
    accMatches.forEach(match => {
      // Only extract if not already classified AND has banking context
      if (!extractedValues.has(match)) {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('account') || lowerContent.includes('acc') || lowerContent.includes('bank') || lowerContent.includes('transfer')) {
          extractedValues.add(match);
          intel.push({ type: 'bank_account', value: match, context: 'Detected potential bank account number' });
        }
      }
    });
  }

  // 2. UPI ID (Second priority)
  const upiRegex = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g;
  const upiMatches = content.match(upiRegex);
  if (upiMatches) {
    upiMatches.forEach(match => {
      if (!extractedValues.has(match)) {
        extractedValues.add(match);
        intel.push({ type: 'upi', value: match, context: 'Detected UPI VPA' });
      }
    });
  }

  // 3. URL (FIX ISSUE #6: Label as contextual, not definitive phishing)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlMatches = content.match(urlRegex);
  if (urlMatches) {
    urlMatches.forEach(match => {
      if (!extractedValues.has(match)) {
        extractedValues.add(match);
        // Changed from "Detected Phishing/Suspicious Link" to contextual label
        intel.push({ type: 'url', value: match, context: 'Suspicious link (contextual - verify legitimacy)' });
      }
    });
  }

  // 4. Phone Number (LAST priority - most generic pattern)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = content.match(phoneRegex);
  if (phoneMatches) {
    phoneMatches.forEach(match => {
      const normalized = match.replace(/[^\d+]/g, '');
      // FIX ISSUE #3: Skip if already classified as bank account
      if (!extractedValues.has(normalized) && !extractedValues.has(match)) {
        extractedValues.add(normalized);
        intel.push({ type: 'phone', value: normalized, context: 'Detected contact phone number' });
      }
    });
  }

  return intel;
}
