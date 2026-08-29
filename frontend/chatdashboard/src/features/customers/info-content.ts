import type { InfobarContent } from '@/components/ui/infobar';

export const customersInfoContent: InfobarContent = {
  title: 'Customers — MongoDB + React Query',
  sections: [
    {
      title: 'Overview',
      description:
        'This page lists customers stored in MongoDB. Data is fetched through server actions (direct MongoDB access on the server) and cached client-side with React Query. Search, filters, sorting, and pagination run as real MongoDB queries.',
      links: [
        {
          title: 'TanStack Query SSR Docs',
          url: 'https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr'
        }
      ]
    },
    {
      title: 'CRUD',
      description:
        'Create and edit open a sheet form (TanStack Form + Zod); delete confirms first. All mutations write to the MongoDB customers collection and invalidate the React Query cache so the table refreshes automatically.',
      links: []
    },
    {
      title: 'URL State with nuqs',
      description:
        'Pagination, search, plan, and status filters are synced to the URL via nuqs. When the URL changes, React Query refetches because the query key includes the filters.',
      links: [
        {
          title: 'nuqs Documentation',
          url: 'https://nuqs.47ng.com'
        }
      ]
    }
  ]
};
