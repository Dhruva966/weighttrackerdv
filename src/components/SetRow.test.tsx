import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LoggedSet } from '../types';
import { SetRow } from './SetRow';

const sampleSet: LoggedSet = {
  id: 'set-1',
  sessionId: 'session-1',
  exerciseId: 'ex-1',
  setNumber: 2,
  weightLb: 115,
  reps: 8,
  isWarmup: false,
  isPr: false,
  createdAt: '2026-07-18T12:00:00.000Z',
};

describe('SetRow', () => {
  it('renders weight and set number without a trash control by default', () => {
    render(<SetRow setItem={sampleSet} />);

    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('115 lb x 8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete set/i })).not.toBeInTheDocument();
  });

  it('calls onDelete with the set id when trash is tapped', () => {
    const onDelete = vi.fn();
    render(<SetRow setItem={sampleSet} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete set 2' }));
    expect(onDelete).toHaveBeenCalledWith('set-1');
  });
});
