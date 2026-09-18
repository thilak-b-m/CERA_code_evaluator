import { useState } from 'react';
import { Check } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function Profile() {
  const {
    notify,
    profile,
    setProfile,
  } = useApp();

  const [firstName, setFirstName] = useState(
    profile.firstName
  );

  const [lastName, setLastName] = useState(
    profile.lastName
  );

  const [email, setEmail] = useState(
    profile.email
  );

  const [bio, setBio] = useState(
    profile.bio ||
      'Faculty member focused on algorithms, systems, and making code review a learning moment.'
  );

  const handleSave = () => {
    const updatedProfile = {
      ...profile,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      bio: bio.trim(),
    };

    setProfile(updatedProfile);

    notify('Profile changes saved');
  };

  const initials =
    `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();

  return (
    <Page
      title="Faculty profile"
      subtitle="How your teaching workspace appears to your colleagues."
      actions={
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
        >
          <Check size={14} />
          Save changes
        </button>
      }
    >
      <div style={{ maxWidth: 850 }}>
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">
                Profile details
              </div>

              <div className="panel-kicker">
                Visible to faculty collaborators
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
            {/* Profile header */}
            <div
              style={{
                display: 'flex',
                gap: 15,
                alignItems: 'center',
                paddingBottom: 16,
                borderBottom:
                  '1px solid var(--border)',
              }}
            >
              <Avatar color="#22D3EE">
                {initials}
              </Avatar>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {profile.firstName}{' '}
                  {profile.lastName}
                </div>

                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Profile photo · initials fallback
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  marginLeft: 'auto',
                }}
                onClick={() =>
                  notify('Photo selection opened')
                }
              >
                Change photo
              </button>
            </div>

            {/* First and last name */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 14,
              }}
            >
              <label>
                <span className="label">
                  First name
                </span>

                <input
                  className="input"
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(e.target.value)
                  }
                />
              </label>

              <label>
                <span className="label">
                  Last name
                </span>

                <input
                  className="input"
                  value={lastName}
                  onChange={(e) =>
                    setLastName(e.target.value)
                  }
                />
              </label>
            </div>

            {/* Email */}
            <label>
              <span className="label">
                Work email
              </span>

              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </label>

            {/* Teaching bio */}
            <label>
              <span className="label">
                Teaching bio
              </span>

              <textarea
                className="textarea"
                value={bio}
                onChange={(e) =>
                  setBio(e.target.value)
                }
              />
            </label>
          </div>
        </Card>
      </div>
    </Page>
  );
}