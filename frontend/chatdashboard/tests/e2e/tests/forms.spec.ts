import { expect, test } from '../support/fixtures';

/**
 * Form showcase pages under /dashboard/forms: basic (every field type),
 * advanced (async / linked / nested / dynamic-array validation), multi-step
 * wizard, and sheet + dialog forms. All are client-only demos — no backend,
 * nothing persisted — so these specs are fully isolated and parallel-safe.
 */

test.describe('Forms index', () => {
  test('/dashboard/forms redirects to the basic form', async ({ page }) => {
    await page.goto('/dashboard/forms');
    await expect(page).toHaveURL(/\/dashboard\/forms\/basic$/, { timeout: 60_000 });
    await expect(page.getByText('All Form Inputs Demo')).toBeVisible();
  });
});

test.describe('Basic form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/forms/basic');
    await expect(page.getByText('All Form Inputs Demo')).toBeVisible();
  });

  test('empty submit shows a validation error for every required field', async ({ page }) => {
    await page.getByRole('button', { name: 'Submit Form' }).click();

    for (const message of [
      'Name must be at least 2 characters',
      'Invalid email address',
      'Age is required',
      'Password must be at least 8 characters',
      'Phone must be at least 10 digits',
      'Bio must be at least 10 characters',
      'Please select a country',
      'Please select a framework',
      'Select at least one interest',
      'Please select gender',
      'Please enter 6 digits',
      'Add at least one tag',
      'You must accept the terms'
    ]) {
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    }
  });

  test('async validation flags an already-registered email', async ({ page }) => {
    await page.getByLabel('Email').fill('taken@example.com');
    await expect(page.getByText('This email is already registered')).toBeVisible({
      timeout: 10_000
    });

    await page.getByLabel('Email').fill('free@example.com');
    await expect(page.getByText('This email is already registered')).toHaveCount(0, {
      timeout: 10_000
    });
  });

  test('live data preview mirrors typed values and Reset restores defaults', async ({ page }) => {
    const preview = page.locator('pre');
    await page.getByLabel('Full Name').fill('Ada Lovelace');
    await expect(preview).toContainText('"name": "Ada Lovelace"');

    await page.getByRole('checkbox', { name: 'Technology' }).check();
    await expect(preview).toContainText('"technology"');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Full Name')).toHaveValue('');
    await expect(preview).not.toContainText('Ada Lovelace');
  });

  test('a fully valid form submits successfully', async ({ page }) => {
    await page.getByLabel('Full Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Password').fill('supersecret1');
    await page.locator('#age').fill('36');
    await page.getByLabel('Phone').fill('+15551234567');
    await page.getByLabel('Bio').fill('Mathematician and first programmer.');

    await page.getByRole('combobox', { name: /Country/ }).click();
    await page.getByRole('option', { name: 'United Kingdom' }).click();

    await page.getByRole('combobox', { name: /Framework/ }).click();
    await page.getByPlaceholder('Search...').fill('astro');
    await page.getByRole('option', { name: 'Astro' }).click();

    await page.getByRole('checkbox', { name: 'Technology' }).check();
    await page.getByRole('radio', { name: 'Female' }).check();

    await page.locator('input[data-input-otp]').fill('123456');

    await page.getByLabel('Add a tags').fill('math');
    await page.getByLabel('Add a tags').press('Enter');
    await expect(page.getByText('math', { exact: true })).toBeVisible();

    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check();

    // The form reports success through window.alert.
    const dialog = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Submit Form' }).click();
    const alert = await dialog;
    expect(alert.message()).toBe('Form submitted successfully!');
    await alert.accept();
  });
});

test.describe('Advanced form patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/forms/advanced');
    await expect(page.getByText('Team Registration')).toBeVisible();
  });

  test('empty submit reports account, team, member and preference errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Register Team' }).click();

    for (const message of [
      'Username must be at least 3 characters',
      'Invalid email',
      'Must be at least 8 characters',
      'Please confirm your password',
      'Team name must be at least 2 characters',
      'Member name is required',
      'Role is required',
      'Select a country',
      'Select a state'
    ]) {
      await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
    }
  });

  test('async username check rejects a taken username', async ({ page }) => {
    await page.getByLabel('Username').fill('admin');
    await expect(page.getByText('Username is taken')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('Username').fill('someone-else');
    await expect(page.getByText('Username is taken')).toHaveCount(0, { timeout: 10_000 });
  });

  test('confirm-password is re-validated when the password changes', async ({ page }) => {
    await page.locator('#password').fill('password-one');
    await page.locator('#confirmPassword').fill('password-two');
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    // Linked field: changing the first password re-runs the confirm check.
    await page.locator('#password').fill('password-two');
    await expect(page.getByText('Passwords do not match')).toHaveCount(0);
  });

  test('members rows can be added and removed', async ({ page }) => {
    await expect(page.getByLabel('Member 1 name')).toBeVisible();
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByLabel('Member 2 name')).toBeVisible();

    await page.getByLabel('Member 2 name').fill('Grace');
    await page.getByLabel('Member 2 role').fill('Admiral');
    await expect(page.getByLabel('Member 2 name')).toHaveValue('Grace');
    await expect(page.getByLabel('Member 2 role')).toHaveValue('Admiral');

    await page.getByRole('button', { name: 'Remove member 2' }).click();
    await expect(page.getByLabel('Member 2 name')).toHaveCount(0);
  });

  test('state options depend on the country and reset when it changes', async ({ page }) => {
    const state = page.getByRole('combobox', { name: /State/ });
    await expect(state).toContainText('Select a country first');

    await page.getByRole('combobox', { name: /Country/ }).click();
    await page.getByRole('option', { name: 'United States' }).click();
    await state.click();
    await expect(page.getByRole('option', { name: 'California' })).toBeVisible();
    await page.getByRole('option', { name: 'California' }).click();
    await expect(state).not.toContainText('Select state');

    await page.getByRole('combobox', { name: /Country/ }).click();
    await page.getByRole('option', { name: 'Australia' }).click();
    // Listener side effect cleared the previously chosen state.
    await expect(state).toContainText('Select state');
    await state.click();
    await expect(page.getByRole('option', { name: 'Victoria' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'California' })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  // KNOWN PRODUCT BUG: components/forms/fields/select-field.tsx renders
  // <Select> without `items`, so the trigger shows the raw option value ("ca")
  // instead of its label ("California"). test.fail() flips to a failure once fixed.
  test('select trigger displays the chosen option label', async ({ page }) => {
    test.fail(true, 'SelectField trigger shows the raw value instead of the label');
    await page.getByRole('combobox', { name: /Country/ }).click();
    await page.getByRole('option', { name: 'United States' }).click();
    await expect(page.getByRole('combobox', { name: /Country/ })).toContainText('United States');
  });

  test('a fully valid registration submits', async ({ page }) => {
    await page.getByLabel('Username').fill('validuser');
    await page.getByLabel('Email').fill('team@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await page.getByLabel('Team Name').fill('Alpha Squad');
    await page.getByLabel('Member 1 name').fill('Ada');
    await page.getByLabel('Member 1 role').fill('Lead');
    await page.getByRole('combobox', { name: /Country/ }).click();
    await page.getByRole('option', { name: 'United States' }).click();
    await page.getByRole('combobox', { name: /State/ }).click();
    await page.getByRole('option', { name: 'Texas' }).click();

    // The username check is async (debounced); a submit that races it is
    // swallowed, so retry the click until the success toast appears.
    await expect(async () => {
      await page.getByRole('button', { name: 'Register Team' }).click();
      await expect(page.getByText('Team registered successfully!').first()).toBeVisible({
        timeout: 4_000
      });
    }).toPass({ timeout: 30_000 });
  });
});

test.describe('Multi-step form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/forms/multi-step');
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
  });

  test('blocks Next on invalid input and walks through all steps to submit', async ({ page }) => {
    const previous = page.getByRole('button', { name: 'Previous' });
    const next = page.getByRole('button', { name: 'Next' });
    await expect(previous).toBeDisabled();

    // Step 1: empty -> errors, stays on step 1.
    await next.click();
    await expect(page.getByText('Product name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Please select a category')).toBeVisible();
    await expect(page.getByText('Price is required')).toBeVisible();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();

    await page.getByLabel('Product Name').fill('Widget Pro');
    await page.getByRole('combobox', { name: /Category/ }).click();
    await page.getByRole('option', { name: 'Electronics' }).click();
    await page.getByLabel('Price').fill('42.5');
    await next.click();

    // Step 2: description
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await expect(previous).toBeEnabled();
    await next.click();
    await expect(page.getByText('Description must be at least 10 characters')).toBeVisible();
    await page.getByLabel('Description').fill('short');
    await next.click();
    await expect(page.getByText('Description must be at least 10 characters')).toBeVisible();

    // Back keeps step-1 data.
    await previous.click();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expect(page.getByLabel('Product Name')).toHaveValue('Widget Pro');
    await next.click();

    await page.getByLabel('Description').fill('A thoroughly described widget.');
    await next.click();

    // Step 3: review summary reflects what was entered.
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await expect(page.getByText('Review & Submit')).toBeVisible();
    await expect(page.getByText('Widget Pro')).toBeVisible();
    await expect(page.getByText('$42.5')).toBeVisible();
    await expect(
      page.locator('p').filter({ hasText: 'A thoroughly described widget.' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    // .first(): the wizard currently raises this toast twice per submit (see report).
    await expect(page.getByText('Product created successfully!').first()).toBeVisible();
  });
});

test.describe('Sheet and dialog forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/forms/sheet-form');
    await expect(page.getByRole('heading', { name: 'Sheet & Dialog Forms' }).first()).toBeVisible();
  });

  test('sheet form validates, then creates and closes on submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Product' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'New Product' })).toBeVisible();

    // External footer submit button drives the form via the `form` attribute.
    await sheet.getByRole('button', { name: 'Create Product' }).click();
    await expect(sheet.getByText('Product name must be at least 2 characters')).toBeVisible();
    await expect(sheet.getByText('Please select a category')).toBeVisible();
    await expect(sheet.getByText('Price is required')).toBeVisible();
    await expect(sheet.getByText('Description must be at least 10 characters')).toBeVisible();

    await sheet.getByLabel('Product Name').fill('Sheet Widget');
    await sheet.getByRole('combobox', { name: /Category/ }).click();
    await page.getByRole('option', { name: 'Home & Garden' }).click();
    await sheet.getByLabel('Price').fill('5');
    await sheet.getByLabel('Description').fill('Created from the sheet form.');
    await sheet.getByRole('button', { name: 'Create Product' }).click();

    await expect(page.getByText('Product created successfully!')).toBeVisible();
    await expect(page.getByText('Sheet Widget has been added.')).toBeVisible();
    await expect(sheet).toBeHidden();
  });

  test('sheet Cancel closes without submitting', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Product' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText('Product created successfully!')).toHaveCount(0);
  });

  test('dialog feedback form validates and submits', async ({ page }) => {
    await page.getByRole('button', { name: 'Send Feedback' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Quick Feedback')).toBeVisible();

    await dialog.getByRole('button', { name: 'Submit Feedback' }).click();
    await expect(dialog.getByText('Feedback must be at least 5 characters')).toBeVisible();

    await dialog.getByLabel('Feedback').fill('Great dashboard!');
    await dialog.getByRole('button', { name: 'Submit Feedback' }).click();
    await expect(page.getByText('Feedback submitted!')).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test('toast variants render their messages', async ({ page }) => {
    await page.getByRole('button', { name: 'Success', exact: true }).click();
    await expect(page.getByText('Action completed successfully!')).toBeVisible();

    await page.getByRole('button', { name: 'Error', exact: true }).click();
    await expect(page.getByText('Something went wrong.')).toBeVisible();

    await page.getByRole('button', { name: 'Promise', exact: true }).click();
    await expect(page.getByText('Loading...')).toBeVisible();
    await expect(page.getByText('Data loaded!')).toBeVisible({ timeout: 10_000 });
  });
});
