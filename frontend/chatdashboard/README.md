# Chat Platform Dashboard

Admin dashboard built with Next.js 16, shadcn/ui, Tailwind CSS v4, and TypeScript.

## Overview

A production-ready admin dashboard base. Every feature is a working implementation, not static demo UI: tables search, filter, sort, and paginate for real; forms validate and mutate with cache invalidation; auth, organizations, and billing function end-to-end.

## Tech Stack

- Framework - [Next.js 16](https://nextjs.org)
- Language - [TypeScript](https://www.typescriptlang.org)
- Auth - [Clerk](https://clerk.com)
- Error tracking - [Sentry](https://sentry.io)
- Styling - [Tailwind CSS v4](https://tailwindcss.com)
- Components - [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) primitives
- Charts - [Recharts](https://recharts.org)
- Schema validation - [Zod](https://zod.dev)
- Data fetching - [TanStack React Query](https://tanstack.com/query)
- State management - [Zustand](https://zustand-demo.pmnd.rs)
- Search param state - [Nuqs](https://nuqs.47ng.com/)
- Tables - [TanStack Data Tables](https://ui.shadcn.com/docs/components/data-table)
- Forms - [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev)
- Command+K interface - [kbar](https://kbar.vercel.app/)
- Linter / Formatter - [OxLint](https://oxc.rs/docs/guide/usage/linter) • [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- Pre-commit hooks - [Husky](https://typicode.github.io/husky/)

## Features

- Pre-built dashboard layout with sidebar, header, and content area
- Analytics overview page with cards and charts
- Data tables with React Query prefetch, client-side cache, search, filter, and pagination
- Authentication and user management through Clerk
- Multi-tenant workspaces using Clerk Organizations (create, switch, manage teams)
- Billing and subscriptions via Clerk Billing for B2B, with plan management and feature gating
- Client-side RBAC navigation that filters menu items by organization, permissions, and roles
- Infobar component for tips, status messages, or contextual notes on any page
- shadcn/ui components on Base UI primitives, styled with Tailwind CSS
- Six-plus themes with a theme switcher
- Feature-based folder structure

## Pages

| Route                         | Notes                                                                                                                  |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `/auth/sign-in`, `/auth/sign-up` | Auth handled by Clerk, with passwordless sign-in, social logins, and enterprise SSO.                                 |
| `/dashboard/overview`         | Cards and Recharts graphs. Parallel routes give each section its own loading and error state.                          |
| `/dashboard/product`          | TanStack Table plus React Query (server prefetch, client cache) with nuqs URL state for search, filter, and pagination. |
| `/dashboard/product/new`      | TanStack Form and Zod with `useMutation` for create and update. Cache is invalidated on success.                       |
| `/dashboard/users`            | Same setup as Products: React Query with nuqs, server prefetch, and client-side pagination and filtering.              |
| `/dashboard/react-query`      | A demo showing the server prefetch, `HydrationBoundary`, and `useSuspenseQuery` pattern with client-side cache.        |
| `/dashboard/profile`          | Clerk's account management UI for profile and security settings.                                                       |
| `/dashboard/kanban`           | Drag-and-drop task board built with dnd-kit and Zustand. Column sorting, priority badges, assignees, and due dates.    |
| `/dashboard/chat`             | Messaging UI with a conversation list, message bubbles, quick replies, and attachments. Multi-panel layout.            |
| `/dashboard/ai-chat`          | Scripted AI chat that streams a predefined conversation through the real `useChat` lifecycle — no model or key needed. |
| `/dashboard/notifications`    | Notification center with a header badge, popover preview, and All / Unread / Read tabs.                                |
| `/dashboard/workspaces`       | Organization management using Clerk's `<OrganizationList />`. View, create, and switch between organizations.          |
| `/dashboard/workspaces/team`  | Team management using Clerk's `<OrganizationProfile />`. Manage members, roles, permissions, and org details.          |
| `/dashboard/billing`          | Billing page using Clerk's `<PricingTable />`. View plans, subscribe, and manage subscriptions.                        |
| `/dashboard/exclusive`        | Plan-based access control with Clerk's `<Protect>`, with a fallback UI for non-Pro organizations.                      |

## Folder Structure

```plaintext
src/
├── app/                           # Next.js App Router directory
│   ├── auth/                      # Auth pages (sign-in, sign-up)
│   ├── dashboard/                 # Dashboard route group
│   │   ├── overview/              # Analytics with parallel routes
│   │   ├── product/               # Product CRUD pages (React Query)
│   │   ├── users/                 # Users table (React Query + nuqs)
│   │   ├── react-query/           # React Query demo page
│   │   ├── kanban/                # Task board page
│   │   ├── chat/                  # Messaging page
│   │   ├── ai-chat/               # AI chat streaming demo
│   │   ├── notifications/         # Notifications page
│   │   ├── workspaces/            # Org management & teams
│   │   ├── billing/               # Billing & plans
│   │   ├── profile/               # User profile
│   │   └── exclusive/             # Plan-gated page
│   └── api/                       # API routes
│
├── components/                    # Shared components
│   ├── ui/                        # UI primitives (buttons, inputs, dialogs, etc.)
│   ├── layout/                    # Layout components (header, sidebar, etc.)
│   ├── themes/                    # Theme system (selector, mode toggle, config)
│   └── kbar/                      # Command+K interface
│
├── features/                      # Feature-based modules
│   ├── overview/                  # Dashboard analytics (charts, cards)
│   ├── products/                  # Product listing, form, tables (React Query)
│   ├── users/                     # User management table (React Query)
│   ├── react-query-demo/          # React Query demo
│   ├── kanban/                    # Drag-drop task board
│   ├── chat/                      # Messaging (conversations, bubbles, composer)
│   ├── ai-chat/                   # Scripted useChat streaming demo
│   ├── notifications/             # Notification center & store
│   ├── auth/                      # Auth components
│   └── profile/                   # Profile form schemas
│
├── lib/                           # Core utilities (query-client, searchparams, etc.)
├── hooks/                         # Custom hooks
├── config/                        # Navigation, infobar, data table config
├── constants/                     # Mock data
├── styles/                        # Global CSS & theme files
│   └── themes/                    # Individual theme CSS files
└── types/                         # TypeScript types
```

## Getting Started

> [!NOTE]
> This app uses Next.js 16 (App Router) with React 19 and shadcn/ui. To run it locally:

- `bun install`
- Copy the example env file: `cp env.example.txt .env.local`
- Fill in the required variables in `.env.local`
- `bun run dev`

The app should now be running at http://localhost:3000.

### Environment variables

See `env.example.txt` for the variables you need. They cover authentication and error tracking.

### Clerk setup

For setting up Clerk auth (including organizations, workspaces, and teams), see [clerk_setup.md](./docs/clerk_setup.md).

## Cleanup Script

The repo ships with a cleanup script that removes optional features you don't need (folders, files, dependencies, docs, and env entries), leaving a minimal base to build on:

```bash
bun run cleanup --interactive    # interactive mode
bun run cleanup --list           # see available features
bun run cleanup --dry-run chat   # preview before removing
bun run cleanup kanban chat      # remove specific features
```

Run `bun run cleanup --help` for all options (with npm, pass flags after `--`: `npm run cleanup -- --list`). The replacement files it writes live in `scripts/cleanup-templates/` as real, typechecked code. When you're done, delete `scripts/cleanup.js`, `scripts/cleanup-templates/`, and the `cleanup` entry in `package.json`.

To remove Clerk authentication entirely (along with organizations and billing) and wire in your own auth solution, run `bun run cleanup clerk`.

## AI Coding Assistants

The repo ships AGENTS.md and CLAUDE.md with the project's conventions, plus a bundled Claude Code skill (`.claude/skills/dashboard-development`) that teaches agents how to add pages, tables, forms, and navigation the project way. Works with Claude Code, Cursor, and any tool that reads AGENTS.md.

## Data Fetching Pattern

TanStack React Query with the official SSR pattern: `prefetchQuery` on the server, `HydrationBoundary` with `dehydrate` for hydration, and `useSuspenseQuery` on the client, plus nuqs for URL-synced search-param state. Mutations invalidate the cache on success.

## Deploy

Deploy to Vercel out of the box, or use the included Docker setups: a Node.js Dockerfile and a Bun Dockerfile, both using Next.js standalone output mode. Full guide: [docs/deployment.md](./docs/deployment.md).

## License

MIT — see [LICENSE](./LICENSE).
