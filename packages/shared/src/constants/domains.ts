export const DOMAINS = {
  Technology: 'Technology',
  Fintech: 'Fintech',
  Impact: 'Impact',
  Governance: 'Governance',
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

export const DOMAIN_DETAILS = {
  Technology: {
    name: 'Technology',
    description:
      'Building the technical infrastructure that powers Edin — from core platform development to DevOps, security, and scalable architecture.',
    accentColor: '#3A7D7E',
  },
  Fintech: {
    name: 'Fintech & Financial Engineering',
    description:
      'Designing financial models, tokenomics, and payment systems that ensure fair and transparent contributor rewards.',
    accentColor: '#C49A3C',
  },
  Impact: {
    name: 'Impact & Sustainability',
    description:
      'Measuring and maximizing the social and environmental impact of the platform and its community of contributors.',
    accentColor: '#B06B6B',
  },
  Governance: {
    name: 'Governance',
    description:
      'Shaping the rules, processes, and decision-making frameworks that guide the progressive decentralization of Edin.',
    accentColor: '#7B6B8A',
  },
} as const;

export type DomainDetail = (typeof DOMAIN_DETAILS)[keyof typeof DOMAIN_DETAILS];
