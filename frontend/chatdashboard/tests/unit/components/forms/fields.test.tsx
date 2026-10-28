import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { useAppForm } from '@/lib/form';
import { ToggleGroupItem } from '@/components/ui/toggle-group';

afterEach(cleanup);

/**
 * Mounts a real useAppForm with the given default values + zod schema and
 * renders whatever field(s) `fields` returns. Exposes a submit button.
 */
function Harness<T extends Record<string, unknown>>({
  defaultValues,
  schema,
  onSubmit = () => {},
  fields,
  onForm
}: {
  defaultValues: T;
  schema?: z.ZodType;
  onSubmit?: (v: T) => void;
  fields: (form: any) => React.ReactNode;
  onForm?: (form: any) => void;
}) {
  const form = useAppForm({
    defaultValues,
    validators: schema ? { onSubmit: schema as never } : undefined,
    onSubmit: ({ value }) => onSubmit(value as T)
  });
  onForm?.(form);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {fields(form)}
      <form.AppForm>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

const submit = async () => {
  await act(async () => {
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
  });
};

describe('TextField', () => {
  const schema = z.object({
    name: z.string().min(2, 'Name too short'),
    age: z.number({ error: 'Age is required' })
  });

  it('edits string values, shows required marker, description and validation error', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ name: '', age: 3 as number | undefined }}
        schema={schema}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='name'>
            {(field: any) => (
              <field.TextField label='Name' required description='Your name' placeholder='nm' />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Your name')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Name too short')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('nm')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('nm'), { target: { value: 'Bob' } });
    fireEvent.blur(screen.getByPlaceholderText('nm'));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Bob', age: 3 }));
  });

  it('converts number inputs and clears to undefined', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ name: 'ok', age: 3 as number | undefined }}
        schema={schema}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='age'>
            {(field: any) => <field.TextField label='Age' type='number' />}
          </form.AppField>
        )}
      />
    );
    const input = screen.getByLabelText('Age');
    fireEvent.change(input, { target: { value: '42' } });
    expect(formRef.state.values.age).toBe(42);
    fireEvent.change(input, { target: { value: '' } });
    expect(formRef.state.values.age).toBeUndefined();
    await submit();
    expect(await screen.findByText('Age is required')).toBeInTheDocument();
  });

  it('shows a spinner while async validation runs', async () => {
    let resolve!: () => void;
    render(
      <Harness
        defaultValues={{ name: '' }}
        fields={(form) => (
          <form.AppField
            name='name'
            validators={{
              onChangeAsync: () => new Promise<undefined>((r) => (resolve = () => r(undefined)))
            }}
          >
            {(field: any) => <field.TextField label='Name' />}
          </form.AppField>
        )}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'a' } });
    await waitFor(() =>
      expect(document.querySelector('[role="status"], svg.animate-spin')).toBeTruthy()
    );
    await act(async () => resolve());
  });
});

describe('TextareaField', () => {
  it('edits, counts characters and validates', async () => {
    render(
      <Harness
        defaultValues={{ bio: '' }}
        schema={z.object({ bio: z.string().min(5, 'Bio too short') })}
        fields={(form) => (
          <form.AppField name='bio'>
            {(field: any) => (
              <field.TextareaField label='Bio' required showCount maxLength={50} description='d' />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('0 / 50')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Bio/), { target: { value: 'abc' } });
    expect(screen.getByText('3 / 50')).toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText(/Bio/));
    await submit();
    expect(await screen.findByText('Bio too short')).toBeInTheDocument();
  });

  it('omits the counter without showCount', () => {
    render(
      <Harness
        defaultValues={{ bio: '' }}
        fields={(form) => (
          <form.AppField name='bio'>
            {(field: any) => <field.TextareaField label='Bio' maxLength={50} />}
          </form.AppField>
        )}
      />
    );
    expect(screen.queryByText(/\/ 50/)).not.toBeInTheDocument();
  });
});

describe('CheckboxField', () => {
  it('toggles and shows error', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ terms: false }}
        schema={z.object({ terms: z.boolean().refine((v) => v, 'Must accept') })}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='terms'>
            {(field: any) => <field.CheckboxField label='Terms' required description='read it' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('read it')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Must accept')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ terms: true }));
  });
});

describe('SwitchField', () => {
  it('toggles and shows error', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ on: false }}
        schema={z.object({ on: z.boolean().refine((v) => v, 'Must be on') })}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='on'>
            {(field: any) => <field.SwitchField label='Enable' required description='desc' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('desc')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Must be on')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ on: true }));
  });
});

describe('CheckboxGroupField', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma', disabled: true }
  ];
  it('pushes and removes values, validates', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ picks: [] as string[] }}
        schema={z.object({ picks: z.array(z.string()).min(1, 'Pick one') })}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='picks' mode='array'>
            {(field: any) => (
              <field.CheckboxGroupField
                label='Picks'
                required
                description='choose'
                options={options}
                className='grid'
              />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Picks *')).toBeInTheDocument();
    expect(screen.getByText('choose')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Pick one')).toBeInTheDocument();

    const alpha = screen.getByRole('checkbox', { name: 'Alpha' });
    const beta = screen.getByRole('checkbox', { name: 'Beta' });
    fireEvent.click(alpha);
    fireEvent.click(beta);
    fireEvent.click(alpha); // remove again
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ picks: ['b'] }));
  });
});

describe('RadioGroupField', () => {
  it('selects an option and shows errors', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ plan: '' }}
        schema={z.object({ plan: z.string().min(1, 'Choose a plan') })}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='plan'>
            {(field: any) => (
              <field.RadioGroupField
                label='Plan'
                required
                description='pick'
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'ent', label: 'Enterprise', disabled: true }
                ]}
              />
            )}
          </form.AppField>
        )}
      />
    );
    await submit();
    expect(await screen.findByText('Choose a plan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Pro' }));
    fireEvent.blur(screen.getByRole('radio', { name: 'Pro' }));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ plan: 'pro' }));
  });
});

describe('SelectField', () => {
  it('opens, picks an option and shows errors', async () => {
    const onSubmit = vi.fn();
    let formRef: any;
    render(
      <Harness
        defaultValues={{ color: '' }}
        schema={z.object({ color: z.string().min(1, 'Pick a color') })}
        onSubmit={onSubmit}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='color'>
            {(field: any) => (
              <field.SelectField
                label='Color'
                required
                description='fav'
                placeholder='Choose'
                options={[
                  { value: 'red', label: 'Red' },
                  { value: 'blue', label: 'Blue', disabled: true },
                  { value: 'green', label: 'Green' }
                ]}
              />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Choose')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Pick a color')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox'));
    const green = await screen.findByRole('option', { name: 'Green' });
    // Base UI only accepts an item click once the pointer has hovered it.
    fireEvent.pointerMove(green);
    fireEvent.mouseMove(green);
    fireEvent.click(green);
    await waitFor(() => expect(formRef.state.values.color).toBe('green'));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ color: 'green' }));
  });

  it('shows the label, not the raw value, for a preselected option while closed', () => {
    render(
      <Harness
        defaultValues={{ customer: '7953' }}
        fields={(form) => (
          <form.AppField name='customer'>
            {(field: any) => (
              <field.SelectField
                label='Customer'
                options={[{ value: '7953', label: 'ref@example.com' }]}
              />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('ref@example.com')).toBeInTheDocument();
    expect(screen.queryByText('7953')).not.toBeInTheDocument();
  });
});

describe('SliderField', () => {
  it('renders bounds, current value and updates through keyboard', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ vol: 10 }}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='vol'>
            {(field: any) => (
              <field.SliderField label='Volume' min={0} max={20} step={5} description='loud' />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('loud')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    const thumb = document.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(thumb, { target: { value: '15' } });
    await waitFor(() => expect(formRef.state.values.vol).toBe(15));
    fireEvent.blur(thumb);
  });

  it('uses default bounds', () => {
    render(
      <Harness
        defaultValues={{ vol: 1 }}
        fields={(form) => (
          <form.AppField name='vol'>
            {(field: any) => <field.SliderField label='Volume' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

describe('ColorField', () => {
  it('syncs the color input and hex text input', () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ color: '#ff0000' }}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='color'>
            {(field: any) => <field.ColorField label='Brand' description='pick' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('pick')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Brand', { selector: 'input' }), {
      target: { value: '#00ff00' }
    });
    expect(formRef.state.values.color).toBe('#00ff00');
    fireEvent.change(screen.getByLabelText('Brand hex value'), { target: { value: '#123456' } });
    expect(formRef.state.values.color).toBe('#123456');
  });
});

describe('OtpField', () => {
  it('accepts digits and shows errors', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ code: '' }}
        schema={z.object({ code: z.string().length(6, 'Need 6 digits') })}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='code'>
            {(field: any) => <field.OtpField label='Code' required description='sent by sms' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('sent by sms')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Code', { selector: 'input' }), {
      target: { value: '123456' }
    });
    expect(formRef.state.values.code).toBe('123456');
    fireEvent.change(screen.getByLabelText('Code', { selector: 'input' }), {
      target: { value: '12' }
    });
    await submit();
    expect(await screen.findByText('Need 6 digits')).toBeInTheDocument();
  });
});

describe('TagsField', () => {
  it('adds via Enter and button, ignores blanks and duplicates, removes', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ tags: [] as string[] }}
        schema={z.object({ tags: z.array(z.string()).min(2, 'Need two tags') })}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='tags' mode='array'>
            {(field: any) => <field.TagsField label='Tags' required description='free text' />}
          </form.AppField>
        )}
      />
    );
    const input = screen.getByLabelText('Add a tags');
    fireEvent.click(screen.getByRole('button', { name: 'Add' })); // blank
    expect(formRef.state.values.tags).toEqual([]);

    fireEvent.change(input, { target: { value: ' one ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(formRef.state.values.tags).toEqual(['one']);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'one' } }); // duplicate
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(formRef.state.values.tags).toEqual(['one']);

    fireEvent.keyDown(input, { key: 'a' }); // non-enter ignored
    fireEvent.change(input, { target: { value: 'two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(formRef.state.values.tags).toEqual(['one', 'two']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove one' }));
    expect(formRef.state.values.tags).toEqual(['two']);
    await submit();
    expect(await screen.findByText('Need two tags')).toBeInTheDocument();
  });
});

describe('ToggleGroupField', () => {
  it('toggles multiple values', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ days: [] as string[] }}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='days' mode='array'>
            {(field: any) => (
              <field.ToggleGroupField label='Days' description='which'>
                <ToggleGroupItem value='mon'>Mon</ToggleGroupItem>
                <ToggleGroupItem value='tue'>Tue</ToggleGroupItem>
              </field.ToggleGroupField>
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('which')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tue' }));
    await waitFor(() => expect(formRef.state.values.days).toEqual(['mon', 'tue']));
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
    await waitFor(() => expect(formRef.state.values.days).toEqual(['tue']));
  });

  it('falls back to an empty selection when the value is undefined', () => {
    render(
      <Harness
        defaultValues={{ days: undefined as unknown as string[] }}
        fields={(form) => (
          <form.AppField name='days' mode='array'>
            {(field: any) => (
              <field.ToggleGroupField label='Days'>
                <ToggleGroupItem value='mon'>Mon</ToggleGroupItem>
              </field.ToggleGroupField>
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument();
  });
});

describe('ComboboxField', () => {
  const options = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'svelte', label: 'Svelte', disabled: true }
  ];
  it('shows placeholder, filters, selects and shows errors', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        defaultValues={{ fw: '' }}
        schema={z.object({ fw: z.string().min(1, 'Pick a framework') })}
        onSubmit={onSubmit}
        fields={(form) => (
          <form.AppField name='fw'>
            {(field: any) => (
              <field.ComboboxField
                label='Framework'
                required
                description='lib'
                options={options}
                placeholder='Choose one'
                searchPlaceholder='Find...'
                emptyMessage='Nothing'
              />
            )}
          </form.AppField>
        )}
      />
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Choose one');
    await submit();
    expect(await screen.findByText('Pick a framework')).toBeInTheDocument();

    fireEvent.click(trigger);
    const search = await screen.findByPlaceholderText('Find...');
    fireEvent.change(search, { target: { value: 'zzzz' } });
    expect(await screen.findByText('Nothing')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'Vue' } });
    fireEvent.click(await screen.findByText('Vue'));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Vue'));
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ fw: 'vue' }));
  });

  it('uses default placeholders', async () => {
    render(
      <Harness
        defaultValues={{ fw: '' }}
        fields={(form) => (
          <form.AppField name='fw'>
            {(field: any) => <field.ComboboxField label='Framework' options={options} />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Select an option');
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByPlaceholderText('Search...')).toBeInTheDocument();
  });
});

describe('DatePickerField', () => {
  it('shows placeholder, selects a date and displays it', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ when: undefined as Date | undefined }}
        schema={z.object({ when: z.date({ error: 'Date required' }) })}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='when'>
            {(field: any) => (
              <field.DatePickerField
                label='When'
                required
                description='day'
                disabledDates={(d: Date) => d.getDate() === 31}
              />
            )}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Date required')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pick a date'));
    const day = (await screen.findAllByRole('button', { name: /15/ }))[0];
    fireEvent.click(day);
    await waitFor(() => expect(formRef.state.values.when).toBeInstanceOf(Date));
    expect(screen.queryByText('Pick a date')).not.toBeInTheDocument();
  });
});

describe('DateRangeField', () => {
  it('renders placeholder, partial range and full range', async () => {
    let formRef: any;
    render(
      <Harness
        defaultValues={{ range: undefined as any }}
        schema={z.object({ range: z.any().refine((v) => !!v?.to, 'Range required') })}
        onForm={(f) => (formRef = f)}
        fields={(form) => (
          <form.AppField name='range'>
            {(field: any) => <field.DateRangeField label='Range' required description='span' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Pick a date range')).toBeInTheDocument();
    await submit();
    expect(await screen.findByText('Range required')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Pick a date range'));
    const first = (await screen.findAllByRole('button', { name: /10/ }))[0];
    fireEvent.click(first);
    await waitFor(() => expect(formRef.state.values.range?.from).toBeInstanceOf(Date));
    const second = (await screen.findAllByRole('button', { name: /20/ }))[0];
    fireEvent.click(second);
    await waitFor(() => expect(formRef.state.values.range?.to).toBeInstanceOf(Date));
  });

  it('renders a from-only range', () => {
    render(
      <Harness
        defaultValues={{ range: { from: new Date(2024, 0, 5) } as any }}
        fields={(form) => (
          <form.AppField name='range'>
            {(field: any) => <field.DateRangeField label='Range' placeholder='pp' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText('Jan 05, 2024')).toBeInTheDocument();
  });

  it('renders a full range', () => {
    render(
      <Harness
        defaultValues={{ range: { from: new Date(2024, 0, 5), to: new Date(2024, 0, 9) } as any }}
        fields={(form) => (
          <form.AppField name='range'>
            {(field: any) => <field.DateRangeField label='Range' />}
          </form.AppField>
        )}
      />
    );
    expect(screen.getByText(/Jan 05, 2024 - Jan 09, 2024/)).toBeInTheDocument();
  });
});

describe('SubmitButton', () => {
  it('is disabled and loading while the form submits', async () => {
    let finish!: () => void;
    render(
      <Harness
        defaultValues={{ a: '' }}
        onSubmit={() => {}}
        fields={() => null}
        onForm={() => {}}
      />
    );
    // baseline: enabled
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    cleanup();

    function Slow() {
      const form = useAppForm({
        defaultValues: { a: '' },
        onSubmit: () => new Promise<void>((r) => (finish = r))
      });
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.AppForm>
            <form.SubmitButton disabled={false}>Go</form.SubmitButton>
          </form.AppForm>
        </form>
      );
    }
    render(<Slow />);
    fireEvent.click(screen.getByRole('button', { name: /go/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /go/i })).toBeDisabled());
    await act(async () => finish());
    await waitFor(() => expect(screen.getByRole('button', { name: /go/i })).toBeEnabled());
  });

  it('honours an explicit disabled prop', () => {
    function D() {
      const form = useAppForm({ defaultValues: {}, onSubmit: () => {} });
      return (
        <form.AppForm>
          <form.SubmitButton disabled>Nope</form.SubmitButton>
        </form.AppForm>
      );
    }
    render(<D />);
    expect(screen.getByRole('button', { name: /nope/i })).toBeDisabled();
  });
});
