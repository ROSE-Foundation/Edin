import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevisionSidebar } from './revision-sidebar';
import type { EditorialFeedbackDto, EditorProfileDto } from '@edin/shared';

const mockFeedback: EditorialFeedbackDto = {
  id: 'fb-1',
  articleId: 'art-1',
  editorId: 'editor-1',
  decision: 'REQUEST_REVISIONS',
  overallAssessment: 'The article needs work on structure and clarity in the introduction section.',
  revisionRequests: [
    { id: 'rr-1', description: 'Strengthen the introduction with clearer thesis', resolved: false },
    { id: 'rr-2', description: 'Add more supporting evidence in section 2', resolved: false },
  ],
  inlineComments: [
    {
      id: 'ic-1',
      content: 'This paragraph is unclear',
      highlightStart: 100,
      highlightEnd: 200,
      articleVersion: 1,
      resolved: false,
      createdAt: '2026-03-09T10:00:00Z',
    },
  ],
  articleVersion: 1,
  createdAt: '2026-03-09T10:00:00Z',
};

const mockEditor: EditorProfileDto = {
  id: 'editor-1',
  displayName: 'Jane Editor',
  profileImageUrl: null,
};

describe('RevisionSidebar', () => {
  it('renders editor profile with initial when no image', () => {
    render(<RevisionSidebar feedback={mockFeedback} editorProfile={mockEditor} />);

    expect(screen.getByText('J')).toBeDefined();
    expect(screen.getByText('Jane Editor')).toBeDefined();
    expect(screen.getByText('Editor')).toBeDefined();
  });

  it('renders overall assessment', () => {
    render(<RevisionSidebar feedback={mockFeedback} editorProfile={mockEditor} />);

    expect(screen.getByText('Overall Assessment')).toBeDefined();
    expect(
      screen.getByText(
        'The article needs work on structure and clarity in the introduction section.',
      ),
    ).toBeDefined();
  });

  it('renders numbered revision requests', () => {
    render(<RevisionSidebar feedback={mockFeedback} editorProfile={mockEditor} />);

    expect(screen.getByText('Revision Requests')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('Strengthen the introduction with clearer thesis')).toBeDefined();
    expect(screen.getByText('Add more supporting evidence in section 2')).toBeDefined();
  });

  it('renders inline comment summary', () => {
    render(<RevisionSidebar feedback={mockFeedback} editorProfile={mockEditor} />);

    expect(screen.getByText('Inline Comments (1)')).toBeDefined();
    expect(screen.getByText('This paragraph is unclear')).toBeDefined();
  });

  it('renders without editor profile', () => {
    render(<RevisionSidebar feedback={mockFeedback} editorProfile={null} />);

    expect(screen.getByText('Overall Assessment')).toBeDefined();
    expect(screen.queryByText('Jane Editor')).toBeNull();
  });

  it('hides revision requests section when empty', () => {
    const feedbackWithoutRequests = {
      ...mockFeedback,
      revisionRequests: [],
    };
    render(<RevisionSidebar feedback={feedbackWithoutRequests} editorProfile={mockEditor} />);

    expect(screen.queryByText('Revision Requests')).toBeNull();
  });
});
