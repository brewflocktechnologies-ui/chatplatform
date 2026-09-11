import { describe, expect, it, beforeEach } from 'vitest';
import { useCustomerStore } from '@/features/engage/useCustomerStore';

const initialData = useCustomerStore.getState().customerData;

beforeEach(() => {
  useCustomerStore.setState({ customerData: initialData });
});

describe('useCustomerStore', () => {
  it('starts with the three seeded customers', () => {
    const state = useCustomerStore.getState();
    expect(state.customerData).toHaveLength(3);
    expect(state.customerData.map((c) => c.name)).toEqual(['You', 'Amit Shah', 'Samantha']);
  });

  it('exposes the activity status of each seeded customer', () => {
    const byName = new Map(useCustomerStore.getState().customerData.map((c) => [c.name, c]));
    expect(byName.get('You')?.activity).toBe('Chatting');
    expect(byName.get('Amit Shah')?.activity).toBe('Browsing');
    expect(byName.get('Samantha')?.activity).toBe('Waiting for reply');
  });

  it('replaces the customer list via setCustomerData', () => {
    const replacement = useCustomerStore.getState().customerData.slice(0, 2);
    useCustomerStore.getState().setCustomerData(replacement);
    expect(useCustomerStore.getState().customerData).toHaveLength(2);
  });
});
