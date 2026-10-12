import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// jsdom has no layout, so recharts renders nothing. Replace the primitives with
// light stand-ins that also exercise the callback props (formatters, shapes).
vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Pass,
    AreaChart: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid='area-chart'>{children}</div>
    ),
    BarChart: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid='bar-chart'>{children}</div>
    ),
    PieChart: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid='pie-chart'>{children}</div>
    ),
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    XAxis: ({ tickFormatter }: { tickFormatter?: (v: string) => string }) => (
      <span data-testid='xaxis-tick'>{tickFormatter?.('January')}</span>
    ),
    Area: ({ dataKey }: { dataKey: string }) => <i data-testid={`area-${dataKey}`} />,
    Bar: ({ dataKey, shape }: { dataKey: string; shape: React.ReactElement<any> }) => (
      <svg data-testid={`bar-${dataKey}`}>
        {React.cloneElement(shape, { x: 1, y: 2, width: 3, height: 4, fill: 'red', dataKey })}
      </svg>
    ),
    Pie: ({ children }: { children?: React.ReactNode }) => <div data-testid='pie'>{children}</div>,
    LabelList: ({ formatter }: { formatter: (v: unknown) => string }) => (
      <span data-testid='label'>
        {formatter(275)}|{formatter(undefined)}
      </span>
    )
  };
});

import { AreaGraph } from '@/features/overview/components/area-graph';
import { BarGraph } from '@/features/overview/components/bar-graph';
import { PieGraph } from '@/features/overview/components/pie-graph';
import * as charts from '@/features/overview/components/charts';

describe('AreaGraph', () => {
  it('renders title, badge and abbreviated x axis ticks', () => {
    const { container } = render(<AreaGraph />);
    expect(screen.getByText(/Dotted Area Chart/)).toBeInTheDocument();
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
    expect(screen.getByText('Showing total visitors for the last 6 months')).toBeInTheDocument();
    expect(screen.getByTestId('xaxis-tick')).toHaveTextContent('Jan');
    expect(screen.getByTestId('area-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('area-desktop')).toBeInTheDocument();
    expect(container.querySelector('pattern#dotted-background-pattern-mobile')).toBeInTheDocument();
    expect(
      container.querySelector('pattern#dotted-background-pattern-desktop')
    ).toBeInTheDocument();
  });
});

describe('BarGraph', () => {
  it('renders a plain bar for desktop and a hatched bar for mobile', () => {
    const { container } = render(<BarGraph />);
    expect(screen.getByText(/Bar Chart - Multiple/)).toBeInTheDocument();
    expect(screen.getByText('January - June 2025')).toBeInTheDocument();
    expect(screen.getByTestId('xaxis-tick')).toHaveTextContent('Jan');

    const desktopRect = screen.getByTestId('bar-desktop').querySelector('rect') as Element;
    expect(desktopRect).toHaveAttribute('fill', 'red');
    const mobileRect = screen.getByTestId('bar-mobile').querySelector('rect') as Element;
    expect(mobileRect).toHaveAttribute('fill', 'url(#hatched-bar-pattern-mobile)');
    expect(container.querySelector('pattern#default-multiple-pattern-dots')).toBeInTheDocument();
    expect(container.querySelector('pattern#hatched-bar-pattern-desktop')).toBeInTheDocument();
  });
});

describe('PieGraph', () => {
  it('renders title and formatted labels', () => {
    render(<PieGraph />);
    expect(screen.getByText(/Pie Chart/)).toBeInTheDocument();
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
    expect(screen.getByTestId('label')).toHaveTextContent('275|');
  });
});

describe('charts barrel', () => {
  it('re-exports every graph', () => {
    expect(charts.AreaGraph).toBe(AreaGraph);
    expect(charts.BarGraph).toBe(BarGraph);
    expect(charts.PieGraph).toBe(PieGraph);
  });
});
