import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionSelector } from './version-selector';
import type { ArticleVersionDto } from '@edin/shared';

const mockVersions: ArticleVersionDto[] = [
  { versionNumber: 1, createdAt: '2026-03-01T10:00:00Z' },
  { versionNumber: 2, createdAt: '2026-03-05T10:00:00Z' },
];

describe('VersionSelector', () => {
  it('renders version dropdown', () => {
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={null}
        onSelectVersion={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Select article version')).toBeDefined();
  });

  it('shows current version as default', () => {
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={null}
        onSelectVersion={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Select article version') as HTMLSelectElement;
    expect(select.value).toBe('current');
  });

  it('lists all previous versions sorted by version number descending', () => {
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={null}
        onSelectVersion={vi.fn()}
      />,
    );

    const options = screen.getAllByRole('option');
    // current + 2 versions = 3 options
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('Current (v3)');
    expect(options[1].textContent).toContain('v2');
    expect(options[2].textContent).toContain('v1');
  });

  it('calls onSelectVersion with version number when a version is selected', () => {
    const onSelect = vi.fn();
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={null}
        onSelectVersion={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('Select article version'), {
      target: { value: '1' },
    });
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onSelectVersion with null when current is selected', () => {
    const onSelect = vi.fn();
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={1}
        onSelectVersion={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('Select article version'), {
      target: { value: 'current' },
    });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows read-only indicator when a past version is selected', () => {
    render(
      <VersionSelector
        versions={mockVersions}
        currentVersion={3}
        selectedVersion={1}
        onSelectVersion={vi.fn()}
      />,
    );

    expect(screen.getByText('(read-only)')).toBeDefined();
  });

  it('returns null when versions array is empty', () => {
    const { container } = render(
      <VersionSelector
        versions={[]}
        currentVersion={1}
        selectedVersion={null}
        onSelectVersion={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});
