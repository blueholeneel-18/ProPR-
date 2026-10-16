import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BugList from '../src/pages/BugList.jsx';

const sampleBugs = [
  { id: 1, title: 'Login fails on Safari', status: 'open', priority: 'high', assigned_to: null },
  { id: 2, title: 'Typo on dashboard', status: 'assigned', priority: 'low', assigned_to: 4 },
];

const createMock = vi.fn().mockResolvedValue({ id: 3, title: 'New bug' });

vi.mock('../src/services/api.js', () => ({
  bugService: {
    list: vi.fn(),
    create: (...args) => createMock(...args),
  },
  userService: {},
}));

import { bugService } from '../src/services/api.js';

function renderBugList() {
  return render(
    <MemoryRouter>
      <BugList />
    </MemoryRouter>
  );
}

describe('BugList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bugService.list.mockResolvedValue(sampleBugs);
  });

  it('renders bugs returned by the API', async () => {
    renderBugList();

    expect(await screen.findByText('Login fails on Safari')).toBeInTheDocument();
    expect(screen.getByText('Typo on dashboard')).toBeInTheDocument();
    expect(screen.getAllByText('high').length).toBeGreaterThan(0);
  });

  it('opens the report bug modal and submits a new bug', async () => {
    const user = userEvent.setup();
    renderBugList();

    await screen.findByText('Login fails on Safari');

    await user.click(screen.getByRole('button', { name: /report bug/i }));

    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'New crash on save');

    await user.click(screen.getByRole('button', { name: /create bug/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New crash on save' })
      );
    });
  });

  it('shows the empty state when no bugs are returned', async () => {
    bugService.list.mockResolvedValue([]);
    renderBugList();

    expect(await screen.findByText(/no bugs match/i)).toBeInTheDocument();
  });
});
