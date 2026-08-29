import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-welcome-card.js';
import { CwWelcomeCard } from '../../../components/organisms/cw-welcome-card.js';

describe('CwWelcomeCard Organism Component', () => {
  let element: CwWelcomeCard;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwWelcomeCard();
    element.config = {
      enabled: true,
      title: 'Welcome 👋',
      description: 'How can we help today?',
      buttonText: 'Start Conversation',
      footerPaddingBottom: '10px',
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-welcome-card element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-welcome-card');
  });

  it('should render welcome hero and welcome cta components', () => {
    const hero = element.shadowRoot?.querySelector('cw-welcome-hero');
    expect(hero).not.toBeNull();

    const cta = element.shadowRoot?.querySelector('cw-welcome-cta');
    expect(cta).not.toBeNull();

    const footer = element.shadowRoot?.querySelector('.footer-brand') as HTMLElement;
    expect(footer?.style.paddingBottom).toBe('10px');
  });

  it('dispatches cw:close-panel on close button click', async () => {
    const spy = vi.fn();
    element.addEventListener('cw:close-panel', spy);

    const closeBtn = element.shadowRoot?.querySelector('.close-btn-wrapper') as HTMLElement;
    closeBtn?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('renders glassy card layout with cardPosition, cardPadding, and numeric footerPaddingBottom', async () => {
    // 1. glassy cardLayout with cardPosition center and cardPadding
    element.config = {
      enabled: true,
      cardLayout: 'glassy',
      cardPosition: 'center',
      cardPadding: '20px',
      footerPaddingBottom: 15,
      poweredByLink: 'http://example.com',
      poweredByText: 'MyBrand',
      subtextColor: '#ffffff',
    };
    await element.updateComplete;

    const glassy = element.shadowRoot?.querySelector('.glassy-container') as HTMLElement;
    expect(glassy).not.toBeNull();
    expect(glassy.style.padding).toBe('20px');

    const footer = element.shadowRoot?.querySelector('.footer-brand') as HTMLElement;
    expect(footer.style.paddingBottom).toBe('15px');

    // 2. glassy cardLayout with neither cardAlign nor cardPosition = center
    element.config = {
      cardLayout: 'glassy',
      cardAlign: 'left' as any,
      footerPaddingBottom: undefined,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.glassy-container')).not.toBeNull();

    // 3. config = undefined
    element.config = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.welcome-container')).not.toBeNull();
  });
});
