/**
 * countries.js
 * ------------------------------------------------------------------
 * A curated list of common countries for the "Country of residence"
 * select on register.html. NOT the full ISO 3166 list (~195
 * countries) — this covers the regions most platforms like this
 * actually see traffic from. Extend the array below as needed, or
 * swap it for a proper package (e.g. `world-countries` on npm) once
 * this is wired to a real backend — hand-maintaining dial codes for
 * all 195 countries here risks silent typos.
 *
 * Flag emoji are NOT stored — they're computed from the ISO code in
 * `isoToFlagEmoji()` below, so there's nothing to get wrong per-row.
 * Known limitation: some Windows browser/font combinations render
 * flag emoji as plain two-letter codes instead of a flag glyph — this
 * is a font/OS limitation, not a bug in this code. If pixel-perfect
 * flags matter later, that means a custom dropdown instead of a
 * native <select>, which trades away built-in keyboard/screen-reader
 * support, so it's worth confirming it's actually needed first.
 *
 * dialCode is included now (and exposed via data-dial-code on each
 * <option>) so a future phone-number field can auto-fill the calling
 * code the moment someone picks a country, instead of them typing it —
 * read it with:
 *   selectEl.selectedOptions[0].dataset.dialCode
 * ------------------------------------------------------------------
 */
window.COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },

  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'MA', name: 'Morocco', dialCode: '+212' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
  { code: 'UG', name: 'Uganda', dialCode: '+256' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216' },

  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },

  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886' },

  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  { code: 'JO', name: 'Jordan', dialCode: '+962' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },

  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'PE', name: 'Peru', dialCode: '+51' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },

  { code: 'RU', name: 'Russia', dialCode: '+7' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7' }
];

/**
 * Converts a 2-letter ISO country code (e.g. "GB") into its flag
 * emoji by mapping each letter to a Unicode "regional indicator
 * symbol" — computed, not hardcoded, so there's no per-country typo risk.
 */
function isoToFlagEmoji(isoCode) {
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

window.isoToFlagEmoji = isoToFlagEmoji;