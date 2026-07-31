import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseForm } from './ExerciseForm';

describe('ExerciseForm muscle options', () => {
  it('offers specific muscle groups and omits broad arms/legs', () => {
    render(
      <ExerciseForm
        title="Create exercise"
        description="Add one"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/muscle group/i);
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.value);

    expect(options).not.toContain('arms');
    expect(options).not.toContain('legs');
    expect(options).toEqual(
      expect.arrayContaining(['biceps', 'triceps', 'quads', 'hamstrings', 'chest', 'glutes']),
    );
  });
});
