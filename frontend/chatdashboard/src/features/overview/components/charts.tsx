'use client';

// Single client-module entry point for every recharts-backed graph.
//
// The overview page renders three graphs from three separate parallel routes
// (@area_stats, @bar_stats, @pie_stats). When each route imports its graph
// directly, Turbopack treats each as its own client entry and emits a private
// copy of the recharts stack (recharts + d3-* + @reduxjs/toolkit, ~330 KiB) per
// route — roughly 660 KiB of duplicated JS on a single page load. Routing all
// three through one shared module collapses that to a single copy.
export { AreaGraph } from './area-graph';
export { BarGraph } from './bar-graph';
export { PieGraph } from './pie-graph';
