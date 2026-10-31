import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const realNow = Date.now.bind(Date);

const h = vi.hoisted(() => ({
  initialParams: { customerId: null, websiteId: null, configId: null } as Record<
    string,
    string | null
  >,
  setParamsSpy: vi.fn(),
  customers: [] as any[],
  websites: [] as any[],
  configs: [] as any[],
  post: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  create: vi.fn(),
  rename: vi.fn(),
  del: vi.fn(),
  save: vi.fn()
}));

vi.mock('nuqs', async () => {
  const React = await import('react');
  return {
    parseAsString: {},
    useQueryStates: () => {
      const [p, setP] = React.useState(h.initialParams);
      const set = React.useCallback((u: Record<string, string | null>) => {
        h.setParamsSpy(u);
        setP((prev) => ({ ...prev, ...u }));
        return Promise.resolve();
      }, []);
      return [p, set] as const;
    }
  };
});
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('@/features/customers/api/queries', () => ({
  allCustomersQueryOptions: () => ({
    queryKey: ['customers'],
    queryFn: async () => h.customers
  })
}));
vi.mock('@/features/websites/api/queries', () => ({
  websitesQueryOptions: (p: { customerId?: string }) => ({
    queryKey: ['websites', p.customerId],
    queryFn: async () => ({ websites: h.websites })
  })
}));
vi.mock('@/features/widget-modifier/api/queries', () => ({
  widgetConfigKeys: { all: ['widget-configs'] },
  widgetConfigsQueryOptions: () => ({
    queryKey: ['widget-configs', 'list'],
    queryFn: async () => ({ configs: h.configs })
  })
}));
vi.mock('@/features/widget-modifier/api/service', () => ({
  createWidgetConfig: (...a: unknown[]) => h.create(...a),
  renameWidgetConfig: (...a: unknown[]) => h.rename(...a),
  deleteWidgetConfig: (...a: unknown[]) => h.del(...a),
  saveWidgetConfigCdn: (...a: unknown[]) => h.save(...a)
}));
vi.mock('@/features/widget-modifier/lib/federation', async (orig) => ({
  ...(await orig<typeof import('@/features/widget-modifier/lib/federation')>()),
  postToWidgetFrame: (...a: unknown[]) => h.post(...a)
}));
vi.mock('@/features/widget-modifier/components/remote-mount', () => ({
  RemoteMount: (p: Record<string, string>) => <div data-testid='remote'>{JSON.stringify(p)}</div>
}));
vi.mock('@/components/modal/alert-modal', () => ({
  AlertModal: (p: any) =>
    p.isOpen ? (
      <div>
        <button type='button' onClick={p.onConfirm}>
          confirm-delete
        </button>
        <button type='button' onClick={p.onClose}>
          close-delete
        </button>
      </div>
    ) : null
}));
vi.mock('@/components/ui/dialog', () => {
  const Pass = ({ children }: any) => <div>{children}</div>;
  return {
    Dialog: ({ open, onOpenChange, children }: any) =>
      open ? (
        <div>
          <button type='button' onClick={() => onOpenChange(false)}>
            dialog-dismiss
          </button>
          <button type='button' onClick={() => onOpenChange(true)}>
            dialog-open
          </button>
          {children}
        </div>
      ) : null,
    DialogContent: Pass,
    DialogDescription: Pass,
    DialogFooter: Pass,
    DialogHeader: Pass,
    DialogTitle: Pass
  };
});
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: any) => React.cloneElement(render, {}, children),
  PopoverContent: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ render, children }: any) => React.cloneElement(render, {}, children),
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type='button' role='menuitem' onClick={onClick}>
      {children}
    </button>
  )
}));
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const Ctx = React.createContext<(v: string | null) => void>(() => {});
  return {
    Select: ({ onValueChange, value, children }: any) => (
      <Ctx.Provider value={onValueChange}>
        <div data-value={value}>{children}</div>
      </Ctx.Provider>
    ),
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ value, children }: any) => {
      const on = React.useContext(Ctx);
      return (
        <button type='button' data-testid={`opt-${value}`} onClick={() => on(value)}>
          {children}
        </button>
      );
    }
  };
});

import { WidgetModifierView } from '@/features/widget-modifier/components/widget-modifier-view';

function renderView() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WidgetModifierView />
    </QueryClientProvider>
  );
}

function send(data: unknown, bump = true) {
  const spy = bump ? vi.spyOn(Date, 'now').mockReturnValue(realNow() + 10_000) : null;
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
  spy?.mockRestore();
}

const saveBtn = () => screen.getByRole('button', { name: 'Save' });
const undoBtn = () => screen.getByRole('button', { name: /Undo/ });

async function loadSelected() {
  h.initialParams = { customerId: 'cu1', websiteId: null, configId: null };
  renderView();
  expect(await screen.findByTestId('remote')).toBeInTheDocument();
  await waitFor(() => expect(h.post).toHaveBeenCalledWith('LOAD_WIDGET_CONFIG', expect.anything()));
}

beforeEach(() => {
  h.initialParams = { customerId: null, websiteId: null, configId: null };
  h.customers = [{ id: 'cu1', email: 'acme@example.com' }];
  h.websites = [
    { id: 'w1', domain: 'acme.com', configId: 'cfg1', configName: 'Default' },
    { id: 'w2', domain: 'b.com' }
  ];
  h.configs = [
    { id: 'cfg1', name: 'Default', configName: 'Default', cdnConfig: { theme: { color: 'red' } } },
    { id: 'cfg2', name: 'Amber', configName: 'Amber', cdnConfig: { cdnConfig: { a: 1 } } }
  ];
  h.post.mockReset().mockReturnValue(true);
  h.setParamsSpy.mockReset();
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.create.mockReset().mockResolvedValue({ id: 'new', name: 'Fresh' });
  h.rename.mockReset().mockResolvedValue({});
  h.del.mockReset().mockResolvedValue({});
  h.save.mockReset().mockResolvedValue({});
});
afterEach(() => cleanup());

describe('WidgetModifierView toolbar and selection', () => {
  it('shows the empty state and disables actions with no selection', () => {
    renderView();
    expect(screen.getByText('Select a customer and website')).toBeInTheDocument();
    expect(screen.getByText('Pick a customer first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled();
    expect(undoBtn()).toBeDisabled();
    expect(saveBtn()).toBeDisabled();
  });

  it('shows a spinner while websites load', async () => {
    h.initialParams = { customerId: 'cu1', websiteId: null, configId: null };
    const { container } = renderView();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(await screen.findByTestId('remote')).toBeInTheDocument();
  });

  it('defaults to the first website and its linked config and pushes it to the frame', async () => {
    await loadSelected();
    expect(h.setParamsSpy).toHaveBeenCalledWith({ websiteId: 'w1' });
    expect(h.setParamsSpy).toHaveBeenCalledWith({ configId: 'cfg1' });
    expect(screen.getByTestId('remote')).toHaveTextContent('"websiteId":"w1"');
    expect(screen.getByTestId('remote')).toHaveTextContent('"domain":"acme.com"');
    expect(h.post).toHaveBeenCalledWith('LOAD_WIDGET_CONFIG', {
      cdnConfig: { theme: { color: 'red' } },
      domain: 'acme.com'
    });
    expect(h.post).toHaveBeenCalledWith('UPDATE_PREVIEW_DOMAIN', { domain: 'acme.com' });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not select a config when the website has none', async () => {
    h.initialParams = { customerId: 'cu1', websiteId: 'w2', configId: null };
    renderView();
    expect(await screen.findByTestId('remote')).toBeInTheDocument();
    expect(h.post).not.toHaveBeenCalledWith('LOAD_WIDGET_CONFIG', expect.anything());
    expect(screen.getByText('Select config')).toBeInTheDocument();
  });

  it('changes customer and website through the selects', async () => {
    await loadSelected();
    fireEvent.click(screen.getByTestId('opt-cu1'));
    expect(h.setParamsSpy).toHaveBeenCalledWith({
      customerId: 'cu1',
      websiteId: null,
      configId: null
    });
    expect(await screen.findByTestId('remote')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('opt-w2'));
    expect(h.setParamsSpy).toHaveBeenCalledWith({ websiteId: 'w2', configId: null });
  });

  it('refreshes the preview', async () => {
    await loadSelected();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(h.post).toHaveBeenCalledWith('RESET_WIDGET_PREVIEW');
    expect(h.toast.info).toHaveBeenCalledWith('Widget preview refreshed');
  });
});

describe('WidgetModifierView MFE messaging', () => {
  it('tracks dirtiness from change reports, ignoring muted/unrelated messages', async () => {
    await loadSelected();
    send(null);
    send({});
    send({ type: 'SOMETHING_ELSE' });
    // muted right after a push
    send({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: { theme: { color: 'blue' } } }, false);
    expect(saveBtn()).toBeDisabled();
    // same payload (different key order / wrapped) is not dirty
    send({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: { cdnConfig: { theme: { color: 'red' } } } });
    expect(saveBtn()).toBeDisabled();
    // real change
    send({ type: 'FORM_DIRTY', cdnConfig: { theme: { color: 'blue' } } });
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    expect(undoBtn()).toBeEnabled();
  });

  it('marks dirty when the report has no payload', async () => {
    await loadSelected();
    send({ type: 'WIDGET_CONFIG_CHANGED' });
    await waitFor(() => expect(saveBtn()).toBeEnabled());
  });

  it('replies to MFE_READY with the current config', async () => {
    await loadSelected();
    h.post.mockClear();
    send({ type: 'MFE_READY' });
    expect(h.post).toHaveBeenCalledWith(
      'LOAD_WIDGET_CONFIG',
      expect.objectContaining({ domain: 'acme.com' })
    );
  });

  it('undo reloads the config and clears dirty state', async () => {
    await loadSelected();
    send({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: { theme: { color: 'blue' } } });
    await waitFor(() => expect(undoBtn()).toBeEnabled());
    h.post.mockClear();
    fireEvent.click(undoBtn());
    expect(h.post).toHaveBeenCalledWith('LOAD_WIDGET_CONFIG', expect.anything());
    expect(h.toast.info).toHaveBeenCalledWith('Unsaved changes undone');
    await waitFor(() => expect(saveBtn()).toBeDisabled());
  });

  it('save requests the config from the frame, and errors when the frame is missing', async () => {
    await loadSelected();
    send({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: { theme: { color: 'blue' } } });
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    fireEvent.click(saveBtn());
    expect(h.post).toHaveBeenCalledWith('REQUEST_WIDGET_CONFIG');
    expect(h.toast.error).not.toHaveBeenCalled();
    h.post.mockImplementation((t: string) => t !== 'REQUEST_WIDGET_CONFIG');
    fireEvent.click(saveBtn());
    expect(h.toast.error).toHaveBeenCalledWith('Customization UI is not ready yet.');
  });

  it('persists SAVE_WIDGET_CONFIG and clears the dirty flag', async () => {
    await loadSelected();
    send({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: { theme: { color: 'blue' } } });
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: { theme: { color: 'blue' } } });
    await waitFor(() => expect(h.save).toHaveBeenCalledWith('cfg1', { theme: { color: 'blue' } }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith('Config saved successfully'));
    await waitFor(() => expect(saveBtn()).toBeDisabled());
  });

  it('reports save failures with the server message or a fallback', async () => {
    await loadSelected();
    h.save.mockRejectedValueOnce(new Error('nope'));
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: { a: 1 } });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('nope'));
    h.save.mockRejectedValueOnce(new Error(''));
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: { a: 1 } });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('Failed to save config'));
  });

  it('rejects saves without a config or with an empty payload', async () => {
    renderView();
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: { a: 1 } });
    expect(h.toast.error).toHaveBeenCalledWith(
      'Select or create a config preset first, then save.'
    );
    cleanup();
    h.toast.error.mockReset();
    await loadSelected();
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: {} });
    expect(h.toast.error).toHaveBeenCalledWith(
      'Widget configuration is empty. Customize something first.'
    );
    expect(h.save).not.toHaveBeenCalled();
  });

  it('removes the message listener on unmount', async () => {
    await loadSelected();
    cleanup();
    h.save.mockClear();
    send({ type: 'SAVE_WIDGET_CONFIG', cdnConfig: { a: 1 } });
    expect(h.save).not.toHaveBeenCalled();
  });
});

describe('WidgetModifierView config management', () => {
  it('lists, filters and selects configs', async () => {
    await loadSelected();
    const search = screen.getByPlaceholderText('Search configs...');
    fireEvent.change(search, { target: { value: 'amb' } });
    expect(screen.getAllByRole('button', { name: /Amber/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Amber/ }));
    expect(h.setParamsSpy).toHaveBeenCalledWith({ configId: 'cfg2' });

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No matching configs')).toBeInTheDocument();
  });

  it('creates a config via button and Enter, and reports errors', async () => {
    await loadSelected();
    fireEvent.click(screen.getByRole('button', { name: /Create new config/ }));
    const input = screen.getByPlaceholderText(/Amber Theme/);
    const createBtn = screen.getByRole('button', { name: 'Create Config' });
    expect(createBtn).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(h.create).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'a' });
    expect(h.create).not.toHaveBeenCalled();
    fireEvent.click(createBtn);
    await waitFor(() => expect(h.create).toHaveBeenCalledWith('Fresh'));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith('Config "Fresh" created'));
    expect(h.setParamsSpy).toHaveBeenCalledWith({ configId: 'new' });
    expect(screen.queryByPlaceholderText(/Amber Theme/)).toBeNull();

    h.create.mockRejectedValueOnce(new Error('dup'));
    fireEvent.click(screen.getByRole('button', { name: /Create new config/ }));
    const input2 = screen.getByPlaceholderText(/Amber Theme/);
    fireEvent.change(input2, { target: { value: 'Again' } });
    fireEvent.keyDown(input2, { key: 'Enter' });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('dup'));

    h.create.mockRejectedValueOnce(new Error(''));
    fireEvent.keyDown(input2, { key: 'Enter' });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('Failed to create config'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText(/Amber Theme/)).toBeNull();
  });

  it('renames a config via button and Enter, and reports errors', async () => {
    await loadSelected();
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Rename/ })[1]);
    const input = screen.getByLabelText('New name *');
    expect(input).toHaveValue('Amber');
    fireEvent.change(input, { target: { value: 'Gold' } });
    fireEvent.keyDown(input, { key: 'a' });
    expect(h.rename).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Name' }));
    await waitFor(() => expect(h.rename).toHaveBeenCalledWith('cfg2', 'Gold'));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith('Config renamed to "Gold"'));
    expect(screen.queryByLabelText('New name *')).toBeNull();

    fireEvent.click(screen.getAllByRole('menuitem', { name: /Rename/ })[0]);
    const input2 = screen.getByLabelText('New name *');
    h.rename.mockRejectedValueOnce(new Error('bad name'));
    fireEvent.keyDown(input2, { key: 'Enter' });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('bad name'));
    h.rename.mockRejectedValueOnce(new Error(''));
    fireEvent.keyDown(input2, { key: 'Enter' });
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('Failed to rename config'));

    fireEvent.change(input2, { target: { value: '  ' } });
    h.rename.mockClear();
    fireEvent.keyDown(input2, { key: 'Enter' });
    expect(h.rename).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('New name *')).toBeNull();
  });

  it('dismisses dialogs via onOpenChange', async () => {
    await loadSelected();
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Rename/ })[0]);
    fireEvent.click(screen.getByText('dialog-open'));
    expect(screen.getByLabelText('New name *')).toBeInTheDocument();
    fireEvent.click(screen.getByText('dialog-dismiss'));
    expect(screen.queryByLabelText('New name *')).toBeNull();
  });

  it('deletes the selected config and clears the selection, or keeps it for others', async () => {
    await loadSelected();
    await waitFor(() => expect(h.setParamsSpy).toHaveBeenCalledWith({ configId: 'cfg1' }));
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Delete/ })[0]);
    fireEvent.click(screen.getByText('confirm-delete'));
    await waitFor(() => expect(h.del).toHaveBeenCalledWith('cfg1'));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith('Config deleted'));
    expect(h.setParamsSpy).toHaveBeenCalledWith({ configId: null });
    expect(screen.queryByText('confirm-delete')).toBeNull();

    h.setParamsSpy.mockClear();
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Delete/ })[1]);
    fireEvent.click(screen.getByText('confirm-delete'));
    await waitFor(() => expect(h.del).toHaveBeenCalledWith('cfg2'));
    await waitFor(() => expect(screen.queryByText('confirm-delete')).toBeNull());
    expect(h.setParamsSpy).not.toHaveBeenCalledWith({ configId: null });
  });

  it('reports delete failures and can cancel the confirmation', async () => {
    await loadSelected();
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Delete/ })[1]);
    fireEvent.click(screen.getByText('close-delete'));
    expect(screen.queryByText('confirm-delete')).toBeNull();
    h.del.mockRejectedValueOnce(new Error('locked'));
    fireEvent.click(screen.getAllByRole('menuitem', { name: /Delete/ })[1]);
    fireEvent.click(screen.getByText('confirm-delete'));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('locked'));
    h.del.mockRejectedValueOnce(new Error(''));
    fireEvent.click(screen.getByText('confirm-delete'));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith('Failed to delete config'));
  });

  it('stops click propagation on the row menu trigger', async () => {
    await loadSelected();
    h.setParamsSpy.mockClear();
    const triggers = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('group-hover:opacity-100'));
    expect(triggers).toHaveLength(2);
    fireEvent.click(triggers[0]);
    expect(h.setParamsSpy).not.toHaveBeenCalled();
  });

  it('matches the Active badge by config name when ids differ', async () => {
    h.websites = [{ id: 'w1', domain: 'acme.com', configName: 'Amber' }];
    h.initialParams = { customerId: 'cu1', websiteId: 'w1', configId: 'cfg2' };
    renderView();
    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(1);
  });
});
