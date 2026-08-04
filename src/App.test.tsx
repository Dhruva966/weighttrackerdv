import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

function renderApp(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('workout navigation surfaces', () => {
  it('shows the gym calendar on Grow instead of Move', () => {
    const grow = renderApp('/grow');
    expect(screen.getByLabelText('Workout calendar')).toBeInTheDocument();
    grow.unmount();

    renderApp('/move');
    expect(screen.queryByLabelText('Workout calendar')).not.toBeInTheDocument();
  });

  it('shows a daily attributed quote on Grow instead of the old pot copy', () => {
    renderApp('/grow');
    expect(screen.getByRole('heading', { name: /your pot of gold/i })).toBeInTheDocument();
    expect(screen.queryByText(/consistency fills the pot/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^— /)).toBeInTheDocument();
  });

  it('exposes Library in the bottom nav and opens the exercise library', () => {
    renderApp('/exercises');
    const libraryTab = screen.getByRole('navigation').querySelector('a[href="/exercises"]');
    expect(libraryTab).toBeTruthy();
    expect(libraryTab).toHaveTextContent(/library/i);
    expect(screen.getByRole('heading', { name: /exercise library/i })).toBeInTheDocument();
  });

  it('routes logo home and You header into shell destinations', () => {
    renderApp('/today');
    expect(screen.getByRole('link', { name: /lift home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /you and settings/i })).toHaveAttribute('href', '/you');
  });

  it('keeps five bottom-nav destinations including Today and You', () => {
    renderApp('/you');
    const nav = screen.getByRole('navigation');
    expect(nav.querySelector('a[href="/move"]')).toBeTruthy();
    expect(nav.querySelector('a[href="/today"]')).toBeTruthy();
    expect(nav.querySelector('a[href="/grow"]')).toBeTruthy();
    expect(nav.querySelector('a[href="/exercises"]')).toBeTruthy();
    expect(nav.querySelector('a[href="/you"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: /open intentions/i })).toHaveAttribute('href', '/goals');
  });
});
