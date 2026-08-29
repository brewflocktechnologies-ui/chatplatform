import type { InfobarContent } from '@/components/ui/infobar';

export const websitesInfoContent: InfobarContent = {
  title: 'Websites — MongoDB + React Query',
  sections: [
    {
      title: 'Overview',
      description:
        'This page lists the websites where the chat widget is installed, stored in MongoDB. Data is fetched through server actions and cached client-side with React Query. Search, category filters, sorting, and pagination run as real MongoDB queries.',
      links: []
    },
    {
      title: 'CRUD',
      description:
        'Create and edit open a sheet form (TanStack Form + Zod) with the customer picker fed from the customers collection; delete confirms first. All mutations write to the MongoDB websites collection and invalidate the React Query cache so the table refreshes automatically.',
      links: []
    },
    {
      title: 'Widget tools',
      description:
        'Each row offers a live widget preview and a guided "Get Code" dialog with the embed snippet to install the chat widget on that website.',
      links: []
    }
  ]
};
