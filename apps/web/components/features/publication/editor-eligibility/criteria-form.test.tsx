import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EditorEligibilityCriteriaDto } from '@edin/shared';
import { CriteriaForm } from './criteria-form';

const mockCriteria: EditorEligibilityCriteriaDto = {
  id: 'crit-1',
  domain: 'Technology',
  minContributionCount: 10,
  minGovernanceWeight: 0,
  maxConcurrentAssignments: 5,
  updatedAt: '2026-03-09T00:00:00Z',
};

describe('CriteriaForm', () => {
  it('renders domain name', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={false} />);
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders current values in inputs', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={false} />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(10);
    expect(inputs[1]).toHaveValue(0);
    expect(inputs[2]).toHaveValue(5);
  });

  it('disables save when no changes', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={false} />);
    expect(screen.getByText('Save Changes')).toBeDisabled();
  });

  it('enables save when value changes', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={false} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '15' } });
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('calls onSave with only changed values', () => {
    const onSave = vi.fn();
    render(<CriteriaForm criteria={mockCriteria} onSave={onSave} isSaving={false} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '15' } });
    fireEvent.click(screen.getByText('Save Changes'));
    expect(onSave).toHaveBeenCalledWith('Technology', { minContributionCount: 15 });
  });

  it('shows governance weight phase 2 note', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={false} />);
    expect(screen.getByText(/Phase 2/)).toBeInTheDocument();
  });

  it('shows saving state', () => {
    render(<CriteriaForm criteria={mockCriteria} onSave={vi.fn()} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});
