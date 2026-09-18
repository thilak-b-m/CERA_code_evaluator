import { useEffect, useState } from 'react';
import {
  Check,
  Moon,
  Sun,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';

const SETTINGS_STORAGE_KEY = 'cera-settings';

const DEFAULT_SETTINGS = {
  liveLabHelp: true,
  newSubmissions: true,
  weeklyCoursePulse: false,
  evaluationSort: 'Risk and urgency',
  showAISignals: true,
};

function readSettings() {
  try {
    const saved = localStorage.getItem(
      SETTINGS_STORAGE_KEY
    );

    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(saved),
    };
  } catch (error) {
    console.error(
      'Error loading settings:',
      error
    );

    return DEFAULT_SETTINGS;
  }
}

export default function Settings() {
  const {
    theme,
    setTheme,
    notify,
  } = useApp();

  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
      );

      notify('Settings saved successfully');
    } catch (error) {
      console.error(
        'Error saving settings:',
        error
      );

      notify('Failed to save settings');
    }
  };

  return (
    <Page
      title="Settings"
      subtitle="Tune CERA to the way you teach."
      actions={
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
        >
          <Check size={14} />
          Save settings
        </button>
      }
    >
      <div
        style={{
          maxWidth: 850,
          display: 'grid',
          gap: 14,
        }}
      >
        {/* Appearance */}
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">
                Appearance
              </div>

              <div className="panel-kicker">
                Make the workspace yours
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Interface theme
              </div>

              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Choose the environment you focus best in.
              </div>
            </div>

            <div className="segmented">
              <button
                type="button"
                className={
                  theme === 'dark'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setTheme('dark')
                }
              >
                <Moon
                  size={13}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 5,
                  }}
                />
                Dark
              </button>

              <button
                type="button"
                className={
                  theme === 'light'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setTheme('light')
                }
              >
                <Sun
                  size={13}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 5,
                  }}
                />
                Light
              </button>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">
                Notifications
              </div>

              <div className="panel-kicker">
                Stay in the loop when it counts
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 17,
            }}
          >
            <label
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={settings.liveLabHelp}
                onChange={(event) =>
                  updateSetting(
                    'liveLabHelp',
                    event.target.checked
                  )
                }
              />

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Live lab help requests
                </div>

                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Get an alert when a student asks for help.
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={settings.newSubmissions}
                onChange={(event) =>
                  updateSetting(
                    'newSubmissions',
                    event.target.checked
                  )
                }
              />

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  New submissions
                </div>

                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Receive a digest every 30 minutes.
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={settings.weeklyCoursePulse}
                onChange={(event) =>
                  updateSetting(
                    'weeklyCoursePulse',
                    event.target.checked
                  )
                }
              />

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Weekly course pulse
                </div>

                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  A Monday summary of progress and risks.
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* Review preferences */}
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">
                Review preferences
              </div>

              <div className="panel-kicker">
                Keep quality signals useful
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 15,
            }}
          >
            <label>
              <span className="label">
                Default evaluation sort
              </span>

              <select
                className="select"
                value={settings.evaluationSort}
                onChange={(event) =>
                  updateSetting(
                    'evaluationSort',
                    event.target.value
                  )
                }
              >
                <option>
                  Risk and urgency
                </option>

                <option>
                  Newest first
                </option>

                <option>
                  Lowest score first
                </option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                checked={settings.showAISignals}
                onChange={(event) =>
                  updateSetting(
                    'showAISignals',
                    event.target.checked
                  )
                }
              />

              Show AI signals in evaluation queue
            </label>
          </div>
        </Card>
      </div>
    </Page>
  );
}