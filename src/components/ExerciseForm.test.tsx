import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseForm, FORM_EQUIPMENT_KINDS } from './ExerciseForm';

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

  it('includes band equipment so PDF band rows can be saved', () => {
    render(
      <ExerciseForm
        title="Edit exercise"
        description="Fix one"
        submitLabel="Save Changes"
        initial={{ name: 'Band Pull', muscleGroup: 'back', equipment: 'band' }}
        onSubmit={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/equipment/i);
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.value);
    expect(options).toContain('band');
    expect(FORM_EQUIPMENT_KINDS).toContain('band');
    expect(select).toHaveValue('band');
  });

  it('rejects short names and calls cancel without submitting', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <ExerciseForm
        title="Create exercise"
        description="Add one"
        submitLabel="Save Exercise"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/name, muscle group, and equipment are required/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
