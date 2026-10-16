import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIAssistPanel from '../src/components/AIAssistPanel.jsx';

vi.mock('../src/services/api.js', () => ({
  bugService: {
    aiTriage: vi.fn(),
    aiSuggestAssignee: vi.fn(),
  },
}));

import { bugService } from '../src/services/api.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const triageResult = {
  suggested_priority: 'critical',
  suggested_severity: 'major',
  summary: 'Database timeout: connections exhausted under load',
  possible_root_cause: 'Likely database connection pool exhaustion.',
  source: 'mock',
};

describe('AIAssistPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the AI triage action and previews suggestions', async () => {
    const user = userEvent.setup();
    bugService.aiTriage.mockResolvedValue(triageResult);
    const onTriageResult = vi.fn();

    render(
      <AIAssistPanel
        triagePayload={{ title: 'DB timeout', description: 'connections exhausted' }}
        onTriageResult={onTriageResult}
      />
    );

    await user.click(screen.getByTestId('ai-triage-button'));

    expect(await screen.findByTestId('ai-triage-result')).toBeInTheDocument();
    expect(screen.getByTestId('ai-suggested-priority')).toHaveTextContent('Critical');
    expect(screen.getByTestId('ai-suggested-severity')).toHaveTextContent('Major');
    expect(screen.getByText(/connection pool exhaustion/i)).toBeInTheDocument();
    expect(onTriageResult).toHaveBeenCalledWith(triageResult);
  });

  it('shows a loading state while triage is in flight', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    bugService.aiTriage.mockReturnValue(pending.promise);

    render(
      <AIAssistPanel
        triagePayload={{ title: 'DB timeout', description: 'connections exhausted' }}
      />
    );

    await user.click(screen.getByTestId('ai-triage-button'));

    expect(screen.getByTestId('ai-triage-loading')).toBeInTheDocument();

    pending.resolve(triageResult);

    await waitFor(() => {
      expect(screen.queryByTestId('ai-triage-loading')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-triage-result')).toBeInTheDocument();
  });

  it('renders assignee recommendations and assigns a candidate', async () => {
    const user = userEvent.setup();
    bugService.aiSuggestAssignee.mockResolvedValue({
      recommendations: [
        { userId: 7, name: 'Ada Lovelace', matchScore: 95, reason: 'strong match' },
        { userId: 8, name: 'Alan Turing', matchScore: 72, reason: 'available' },
      ],
    });
    const onAssign = vi.fn().mockResolvedValue(undefined);

    render(<AIAssistPanel bugId={1} onAssign={onAssign} />);

    await user.click(screen.getByTestId('ai-suggest-button'));

    const candidates = await screen.findAllByTestId('ai-candidate');
    expect(candidates).toHaveLength(2);

    const badges = screen.getAllByTestId('ai-match-badge');
    expect(badges[0]).toHaveTextContent('95% Match');
    expect(screen.getByText('strong match')).toBeInTheDocument();

    await user.click(screen.getByTestId('ai-assign-7'));

    await waitFor(() => {
      expect(onAssign).toHaveBeenCalledWith(7, expect.objectContaining({ userId: 7 }));
    });
    expect(await screen.findByText('Assigned')).toBeInTheDocument();
  });

  it('shows an error banner when the AI triage request fails', async () => {
    const user = userEvent.setup();
    bugService.aiTriage.mockRejectedValue(new Error('AI service offline'));

    render(
      <AIAssistPanel
        triagePayload={{ title: 'DB timeout', description: 'connections exhausted' }}
      />
    );

    await user.click(screen.getByTestId('ai-triage-button'));

    const banner = await screen.findByTestId('ai-triage-error');
    expect(banner).toHaveTextContent('AI service offline');
    expect(banner).toHaveAttribute('role', 'alert');
  });

  it('shows an error banner when assignee suggestions fail', async () => {
    const user = userEvent.setup();
    bugService.aiSuggestAssignee.mockRejectedValue(new Error('AI service offline'));

    render(<AIAssistPanel bugId={3} onAssign={vi.fn()} />);

    await user.click(screen.getByTestId('ai-suggest-button'));

    const banner = await screen.findByTestId('ai-assign-error');
    expect(banner).toHaveTextContent('AI service offline');
  });
});
