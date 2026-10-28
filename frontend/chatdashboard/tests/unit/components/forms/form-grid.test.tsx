import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FormGrid, FormRow, WIDE_FORM_MODAL } from '@/components/forms/form-grid';

afterEach(cleanup);

describe('FormGrid', () => {
  it('lays fields out in two columns and lets a row span both', () => {
    render(
      <FormGrid data-testid='grid'>
        <div>left</div>
        <FormRow data-testid='row'>wide</FormRow>
      </FormGrid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid', 'sm:grid-cols-2');
    expect(grid).not.toHaveClass('flex');
    expect(screen.getByTestId('row')).toHaveClass('sm:col-span-2');
  });

  it('widens the modal past the default width', () => {
    expect(WIDE_FORM_MODAL).toContain('data-[side=center]:sm:max-w-2xl');
  });
});
