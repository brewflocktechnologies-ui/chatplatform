import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Options<TCreated, TUpdated, TPayload, TId> {
  /** Lower-case name used in the toasts, e.g. "customer". */
  readonly noun: string;
  readonly create: UseMutationOptions<TCreated, Error, TPayload>;
  readonly update: UseMutationOptions<TUpdated, Error, { id: TId; values: TPayload }>;
  /** Runs after a successful create or update (cache invalidation, router refresh). */
  readonly onSaved: () => void;
  readonly onOpenChange: (open: boolean) => void;
  /** Runs after a successful create, to clear the form for the next one. */
  readonly onCreated: () => void;
  /** Turns a failure into the toast text; `fallback` is used for unknown errors. */
  readonly errorMessage?: (error: unknown, fallback: string) => string;
}

const defaultErrorMessage = (_error: unknown, fallback: string) => fallback;

// Create/update mutations of a form sheet: toasts, closing the sheet and the shared bookkeeping.
export function useCreateUpdateMutations<TCreated, TUpdated, TPayload, TId>({
  noun,
  create,
  update,
  onSaved,
  onOpenChange,
  onCreated,
  errorMessage = defaultErrorMessage
}: Options<TCreated, TUpdated, TPayload, TId>) {
  const createMutation = useMutation({
    ...create,
    // Overriding onSuccess replaces the base invalidation, so `onSaved` redoes it.
    onSuccess: () => {
      onSaved();
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} created`);
      onOpenChange(false);
      onCreated();
    },
    onError: (error) => toast.error(errorMessage(error, `Couldn't create ${noun}. Try again.`))
  });

  const updateMutation = useMutation({
    ...update,
    onSuccess: () => {
      onSaved();
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} updated`);
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, `Couldn't update ${noun}. Try again.`))
  });

  /** Updates the record `id`, or creates one when `id` is undefined. Failures are already toasted. */
  const save = async (id: TId | undefined, payload: TPayload) => {
    try {
      if (id === undefined) {
        await createMutation.mutateAsync(payload);
      } else {
        await updateMutation.mutateAsync({ id, values: payload });
      }
    } catch {
      // Already reported by the mutation's onError.
    }
  };

  return { save, isPending: createMutation.isPending || updateMutation.isPending };
}
