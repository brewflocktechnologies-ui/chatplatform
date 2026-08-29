import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../../components/pages/cw-widget-root.js';
import { CwWidgetRoot } from '../../../components/pages/cw-widget-root.js';
import {
  chatbarStore,
  chatStore,
  greetWindowStore,
  featuresStore,
  chatWindowStore,
  initStore
} from '../../../store/chat-store.js';

describe('CwWidgetRoot Page Component', () => {
  let element: CwWidgetRoot;

  beforeEach(async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Mock fetch: no network in tests'));
    document.body.innerHTML = '';
    element = new CwWidgetRoot();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should instantiate and mount cw-widget-root into the DOM', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-widget-root');
    expect(element.initialized).toBe(true);
  });

  it('should handle connectedCallback exception gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errEl = new CwWidgetRoot();
    
    // Test initStore failure handling inside connectedCallback
    const initStoreModule = await import('../../../store/chat-store.js');
    const initSpy = vi.spyOn(initStoreModule, 'initStore').mockRejectedValueOnce(new Error('Init failed'));

    document.body.appendChild(errEl);
    await errEl.updateComplete;

    expect(errEl.initialized).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('CwWidgetRoot initStore warning:', expect.any(Error));

    initSpy.mockRestore();
    consoleSpy.mockRestore();
    errEl.remove();
  });

  it('should clean up listeners on disconnectedCallback', async () => {
    const unsubSpy = vi.fn();
    (element as any).unsubAll = unsubSpy;

    element.remove(); // Triggers disconnectedCallback

    expect(unsubSpy).toHaveBeenCalled();
  });

  it('should accept property attributes', async () => {
    element.clientName = 'Acme Corp Support';
    element.accentColor = '#8b5cf6';
    element.greetOpeningDelaySec = 3.0;

    await element.updateComplete;

    expect(element.clientName).toBe('Acme Corp Support');
    expect(element.accentColor).toBe('#8b5cf6');
    expect(element.greetOpeningDelaySec).toBe(3.0);
  });

  it('handles property changes for triggerType', async () => {
    (element as any).activeTriggerOverride = 'chatcard';
    (element as any).userHasSentMessage = true;

    element.triggerType = 'bubble';
    await element.updateComplete;

    expect((element as any).activeTriggerOverride).toBeUndefined();
    expect((element as any).userHasSentMessage).toBe(false);
  });

  it('handles property changes for greet delay and enablement props', async () => {
    element.enableGreetWindow = true;
    element.greetOpeningDelaySec = 5;
    element.enableInputCard = true;
    element.greetInputOpeningDelaySec = 8;

    await element.updateComplete;

    const gw = greetWindowStore.get();
    expect(gw.enabled).toBe(true);
    expect(gw.openingTimeAfterInitialLoadSec).toBe(5);
    expect(gw.inputBox?.enabled).toBe(true);
    expect(gw.inputBox?.openingTimeAfterInitialLoadSec).toBe(8);
  });

  it('handles property changes for prechatEnabled and postchatEnabled when panel is closed', async () => {
    element.panelOpen = false;
    element.prechatEnabled = true;
    element.postchatEnabled = true;

    await element.updateComplete;

    expect(featuresStore.get().prechatEnabled).toBe(true);
    expect(featuresStore.get().postchatEnabled).toBe(true);
  });

  it('handles property changes for prechatEnabled and postchatEnabled when panel is open', async () => {
    vi.useFakeTimers();
    element.panelOpen = true;
    const cws = chatWindowStore.get();
    if (!cws.welcome) cws.welcome = { enabled: true } as any;
    cws.welcome!.enabled = true;

    element.prechatEnabled = true;
    await element.updateComplete;

    vi.runAllTimers();
    await element.updateComplete;

    expect(element.panelOpen).toBe(true);
    expect(chatStore.get().state).toBe('prechat');

    // Test with prechatEnabled false and welcome enabled
    element.prechatEnabled = false;
    await element.updateComplete;

    vi.runAllTimers();
    await element.updateComplete;
    expect(chatStore.get().state).toBe('welcome');

    // Test with welcome disabled
    cws.welcome!.enabled = false;
    element.postchatEnabled = false;
    await element.updateComplete;

    vi.runAllTimers();
    await element.updateComplete;
    expect(chatStore.get().state).toBe('active');

    vi.useRealTimers();
  });

  it('handles card to bar collapse when visitor message is sent', async () => {
    chatbarStore.get().enabled = true;
    chatbarStore.get().layout = 'card';
    element.triggerType = 'chatcard';
    chatStore.get().messages = [{ key: 't', senderType: 'VISITOR', body: 'Hi' }];
    element.panelOpen = true;
    await element.updateComplete;

    window.dispatchEvent(new CustomEvent('close-contact-widget'));
    await element.updateComplete;

    expect(element.panelOpen).toBe(false);
    expect(chatbarStore.get().layout).toBe('bar');
  });

  it('should provide getDebugInfo() diagnostic data for all trigger types', async () => {
    element.accentColor = '#0b5fff';
    element.triggerType = 'bubble';
    await element.updateComplete;

    let debug = element.getDebugInfo();
    expect(debug).toBeDefined();
    expect(debug.activeTrigger).toBe('bubble');
    expect(debug.effectiveConfigs.bubble).toBeDefined();
    expect(debug.cssVariables).toBeDefined();

    element.triggerType = 'chatbar';
    await element.updateComplete;
    debug = element.getDebugInfo();
    expect(debug.activeTrigger).toBe('chatbar');

    element.triggerType = 'chatcard';
    await element.updateComplete;
    debug = element.getDebugInfo();
    expect(debug.activeTrigger).toBe('chatcard');
  });

  it('should collect custom CSS properties starting with --cw- in getDebugInfo', async () => {
    element.style.setProperty('--cw-accent', '#123456');
    element.style.setProperty('--cw-custom-prop', '10px');
    await element.updateComplete;

    const debug = element.getDebugInfo();
    expect(debug.cssVariables).toHaveProperty('--cw-accent');
  });

  it('handles window events toggle-contact-widget and close-contact-widget', async () => {
    window.dispatchEvent(new CustomEvent('toggle-contact-widget'));
    await element.updateComplete;
    expect(element.panelOpen).toBe(true);
    expect(chatStore.get().unreadCount).toBe(0);

    window.dispatchEvent(new CustomEvent('close-contact-widget'));
    await element.updateComplete;
    expect(element.panelOpen).toBe(false);
  });

  it('handles custom event handlers registered on root', async () => {
    vi.useFakeTimers();

    element.dispatchEvent(new CustomEvent('cw:toggle'));
    expect(element.panelOpen).toBe(true);

    element.dispatchEvent(new CustomEvent('cw:close-panel'));
    expect(element.panelOpen).toBe(false);

    element.dispatchEvent(new CustomEvent('cw:start-chat'));
    expect(element.panelOpen).toBe(true);

    element.dispatchEvent(new CustomEvent('cw:greet-dismiss'));
    expect(greetWindowStore.get().dismissed).toBe(true);

    element.dispatchEvent(new CustomEvent('cw:greet-input', { detail: 'hello' }));
    expect(chatStore.get().draft).toBe('hello');

    element.dispatchEvent(new CustomEvent('cw:greet-submit', { detail: '' }));
    element.dispatchEvent(new CustomEvent('cw:greet-submit', { detail: 'submitted greet text' }));
    expect(element.panelOpen).toBe(true);

    (element as any).activeTriggerOverride = 'chatcard';
    (element as any).userHasSentMessage = true;
    (element as any).checkCardToBarCollapse();

    vi.runAllTimers(); // runs setTimeout for send()

    element.dispatchEvent(new CustomEvent('cw:draft-change', { detail: 'draft text' }));
    expect(chatStore.get().draft).toBe('draft text');

    element.dispatchEvent(new CustomEvent('cw:send', { detail: 'msg text' }));
    expect((element as any).userHasSentMessage).toBe(true);

    element.dispatchEvent(new CustomEvent('cw:toggle-attach'));
    element.dispatchEvent(new CustomEvent('cw:toggle-emoji'));
    
    // Attach files with input and null input
    const mockInput = document.createElement('input');
    element.dispatchEvent(new CustomEvent('cw:attach-files', { detail: mockInput }));
    element.dispatchEvent(new CustomEvent('cw:attach-files', { detail: null }));

    element.dispatchEvent(new CustomEvent('cw:send-cropped-image', { detail: 'data:image/png;base64,123' }));
    element.dispatchEvent(new CustomEvent('cw:capture-screenshot'));
    element.dispatchEvent(new CustomEvent('cw:dismiss-consent'));
    element.dispatchEvent(new CustomEvent('cw:download-transcript'));
    element.dispatchEvent(new CustomEvent('cw:toggle-sounds'));
    element.dispatchEvent(new CustomEvent('cw:insert-emoji', { detail: '😊' }));
    
    // Submit offline with payload and without payload
    element.dispatchEvent(new CustomEvent('cw:submit-offline', { detail: { name: 'Bob', email: 'bob@example.com', message: 'Hi' } }));
    element.dispatchEvent(new CustomEvent('cw:submit-offline', { detail: null }));

    element.dispatchEvent(new CustomEvent('cw:submit-prechat', { detail: { name: 'Jane' } }));
    expect(element.panelOpen).toBe(true);

    element.dispatchEvent(new CustomEvent('cw:submit-postchat', { detail: { rating: 5 } }));
    expect(element.panelOpen).toBe(false);

    element.dispatchEvent(new CustomEvent('cw:start-new'));
    element.dispatchEvent(new CustomEvent('cw:toggle-expand'));
    element.dispatchEvent(new CustomEvent('cw:open-menu'));
    element.dispatchEvent(new CustomEvent('cw:close-popups'));
    element.dispatchEvent(new CustomEvent('cw:end-chat'));
    element.dispatchEvent(new CustomEvent('cw:confirm-end'));
    element.dispatchEvent(new CustomEvent('cw:confirm-cancel'));

    await element.updateComplete;
    vi.useRealTimers();
  });

  it('handles attach files when input has files or empty/null files', async () => {
    const uploadSpy = vi.spyOn(chatStore, 'uploadImage').mockImplementation(() => {});
    (element as any).handleAttachFiles(null as any);
    (element as any).handleAttachFiles({ files: [] } as any);
    expect(uploadSpy).not.toHaveBeenCalled();

    const mockInput = { files: [new File([], 'a.png')] } as any;
    (element as any).handleAttachFiles(mockInput);
    expect(uploadSpy).toHaveBeenCalledWith(mockInput);
  });
  it('handles keyboard navigation Escape key when confirmBox is active or null', async () => {
    element.panelOpen = true;
    await element.updateComplete;

    // With confirmBox present
    chatStore.get().confirmBox = { message: 'End?', confirmLabel: 'Yes', cancelLabel: 'No' };
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(chatStore.get().confirmBox).toBeNull();
    expect(element.panelOpen).toBe(true);

    // Without confirmBox
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(element.panelOpen).toBe(false);

    // When panel is closed, keydown returns early
    const evt = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventSpy = vi.spyOn(evt, 'preventDefault');
    element.dispatchEvent(evt);
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation Tab key trap', async () => {
    element.panelOpen = true;
    await element.updateComplete;

    // Create buttons with tabindex in shadow DOM to test focus collection and trapping
    const btn1 = document.createElement('button');
    btn1.setAttribute('tabindex', '0');
    const btn2 = document.createElement('button');
    btn2.setAttribute('tabindex', '0');
    element.shadowRoot?.appendChild(btn1);
    element.shadowRoot?.appendChild(btn2);

    const btn1Focus = vi.spyOn(btn1, 'focus');
    const btn2Focus = vi.spyOn(btn2, 'focus');

    // Case 1: Target outside element -> focus first button
    const tabOutside = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    vi.spyOn(tabOutside, 'composedPath').mockReturnValue([document.body, window]);
    element.dispatchEvent(tabOutside);
    expect(btn1Focus).toHaveBeenCalled();

    // Case 2: Shift+Tab on first element -> focus last button
    const tabShiftFirst = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    vi.spyOn(tabShiftFirst, 'composedPath').mockReturnValue([btn1, element.shadowRoot!, element]);
    element.dispatchEvent(tabShiftFirst);
    expect(btn2Focus).toHaveBeenCalled();

    // Case 3: Tab (no shift) on last element -> focus first button
    btn1Focus.mockClear();
    const tabLast = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true });
    vi.spyOn(tabLast, 'composedPath').mockReturnValue([btn2, element.shadowRoot!, element]);
    element.dispatchEvent(tabLast);
    expect(btn1Focus).toHaveBeenCalled();

    // Case 4: Element with nested shadowRoot AND matching sel in collectFocusables
    element.shadowRoot!.innerHTML = '';
    const customChild = document.createElement('div');
    customChild.setAttribute('tabindex', '0');
    const childShadow = customChild.attachShadow({ mode: 'open' });
    const innerBtn = document.createElement('button');
    innerBtn.setAttribute('tabindex', '0');
    childShadow.appendChild(innerBtn);
    element.shadowRoot?.appendChild(customChild);

    const innerBtnFocus = vi.spyOn(innerBtn, 'focus');
    const tabNested = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    vi.spyOn(tabNested, 'composedPath').mockReturnValue([document.body, window]);
    element.dispatchEvent(tabNested);
    expect(innerBtnFocus).toHaveBeenCalled();

    // Case 5: Tab on middle element (neither first nor last)
    element.shadowRoot!.innerHTML = '';
    const b1 = document.createElement('button');
    b1.setAttribute('tabindex', '0');
    const b2 = document.createElement('button');
    b2.setAttribute('tabindex', '0');
    const b3 = document.createElement('button');
    b3.setAttribute('tabindex', '0');
    element.shadowRoot!.appendChild(b1);
    element.shadowRoot!.appendChild(b2);
    element.shadowRoot!.appendChild(b3);

    const b1Focus = vi.spyOn(b1, 'focus');
    const b3Focus = vi.spyOn(b3, 'focus');

    // Shift+Tab on last element (target === last)
    const tabShiftLast = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    vi.spyOn(tabShiftLast, 'composedPath').mockReturnValue([b3, element.shadowRoot!, element]);
    element.dispatchEvent(tabShiftLast);

    // Case 6: Tab when focusables is empty
    element.shadowRoot!.innerHTML = '';
    const tabEmpty = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    element.dispatchEvent(tabEmpty);

    // Case 7: Tab when focusables has 1 element (first === last)
    const singleBtn = document.createElement('button');
    singleBtn.setAttribute('tabindex', '0');
    element.shadowRoot!.appendChild(singleBtn);
    const singleFocus = vi.spyOn(singleBtn, 'focus');

    const tabSingleNoShift = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true });
    vi.spyOn(tabSingleNoShift, 'composedPath').mockReturnValue([singleBtn, element.shadowRoot!, element]);
    element.dispatchEvent(tabSingleNoShift);
    expect(singleFocus).toHaveBeenCalled();

    const tabSingleShift = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    vi.spyOn(tabSingleShift, 'composedPath').mockReturnValue([singleBtn, element.shadowRoot!, element]);
    element.dispatchEvent(tabSingleShift);
  });

  it('handles focusLauncher timer on widget toggle/close', async () => {
    vi.useFakeTimers();
    element.panelOpen = true;

    // Create launcher element in shadow DOM
    const bubbleEl = document.createElement('cw-bubble');
    const focusSpy = vi.fn();
    (bubbleEl as any).focus = focusSpy;
    element.shadowRoot?.appendChild(bubbleEl);

    // Toggle widget to close
    window.dispatchEvent(new CustomEvent('toggle-contact-widget'));
    expect(element.panelOpen).toBe(false);

    vi.advanceTimersByTime(100);
    expect(focusSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('handles handleSubmitOffline directly with data object and empty parameter', () => {
    (element as any).handleSubmitOffline({ name: 'Alice', email: 'alice@example.com', message: 'Hello' });
    expect(chatStore.get().offlineName).toBe('Alice');
    expect(chatStore.get().offlineEmail).toBe('alice@example.com');
    expect(chatStore.get().offlineMessage).toBe('Hello');

    (element as any).handleSubmitOffline({ name: 'Bob' });
    expect(chatStore.get().offlineName).toBe('Bob');

    (element as any).handleSubmitOffline({ email: 'bob@example.com' });
    expect(chatStore.get().offlineEmail).toBe('bob@example.com');

    (element as any).handleSubmitOffline({ message: 'Howdy' });
    expect(chatStore.get().offlineMessage).toBe('Howdy');

    const origGet = chatStore.get;
    (chatStore as any).get = () => undefined;
    (element as any).handleSubmitOffline({ name: 'Charlie' });
    (chatStore as any).get = origGet;

    (element as any).handleSubmitOffline();
  });

  it('evaluates all trigger fallbacks in getDebugInfo and render', async () => {
    element.triggerType = undefined;

    // Case 1: chatbar enabled with layout = 'card'
    chatbarStore.get().enabled = true;
    chatbarStore.get().layout = 'card';
    await element.updateComplete;
    let debug = element.getDebugInfo();
    expect(debug.activeTrigger).toBe('chatcard');

    // Case 2: chatbar enabled with layout = 'bar'
    chatbarStore.get().layout = 'bar';
    await element.updateComplete;
    debug = element.getDebugInfo();
    expect(debug.activeTrigger).toBe('chatbar');

    // Case 3: chatbar disabled -> defaults to 'bubble'
    chatbarStore.get().enabled = false;
    await element.updateComplete;
    debug = element.getDebugInfo();
    expect(debug.activeTrigger).toBe('bubble');
  });

  it('renders uninitialized template when initialized is false', async () => {
    element.initialized = false;
    await element.updateComplete;
    expect(element.renderRoot.childElementCount).toBe(0);
  });

  it('updates render when store emits events', async () => {
    const initialRev = (element as any).rev;
    chatStore.toggleExpand();
    await element.updateComplete;
    expect((element as any).rev).toBeGreaterThan(initialRev);
  });

  it('handles updated branches when gw.inputBox is undefined and prechat/postchat is undefined', async () => {
    const gw = greetWindowStore.get();
    (gw as any).inputBox = undefined;

    element.enableGreetWindow = true;
    element.greetOpeningDelaySec = undefined;
    element.enableInputCard = undefined;
    element.greetInputOpeningDelaySec = undefined;
    await element.updateComplete;

    expect(gw.enabled).toBe(true);

    // prechatEnabled & postchatEnabled updated with undefined
    element.prechatEnabled = undefined;
    element.postchatEnabled = undefined;
    await element.updateComplete;
  });

  it('handles updated greet delay props when props are undefined', async () => {
    element.enableGreetWindow = undefined;
    element.greetOpeningDelaySec = undefined;
    await element.updateComplete;
  });

  it('handles collectFocusables when shadowRoot is null', () => {
    const rootNullEl = new CwWidgetRoot();
    Object.defineProperty(rootNullEl, 'shadowRoot', { value: null, writable: true, configurable: true });
    const focusables = (rootNullEl as any).collectFocusables();
    expect(focusables).toEqual([]);
  });

  it('handles checkCardToBarCollapse across all currentTrigger fallbacks', async () => {
    (element as any).userHasSentMessage = true;

    // 1. activeTriggerOverride = 'chatcard'
    (element as any).activeTriggerOverride = 'chatcard';
    (element as any).checkCardToBarCollapse();

    // 2. activeTriggerOverride = 'chatbar'
    (element as any).activeTriggerOverride = 'chatbar';
    (element as any).checkCardToBarCollapse();

    // 3. activeTriggerOverride = 'bubble'
    (element as any).activeTriggerOverride = 'bubble';
    (element as any).checkCardToBarCollapse();

    // 4. triggerType = 'chatcard'
    (element as any).activeTriggerOverride = undefined;
    element.triggerType = 'chatcard';
    (element as any).checkCardToBarCollapse();

    // 5. triggerType = 'chatbar'
    element.triggerType = 'chatbar';
    (element as any).checkCardToBarCollapse();

    // 6. triggerType = 'bubble'
    element.triggerType = 'bubble';
    (element as any).checkCardToBarCollapse();

    // 7. chatbarStore enabled = true, layout = 'card'
    element.triggerType = undefined;
    chatbarStore.get().enabled = true;
    chatbarStore.get().layout = 'card';
    (element as any).checkCardToBarCollapse();

    // 8. chatbarStore enabled = true, layout = 'bar'
    chatbarStore.get().layout = 'bar';
    (element as any).checkCardToBarCollapse();

    // 9. chatbarStore enabled = false
    chatbarStore.get().enabled = false;
    (element as any).checkCardToBarCollapse();

    // 10. chatbarStore returns undefined
    const origChatbarGet = chatbarStore.get;
    (chatbarStore as any).get = () => undefined;
    (element as any).checkCardToBarCollapse();
    (chatbarStore as any).get = origChatbarGet;
  });

  it('handles keydown Enter when panelOpen is true', async () => {
    element.panelOpen = true;
    const evt = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventSpy = vi.spyOn(evt, 'preventDefault');
    element.dispatchEvent(evt);
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('handles updated when greetWindowStore returns undefined', async () => {
    const origGet = greetWindowStore.get;
    (greetWindowStore as any).get = () => undefined;

    element.enableGreetWindow = true;
    await element.updateComplete;

    (greetWindowStore as any).get = origGet;
  });

  it('handles checkCardToBarCollapse when chatStore returns undefined', async () => {
    const origGet = chatStore.get;
    (chatStore as any).get = () => undefined;

    (element as any).userHasSentMessage = false;
    (element as any).activeTriggerOverride = 'chatcard';
    (element as any).checkCardToBarCollapse();

    (chatStore as any).get = origGet;
  });

  it('handles getDebugInfo when window.getComputedStyle is undefined', async () => {
    const orig = window.getComputedStyle;
    vi.stubGlobal('getComputedStyle', undefined as any);

    const debug = element.getDebugInfo();
    expect(debug).toBeDefined();

    vi.stubGlobal('getComputedStyle', orig);
  });

  it('renders with activeTriggerOverride, triggerType, and chatbar layout card/bar/disabled', async () => {
    // activeTriggerOverride
    (element as any).activeTriggerOverride = 'chatbar';
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-widget-layout')).not.toBeNull();

    // triggerType defined
    (element as any).activeTriggerOverride = undefined;
    element.triggerType = 'chatcard';
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-widget-layout')).not.toBeNull();

    // triggerType undefined, chatbar.enabled = true, layout = 'bar'
    element.triggerType = undefined;
    chatbarStore.get().enabled = true;
    chatbarStore.get().layout = 'bar';
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-widget-layout')).not.toBeNull();

    // triggerType undefined, chatbar.enabled = false
    chatbarStore.get().enabled = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-widget-layout')).not.toBeNull();
  });

  it('handles prechatEnabled/postchatEnabled being reset to undefined', async () => {
    element.prechatEnabled = true;
    element.postchatEnabled = true;
    await element.updateComplete;

    (element as any).prechatEnabled = undefined;
    (element as any).postchatEnabled = undefined;
    await element.updateComplete;
  });

  it('handles cw:submit-prechat and cw:submit-postchat without detail payloads', async () => {
    element.dispatchEvent(new CustomEvent('cw:submit-prechat'));
    await element.updateComplete;

    element.dispatchEvent(new CustomEvent('cw:submit-postchat'));
    await element.updateComplete;
  });

  it('resolves chatcard and chatbar triggers via chatbar config when triggerType is unset', async () => {
    (element as any).activeTriggerOverride = undefined;
    element.triggerType = undefined as any;

    const cbs = chatbarStore.get();
    cbs.enabled = true;
    cbs.layout = 'card';
    element.panelOpen = true;
    await element.updateComplete;
    window.dispatchEvent(new CustomEvent('close-contact-widget'));
    await element.updateComplete;

    cbs.layout = 'bar';
    element.panelOpen = true;
    await element.updateComplete;
    window.dispatchEvent(new CustomEvent('close-contact-widget'));
    await element.updateComplete;

    chatbarStore.get().enabled = false;
  });
});
