import PageContainer from '@/components/layout/page-container';
import { WidgetModifierView } from '@/features/widget-modifier/components/widget-modifier-view';
import { widgetModifierInfoContent } from '@/features/widget-modifier/info-content';

export const metadata = {
  title: 'Dashboard: Widget Modifier'
};

export default function WidgetModifierPage() {
  return (
    <PageContainer
      pageTitle='Widget Modifier'
      pageDescription='Customize the chat widget per website — powered by the federated customization UI.'
      infoContent={widgetModifierInfoContent}
    >
      <WidgetModifierView />
    </PageContainer>
  );
}
