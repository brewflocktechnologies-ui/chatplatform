import { describe, expect, it, vi } from 'vitest';

// The field components pull in the full shadcn component tree; stub them so
// this test only exercises src/lib/form.ts itself.
vi.mock('@/components/forms/fields/text-field', () => ({ TextField: () => null }));
vi.mock('@/components/forms/fields/textarea-field', () => ({ TextareaField: () => null }));
vi.mock('@/components/forms/fields/select-field', () => ({ SelectField: () => null }));
vi.mock('@/components/forms/fields/checkbox-field', () => ({ CheckboxField: () => null }));
vi.mock('@/components/forms/fields/switch-field', () => ({ SwitchField: () => null }));
vi.mock('@/components/forms/fields/radio-group-field', () => ({ RadioGroupField: () => null }));
vi.mock('@/components/forms/fields/slider-field', () => ({ SliderField: () => null }));
vi.mock('@/components/forms/fields/combobox-field', () => ({ ComboboxField: () => null }));
vi.mock('@/components/forms/fields/date-picker-field', () => ({
  DatePickerField: () => null,
  DateRangeField: () => null
}));
vi.mock('@/components/forms/fields/otp-field', () => ({ OtpField: () => null }));
vi.mock('@/components/forms/fields/color-field', () => ({ ColorField: () => null }));
vi.mock('@/components/forms/fields/file-upload-field', () => ({ FileUploadField: () => null }));
vi.mock('@/components/forms/fields/checkbox-group-field', () => ({
  CheckboxGroupField: () => null
}));
vi.mock('@/components/forms/fields/tags-field', () => ({ TagsField: () => null }));
vi.mock('@/components/forms/fields/toggle-group-field', () => ({ ToggleGroupField: () => null }));
vi.mock('@/components/forms/submit-button', () => ({ SubmitButton: () => null }));

import { useAppForm, withForm } from '@/lib/form';

describe('form hook module', () => {
  it('creates the app-wide form hook', () => {
    expect(typeof useAppForm).toBe('function');
  });

  it('creates the withForm helper', () => {
    expect(typeof withForm).toBe('function');
  });
});
