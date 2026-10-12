import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { z } from 'zod';
import { applyStepIssues, useFormStepper } from '@/hooks/use-stepper';

function makeForm(values: Record<string, unknown> = {}, fieldErrors: unknown[] = []) {
  return {
    validateAllFields: vi.fn(async () => fieldErrors),
    state: { fieldMeta: { name: {}, price: {} }, values },
    setFieldMeta: vi.fn(),
    setErrorMap: vi.fn(),
    handleSubmit: vi.fn(async () => {})
  } as any;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('applyStepIssues', () => {
  it('groups messages per path with TanStack notation and marks the field touched', () => {
    const form = makeForm();
    applyStepIssues(form, [
      { path: ['a', 'b'], message: 'one' },
      { path: ['a', 'b'], message: 'two' },
      { path: ['items', 2, 'name'], message: 'idx' },
      { path: [3], message: 'root idx' }
    ]);
    const paths = form.setFieldMeta.mock.calls.map((c: any[]) => c[0]);
    expect(paths).toEqual(['a.b', 'items[2].name', '[3]']);

    const updater = form.setFieldMeta.mock.calls[0][1];
    expect(updater({ errorMap: { onChange: 'x' } })).toEqual({
      isTouched: true,
      errorMap: { onChange: 'x', onSubmit: [{ message: 'one' }, { message: 'two' }] }
    });
    // tolerates missing prior meta
    expect(updater(undefined)).toEqual({
      isTouched: true,
      errorMap: { onSubmit: [{ message: 'one' }, { message: 'two' }] }
    });
    expect(form.setErrorMap).not.toHaveBeenCalled();
  });

  it('surfaces pathless issues through the form-level error map', () => {
    const form = makeForm();
    applyStepIssues(form, [
      { path: [], message: 'cross' },
      { path: [], message: 'field' }
    ]);
    expect(form.setFieldMeta).not.toHaveBeenCalled();
    expect(form.setErrorMap).toHaveBeenCalledWith({ onServer: 'cross field' });
  });

  it('ignores pathless issues when the form cannot set an error map', () => {
    const form = makeForm();
    delete form.setErrorMap;
    expect(() => applyStepIssues(form, [{ path: [], message: 'cross' }])).not.toThrow();
  });

  it('does nothing for no issues', () => {
    const form = makeForm();
    applyStepIssues(form, []);
    expect(form.setFieldMeta).not.toHaveBeenCalled();
    expect(form.setErrorMap).not.toHaveBeenCalled();
  });
});

describe('useFormStepper', () => {
  const s1 = z.object({ name: z.string().min(2, 'short') });
  const s2 = z.object({ desc: z.string().min(3, 'short desc') });
  const s3 = z.object({});

  it('starts on step 1 and navigates within bounds', () => {
    const { result } = renderHook(() => useFormStepper([s1, s2, s3]));
    expect(result.current.currentStep).toBe(1);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.step).toMatchObject({ value: 1, count: 3, isCompleted: false });
    expect(result.current.currentValidator).toBe(s1);

    act(() => result.current.step.goToNextStep());
    expect(result.current.currentValidator).toBe(s2);
    expect(result.current.isFirstStep).toBe(false);
    act(() => result.current.step.goToNextStep());
    act(() => result.current.step.goToNextStep());
    expect(result.current.currentStep).toBe(3);
    expect(result.current.step.isCompleted).toBe(true);

    act(() => result.current.step.goToPrevStep());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.step.goToPrevStep());
    act(() => result.current.step.goToPrevStep());
    expect(result.current.currentStep).toBe(1);

    act(() => result.current.step.goToStep(99));
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.step.goToStep(-4));
    expect(result.current.currentStep).toBe(1);
  });

  it('triggerFormGroup succeeds for valid values and touches every mounted field', async () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    const form = makeForm({ name: 'okay' });
    let res: any;
    await act(async () => {
      res = await result.current.triggerFormGroup(form);
    });
    expect(res.success).toBe(true);
    expect(form.validateAllFields).toHaveBeenCalledWith('submit');
    expect(form.setFieldMeta.mock.calls.map((c: any[]) => c[0])).toEqual(['name', 'price']);
    expect(form.setFieldMeta.mock.calls[0][1]({ isTouched: false })).toEqual({ isTouched: true });
  });

  it('triggerFormGroup fails and paints step schema issues', async () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    const form = makeForm({ name: 'x' });
    let res: any;
    await act(async () => {
      res = await result.current.triggerFormGroup(form);
    });
    expect(res.success).toBe(false);
    // touched pass (2) + painted issue (1)
    expect(form.setFieldMeta).toHaveBeenCalledTimes(3);
    expect(form.setFieldMeta.mock.calls[2][0]).toBe('name');
  });

  it('triggerFormGroup fails when mounted field validators report errors', async () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    const form = makeForm({ name: 'okay' }, [[undefined], [['taken']]]);
    let res: any;
    await act(async () => {
      res = await result.current.triggerFormGroup(form);
    });
    expect(res.success).toBe(false);
  });

  it('does not advance when the step is invalid', async () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    await act(async () => {
      await result.current.handleNextStepOrSubmit(makeForm({ name: '' }));
    });
    expect(result.current.currentStep).toBe(1);
  });

  it('advances when the step is valid', async () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    const form = makeForm({ name: 'okay' });
    await act(async () => {
      await result.current.handleNextStepOrSubmit(form);
    });
    expect(result.current.currentStep).toBe(2);
    expect(form.handleSubmit).not.toHaveBeenCalled();
  });

  it('submits on the final step when no full schema is given', async () => {
    const { result } = renderHook(() => useFormStepper([s1]));
    const form = makeForm({ name: 'okay' });
    await act(async () => {
      await result.current.handleNextStepOrSubmit(form);
    });
    expect(form.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits on the final step when the full schema passes', async () => {
    const full = z.object({ name: z.string().min(2) });
    const { result } = renderHook(() => useFormStepper([s1], { fullSchema: full }));
    const form = makeForm({ name: 'okay' });
    await act(async () => {
      await result.current.handleNextStepOrSubmit(form);
    });
    expect(form.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('jumps back to the first failing step when the full schema fails', async () => {
    vi.useFakeTimers();
    const full = z.object({ name: z.string().min(2), desc: z.string().min(3) });
    const { result } = renderHook(() => useFormStepper([s1, s2], { fullSchema: full }));
    act(() => result.current.step.goToStep(2));
    // step 2 is valid, but step 1's value regressed
    const form = makeForm({ name: '', desc: 'long enough' });
    // the current (step 2) validator passes; full schema fails on `name`
    await act(async () => {
      await result.current.handleNextStepOrSubmit(form);
    });
    expect(result.current.currentStep).toBe(1);
    expect(form.handleSubmit).not.toHaveBeenCalled();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(form.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks and paints cross-step issues that no single step owns', async () => {
    const full = z
      .object({ name: z.string(), desc: z.string() })
      .refine(() => false, 'cross-step problem');
    const { result } = renderHook(() => useFormStepper([s1, s2], { fullSchema: full }));
    act(() => result.current.step.goToStep(2));
    const form = makeForm({ name: 'okay', desc: 'long enough' });
    await act(async () => {
      await result.current.handleNextStepOrSubmit(form);
    });
    expect(form.handleSubmit).not.toHaveBeenCalled();
    expect(form.setErrorMap).toHaveBeenCalledWith({ onServer: 'cross-step problem' });
    expect(result.current.currentStep).toBe(2);
  });

  it('handleCancelOrBack goes back after step 1 and cancels on step 1', () => {
    const { result } = renderHook(() => useFormStepper([s1, s2]));
    const onBack = vi.fn();
    const onCancel = vi.fn();

    act(() => result.current.handleCancelOrBack({ onBack, onCancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();

    act(() => result.current.handleCancelOrBack()); // no opts on step 1
    act(() => result.current.step.goToNextStep());
    act(() => result.current.handleCancelOrBack({ onBack, onCancel }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(result.current.currentStep).toBe(1);

    act(() => result.current.step.goToNextStep());
    act(() => result.current.handleCancelOrBack()); // no opts after step 1
    expect(result.current.currentStep).toBe(1);
  });
});
