import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../stores/uiStore';
import { Goals } from './Goals';

describe('Goals', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({
      intentions: [
        { id: 'g1', name: 'Morning weigh-in', done: false },
        { id: 'g2', name: 'Train today (gym or walk)', done: false },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles an intention with aria-pressed', () => {
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    const toggle = screen.getAllByRole('button', { name: /^train today/i })[0]!;
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(useUiStore.getState().intentions.find((item) => item.id === 'g2')?.done).toBe(true);
  });

  it('commits a new intention on submit', () => {
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/new intention/i), {
      target: { value: 'Stretch tonight' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(useUiStore.getState().intentions.some((item) => item.name === 'Stretch tonight')).toBe(
      true,
    );
    expect(screen.getByLabelText(/new intention/i)).toHaveValue('');
  });

  it('removes an intention', () => {
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /remove morning weigh-in/i }));
    expect(useUiStore.getState().intentions.some((item) => item.id === 'g1')).toBe(false);
  });
});
