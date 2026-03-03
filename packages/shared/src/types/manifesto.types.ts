import type { Domain } from '../constants/domains.js';

export interface DomainManifesto {
  domain: Domain;
  title: string;
  subtitle: string;
  content: string;
  highlights: string[];
}
