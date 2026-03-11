import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DOMAIN_MANIFESTOS } from '@edin/shared';
import { ManifestoSection } from './manifesto-section';
import { ManifestoGrid } from './manifesto-grid';
import { AboutHero, AboutHeroSkeleton } from './about-hero';
import { AboutSkeleton } from './about-skeleton';

describe('ManifestoSection', () => {
  const manifesto = DOMAIN_MANIFESTOS[0]; // Technology

  it('renders domain title, subtitle, content, and highlights', () => {
    render(<ManifestoSection manifesto={manifesto} />);

    expect(screen.getByText(manifesto.title)).toBeInTheDocument();
    expect(screen.getByText(manifesto.subtitle)).toBeInTheDocument();
    expect(screen.getByText(manifesto.content)).toBeInTheDocument();
    manifesto.highlights.forEach((highlight) => {
      expect(screen.getByText(highlight)).toBeInTheDocument();
    });
  });

  it('applies domain accent border color for Technology', () => {
    render(<ManifestoSection manifesto={DOMAIN_MANIFESTOS[0]} />);

    const section = screen.getByLabelText('Technology domain');
    expect(section).toHaveClass('border-l-domain-technology');
  });

  it('applies domain accent border color for Finance', () => {
    render(<ManifestoSection manifesto={DOMAIN_MANIFESTOS[1]} />);

    const section = screen.getByLabelText('Finance & Financial Engineering domain');
    expect(section).toHaveClass('border-l-domain-finance');
  });

  it('applies domain accent border color for Impact', () => {
    render(<ManifestoSection manifesto={DOMAIN_MANIFESTOS[2]} />);

    const section = screen.getByLabelText('Impact & Sustainability domain');
    expect(section).toHaveClass('border-l-domain-impact');
  });

  it('applies domain accent border color for Governance', () => {
    render(<ManifestoSection manifesto={DOMAIN_MANIFESTOS[3]} />);

    const section = screen.getByLabelText('Governance domain');
    expect(section).toHaveClass('border-l-domain-governance');
  });

  it('uses h2 heading for domain title', () => {
    render(<ManifestoSection manifesto={manifesto} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(manifesto.title);
  });

  it('has aria-label on section', () => {
    render(<ManifestoSection manifesto={manifesto} />);

    expect(screen.getByLabelText(`${manifesto.title} domain`)).toBeInTheDocument();
  });
});

describe('ManifestoGrid', () => {
  it('renders all four domain sections', () => {
    render(<ManifestoGrid manifestos={DOMAIN_MANIFESTOS} />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Finance & Financial Engineering')).toBeInTheDocument();
    expect(screen.getByText('Impact & Sustainability')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('renders exactly 4 h2 headings for equal structure', () => {
    render(<ManifestoGrid manifestos={DOMAIN_MANIFESTOS} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(4);
  });
});

describe('AboutHero', () => {
  it('renders page heading', () => {
    render(<AboutHero />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Our Domains');
  });

  it('renders intro text about four pillars', () => {
    render(<AboutHero />);

    expect(screen.getByText(/four pillars of expertise/)).toBeInTheDocument();
  });
});

describe('AboutHeroSkeleton', () => {
  it('renders with status role', () => {
    render(<AboutHeroSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading about section')).toBeInTheDocument();
  });
});

describe('AboutSkeleton', () => {
  it('renders with status role', () => {
    render(<AboutSkeleton />);

    expect(screen.getByLabelText('Loading about page')).toBeInTheDocument();
  });
});
