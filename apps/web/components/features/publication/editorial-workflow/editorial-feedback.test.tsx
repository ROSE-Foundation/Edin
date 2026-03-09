import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorialFeedbackForm } from './editorial-feedback';

describe('EditorialFeedbackForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockReset();
  });

  it('renders all decision options', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    expect(screen.getByText('Approve')).toBeDefined();
    expect(screen.getByText('Request Revisions')).toBeDefined();
    expect(screen.getByText('Reject')).toBeDefined();
  });

  it('renders the overall assessment textarea', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    expect(
      screen.getByPlaceholderText('Provide your overall assessment of the article...'),
    ).toBeDefined();
  });

  it('disables submit button when no decision is selected', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    const submitBtn = screen.getByText('Submit Feedback') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows error when assessment is too short', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Approve'));
    fireEvent.change(
      screen.getByPlaceholderText('Provide your overall assessment of the article...'),
      { target: { value: 'Short' } },
    );
    fireEvent.click(screen.getByText('Approve Article'));

    expect(screen.getByText('Overall assessment must be at least 10 characters')).toBeDefined();
  });

  it('shows revision requests section when REQUEST_REVISIONS selected', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Request Revisions'));
    expect(screen.getByText('+ Add revision request')).toBeDefined();
  });

  it('requires at least one revision request when requesting revisions', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Request Revisions'));
    fireEvent.change(
      screen.getByPlaceholderText('Provide your overall assessment of the article...'),
      { target: { value: 'This needs significant revisions to meet standards' } },
    );
    fireEvent.click(screen.getByText('Request Revisions', { selector: 'button:last-of-type' }));

    expect(
      screen.getByText('At least one revision request is required when requesting revisions'),
    ).toBeDefined();
  });

  it('submits feedback with approve decision', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Approve'));
    fireEvent.change(
      screen.getByPlaceholderText('Provide your overall assessment of the article...'),
      { target: { value: 'Excellent article, well-written and thorough' } },
    );
    fireEvent.click(screen.getByText('Approve Article'));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      decision: 'APPROVE',
      overallAssessment: 'Excellent article, well-written and thorough',
      revisionRequests: [],
      inlineComments: [],
    });
  });

  it('changes submit button label based on decision', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Approve'));
    expect(screen.getByText('Approve Article')).toBeDefined();

    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByText('Reject Article')).toBeDefined();
  });

  it('disables submit button when isSubmitting is true', () => {
    render(<EditorialFeedbackForm onSubmit={mockOnSubmit} isSubmitting={true} />);

    fireEvent.click(screen.getByText('Approve'));
    const submitBtn = screen.getByText('Submitting...');
    expect(submitBtn).toBeDefined();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
