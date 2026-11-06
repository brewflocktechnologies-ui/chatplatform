import { KBarResults, useMatches, type ActionImpl } from 'kbar';
import ResultItem from './result-item';

type RenderParams = { item: string | ActionImpl; active: boolean };

function ActionRow({ action, active }: Readonly<{ action: ActionImpl; active: boolean }>) {
  const { rootActionId } = useMatches();

  return <ResultItem action={action} active={active} currentRootActionId={rootActionId ?? ''} />;
}

function renderResult({ item, active }: RenderParams) {
  if (typeof item === 'string') {
    return (
      <div className='text-muted-foreground px-4 pt-3 pb-1 text-xs font-medium tracking-wider uppercase'>
        {item}
      </div>
    );
  }

  return <ActionRow action={item} active={active} />;
}

export default function RenderResults() {
  const { results } = useMatches();

  if (!results.length) {
    return (
      <div className='text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm'>
        No results found.
      </div>
    );
  }

  return <KBarResults items={results} onRender={renderResult} />;
}
