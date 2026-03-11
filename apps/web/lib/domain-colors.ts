export const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Technology: {
    bg: 'bg-domain-technology',
    text: 'text-white',
    border: 'border-domain-technology',
  },
  Finance: { bg: 'bg-domain-finance', text: 'text-black', border: 'border-domain-finance' },
  Impact: { bg: 'bg-domain-impact', text: 'text-black', border: 'border-domain-impact' },
  Governance: {
    bg: 'bg-domain-governance',
    text: 'text-white',
    border: 'border-domain-governance',
  },
};

export const DOMAIN_HEX_COLORS: Record<string, string> = {
  Technology: '#3A7D7E',
  Finance: '#C49A3C',
  Impact: '#B06B6B',
  Governance: '#7B6B8A',
};
