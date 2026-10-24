import type { InfobarContent } from '@/components/ui/infobar';

export const customersInfoContent: InfobarContent = {
  title: 'Customers — Billing API + React Query',
  sections: [
    {
      title: 'Overview',
      description:
        'This page lists customers from the billing service (GET /api/customers). Data is fetched through server actions, so the browser never calls the billing origin, and cached client-side with React Query. Pagination and sorting run on the API.',
      links: [
        {
          title: 'TanStack Query SSR Docs',
          url: 'https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr'
        }
      ]
    },
    {
      title: 'Search',
      description:
        'The API has no search parameter, so searching loads every customer once and filters them in the browser across email, external ID, address, and card.',
      links: []
    },
    {
      title: 'URL State with nuqs',
      description:
        'Pagination, search, and sorting are synced to the URL via nuqs. When the URL changes, React Query refetches because the query key includes the filters.',
      links: [
        {
          title: 'nuqs Documentation',
          url: 'https://nuqs.47ng.com'
        }
      ]
    }
  ]
};
