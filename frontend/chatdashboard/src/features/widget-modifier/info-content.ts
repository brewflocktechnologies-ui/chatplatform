import type { InfobarContent } from '@/components/ui/infobar';

export const widgetModifierInfoContent: InfobarContent = {
  title: 'Widget Modifier — Federated MFE',
  sections: [
    {
      title: 'Overview',
      description:
        'The customization UI is a Vite module-federation remote (the chatwidget-customization app) loaded at runtime and mounted via its exposed ./mount module. Locally it is served by the vite preview on port 5001; deployed, it loads from the published widget site.',
      links: []
    },
    {
      title: 'Configs collection',
      description:
        'Config presets live in the MongoDB configs collection. Create, rename, and delete presets from the Config dropdown; Save writes the cdnConfig payload the MFE reports back. The dashboard and the MFE talk over postMessage (LOAD_WIDGET_CONFIG, SAVE_WIDGET_CONFIG, …).',
      links: []
    },
    {
      title: 'Deep links',
      description:
        'Customer, website, and config selection are URL state (nuqs), so the Websites table can link straight to a specific website’s configuration.',
      links: []
    }
  ]
};
