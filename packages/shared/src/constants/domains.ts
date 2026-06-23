export const DOMAINS = {
  Technology: 'Technology',
  Finance: 'Finance',
  Impact: 'Impact',
  Governance: 'Governance',
  Nurea_TV: 'Nurea_TV',
} as const;

/** Human-readable label for a domain enum value (e.g. 'Nurea_TV' -> 'Nurea TV'). */
export function domainLabel(domain: Domain): string {
  return DOMAIN_DETAILS[domain]?.name ?? domain.replace(/_/g, ' ');
}

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

export const DOMAIN_DETAILS = {
  Technology: {
    name: 'Technology',
    description:
      'Building the technical infrastructure that powers Edin — from core platform development to DevOps, security, and scalable architecture.',
    accentColor: '#3A7D7E',
  },
  Finance: {
    name: 'Finance & Financial Engineering',
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
  // TODO: editorial copy for Nurea TV pending — update name/description/accentColor when provided.
  Nurea_TV: {
    name: 'Nurea TV',
    description: 'Contributions related to Nurea TV.',
    accentColor: '#5A8CA0',
  },
} as const;

export type DomainDetail = (typeof DOMAIN_DETAILS)[keyof typeof DOMAIN_DETAILS];
