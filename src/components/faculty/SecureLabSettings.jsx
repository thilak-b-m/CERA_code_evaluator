const defaults = {
  enabled: false,
  requireFullscreen: true,
  recordTabSwitches: true,
  recordFullscreenExits: true,
  maxFullscreenExits: 2,
  fullscreenExitTimeoutSeconds: 15,
};

function SettingToggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 accent-cera-primary"
      />
      <span className="text-cera-text">{label}</span>
    </label>
  );
}

export default function SecureLabSettings({ value, onChange }) {
  const settings = { ...defaults, ...value };
  const update = (field, nextValue) => onChange({ ...settings, [field]: nextValue });

  return (
    <section className="rounded-xl border border-cera-border bg-cera-card">
      <div className="border-b border-cera-border px-5 py-4">
        <h2 className="font-semibold text-cera-text">Secure Lab Settings</h2>
        <p className="mt-1 text-xs text-cera-muted">
          Monitor selected browser activity as reviewable signals, not proof of misconduct.
        </p>
      </div>
      <div className="grid gap-4 p-5">
        <SettingToggle
          label="Enable Secure Lab Mode"
          checked={settings.enabled}
          onChange={(checked) => onChange({
            ...settings,
            enabled: checked,
            ...(checked ? {} : { fullscreenExitTimeoutSeconds: 15 }),
          })}
        />
        <div className="grid gap-3 pl-2 sm:grid-cols-2">
          <SettingToggle
            label="Require fullscreen"
            checked={settings.requireFullscreen}
            disabled={!settings.enabled}
            onChange={(checked) => update('requireFullscreen', checked)}
          />
          <SettingToggle
            label="Record tab switches"
            checked={settings.recordTabSwitches}
            disabled={!settings.enabled}
            onChange={(checked) => update('recordTabSwitches', checked)}
          />
          <SettingToggle
            label="Record fullscreen exits"
            checked={settings.recordFullscreenExits}
            disabled={!settings.enabled}
            onChange={(checked) => update('recordFullscreenExits', checked)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Time before auto-submit after fullscreen exit (seconds)</span>
            <input
              className="input"
              type="number"
              min="1"
              max="300"
              step="1"
              value={settings.enabled ? settings.fullscreenExitTimeoutSeconds : 15}
              disabled={!settings.enabled}
              onChange={(event) => update('fullscreenExitTimeoutSeconds', Number(event.target.value))}
            />
            <span className="mt-1 block text-xs text-cera-muted">
              Students have this long to return to fullscreen before auto-submit. Default: 15 seconds (1–300 seconds).
            </span>
          </label>
          <label>
            <span className="label">Auto-submit at fullscreen exits (max)</span>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.maxFullscreenExits}
              disabled={!settings.enabled || !settings.recordFullscreenExits}
              onChange={(event) => update('maxFullscreenExits', Number(event.target.value))}
            />
            <span className="mt-1 block text-xs text-cera-muted">
              The attempt is submitted automatically when fullscreen exits reach this count. 0 disables auto-submit.
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
