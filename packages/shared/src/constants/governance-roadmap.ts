import type { ProgressiveDecentralizationRoadmap } from '../types/governance.types.js';

export const PROGRESSIVE_DECENTRALIZATION_ROADMAP: ProgressiveDecentralizationRoadmap = {
  overview:
    'Edin is designed to progressively transfer governance authority from the founding team to the community. ' +
    'This is not a marketing promise — it is a structural commitment embedded in the platform architecture. ' +
    'Each phase defines specific governance capabilities that shift from centralized to distributed control, ' +
    'with clear criteria for advancement.\n\n' +
    'Progressive decentralization acknowledges a practical reality: new communities need coherent leadership ' +
    'to establish norms, build trust, and develop shared values. Premature decentralization risks fragmentation. ' +
    'By transferring authority incrementally — as the community demonstrates capacity for self-governance — ' +
    'Edin ensures that decentralization strengthens rather than destabilizes the community.\n\n' +
    'Governance weight in Edin is earned through sustained, quality contributions — not purchased or delegated. ' +
    'This means governance authority accumulates naturally with those who invest deeply in the community, ' +
    'aligning decision-making power with demonstrated commitment and expertise.',

  phases: [
    {
      id: 0,
      name: 'Foundation',
      status: 'completed',
      timelineRange: 'Q1 2026',
      summary: 'Founding team establishes platform, admission criteria, and community norms.',
      governanceModel: 'Direct, human-facilitated decisions by founding team',
      keyMetrics: [
        {
          label: 'Governance authority held by founding team',
          value: '100%',
        },
        {
          label: 'Community governance vote rights',
          value: 'Not yet active',
        },
      ],
      milestones: [
        {
          capability: 'Admission decisions',
          description:
            'Founding team defines and applies admission criteria for early contributors.',
        },
        {
          capability: 'Platform settings',
          description: 'Core platform configuration managed directly by founding team.',
        },
        {
          capability: 'Community norms definition',
          description:
            'Founding team establishes behavioral expectations, contribution standards, and domain definitions.',
        },
      ],
    },
    {
      id: 1,
      name: 'Community Input',
      status: 'current',
      timelineRange: 'Q2–Q3 2026',
      summary: 'Contributors provide input on governance design through structured feedback.',
      governanceModel: 'Founding team retains authority; contributors influence framework design',
      keyMetrics: [
        {
          label: 'Governance authority held by founding team',
          value: '100% (with structured community input)',
        },
        {
          label: 'Contributor proposal influence mode',
          value: 'Advisory feedback and manifesto co-creation',
        },
      ],
      milestones: [
        {
          capability: 'Structured governance feedback',
          description:
            'Contributors submit structured input on governance proposals and platform direction.',
        },
        {
          capability: 'Domain manifesto co-creation',
          description:
            'Founding contributors participate in shaping domain-specific manifestos and priorities.',
        },
        {
          capability: 'Evaluation criteria input',
          description: 'Community provides feedback on how contributions are evaluated and scored.',
        },
      ],
    },
    {
      id: 2,
      name: 'Distributed Governance',
      status: 'planned',
      timelineRange: 'Q4 2026 – Q1 2027',
      summary:
        'Governance proposal workflow operational. Contributors accumulate governance weight from sustained quality contributions.',
      governanceModel:
        'Community-driven proposals with founding team veto authority during transition',
      keyMetrics: [
        {
          label: 'Governance proposal submission access',
          value: 'Enabled for contributors with sufficient governance weight',
        },
        {
          label: 'Founding team safeguard power',
          value: 'Transition-phase veto authority retained',
        },
      ],
      milestones: [
        {
          capability: 'Submit proposals',
          description:
            'Any contributor with sufficient governance weight can submit governance proposals for community consideration.',
        },
        {
          capability: 'Structured discussions',
          description:
            'Formal discussion periods for governance proposals with structured feedback mechanisms.',
        },
        {
          capability: 'Community voting on evaluation criteria',
          description:
            'Contributors vote on changes to how contributions are evaluated, scored, and rewarded.',
        },
        {
          capability: 'Governance weight accumulation',
          description:
            'Governance weight formula: f(cumulative contribution score, active engagement duration, domain breadth multiplier) — quality-based, not token-based.',
        },
      ],
    },
    {
      id: 3,
      name: 'Full Decentralization',
      status: 'planned',
      timelineRange: '2027+',
      summary:
        'DAO governance with transparent voting mechanisms. Founding team transitions to advisory roles.',
      governanceModel:
        'Autonomous community governance with transparent, on-chain decision records',
      keyMetrics: [
        {
          label: 'Governance authority held by founding team',
          value: '0% operational control (advisory role only)',
        },
        {
          label: 'Decision transparency mechanism',
          value: 'On-chain, immutable public records',
        },
      ],
      milestones: [
        {
          capability: 'On-chain voting',
          description:
            'Governance decisions recorded immutably with transparent voting mechanisms.',
        },
        {
          capability: 'Autonomous governance proposals',
          description:
            'Community members independently propose, discuss, and ratify governance changes without founding team intervention.',
        },
        {
          capability: 'Community-elected leadership',
          description:
            'Leadership roles filled through community governance processes rather than founding team appointment.',
        },
        {
          capability: 'Immutable decision records',
          description:
            'All governance decisions stored as permanent, auditable records accessible to the public.',
        },
      ],
    },
  ],

  glossary: [
    {
      term: 'Progressive Decentralization',
      definition:
        'A governance strategy where authority transfers incrementally from a founding team to the community, ' +
        'ensuring each phase of decentralization is supported by demonstrated community capacity for self-governance.',
    },
    {
      term: 'Governance Weight',
      definition:
        'A measure of governance influence earned through sustained, quality contributions. Calculated from ' +
        'cumulative contribution score, active engagement duration, and domain breadth multiplier. Governance ' +
        'weight is earned — never purchased or delegated.',
    },
    {
      term: 'DAO',
      definition:
        'Decentralized Autonomous Organization. A governance structure where decision-making authority is ' +
        'distributed among community members rather than concentrated in a central authority. In Edin, the ' +
        'DAO represents the final phase of governance evolution.',
    },
    {
      term: 'Governance Proposal',
      definition:
        'A formal request to change platform governance, evaluation criteria, or community norms. Proposals ' +
        'follow a structured workflow: submission, discussion period, community vote, and implementation.',
    },
    {
      term: 'Founding Contributor',
      definition:
        'An early community member who joined during Phase 0 or Phase 1 and helped establish community norms. ' +
        'Founding contributors receive special designation recognizing their role in shaping the platform.',
    },
    {
      term: 'Domain Breadth Multiplier',
      definition:
        'A component of the governance weight formula that recognizes contributors who engage meaningfully ' +
        'across multiple domains (Technology, Fintech, Impact, Governance), reflecting broader perspective ' +
        'and cross-functional understanding.',
    },
  ],
};
