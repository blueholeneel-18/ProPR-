import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';

vi.mock('../src/services/api.js', () => ({
  bugService: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    create: vi.fn(),
    assign: vi.fn(),
  },
  userService: {
    list: vi.fn().mockResolvedValue([]),
    me: vi.fn(),
  },
  healthService: {
    check: vi.fn().mockResolvedValue({ status: 'ok' }),
  },
  default: {},
}));

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('App smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the navbar and dashboard heading', async () => {
    renderApp('/');

    expect(screen.getByText('ProPR')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders the bugs page with an empty state', async () => {
    renderApp('/bugs');

    expect(await screen.findByRole('heading', { name: 'Bugs' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/no bugs match/i)).toBeInTheDocument();
    });
  });

  it('shows the 404 page for unknown routes', () => {
    renderApp('/nope');

    expect(screen.getByText(/404 - Page not found/i)).toBeInTheDocument();
  });
});
