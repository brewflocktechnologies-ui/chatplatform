import { html } from 'lit';
import '../../components/pages/cw-widget-root.js';
import { exportFullStoreConfig } from '../../store/chat-store.js';

export default {
  title: 'Templates/Token Exporter & Live Widget',
  component: 'cw-widget-root',
};

let copiedTimeout: any = null;

function copyTokenToClipboard(jsonString: string, btnElement: HTMLElement) {
  navigator.clipboard.writeText(jsonString).then(() => {
    const orig = btnElement.innerText;
    btnElement.innerText = '✅ Copied to Clipboard!';
    if (copiedTimeout) clearTimeout(copiedTimeout);
    copiedTimeout = setTimeout(() => {
      btnElement.innerText = orig;
    }, 2000);
  });
}

function downloadTokenFile(jsonString: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'widget-token.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const StorybookTokenExporter = {
  render: () => {
    // Read the current live store state (which contains all updates accumulated across all organism stories)
    const fullToken = exportFullStoreConfig();
    const jsonString = JSON.stringify(fullToken, null, 2);

    return html`
      <div style="display: flex; gap: 24px; font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; height: 680px;">


        <!-- Right Column: Full JSON Token Exporter -->
        <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; height: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #38bdf8;">⚙️ Live Design JSON Token</div>
              <div style="font-size: 12px; color: #94a3b8;">Reflects all customized properties across all stories</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button
                @click="${(e: Event) => copyTokenToClipboard(jsonString, e.target as HTMLElement)}"
                style="background: #0284c7; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s;"
              >
                📋 Copy JSON Token
              </button>
              <button
                @click="${() => downloadTokenFile(jsonString)}"
                style="background: #059669; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s;"
              >
                📥 Download JSON
              </button>
            </div>
          </div>

          <div style="flex: 1; overflow: auto; background: #1e293b; border-radius: 8px; padding: 12px; border: 1px solid #334155;">
            <pre style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #a5f3fc; white-space: pre-wrap; word-break: break-all;">${jsonString}</pre>
          </div>
        </div>
      </div>
    `;
  },
};
