import ceraLogo from '../../assets/images/cera-logo.png';

export default function AuthBrandPanel() {
  return (
    <div className="auth-visual">
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div className="brand-mark" aria-label="CERA logo">
          <img
            src={ceraLogo}
            alt="CERA"
            style={{
              width: 52,
              height: 52,
              objectFit: 'contain',
              display: 'block',
              transform: 'scale(1.5)',
            }}
          />
        </div>
        <div>
          <div className="logo-word">CERA</div>
          <div style={{ color: 'var(--text)', fontSize: 9, marginTop: 2 }}>
            Code Execution, Review and Assessment
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
            Learn, execute, excel
          </div>
        </div>
      </div>

      <div className="ring-art">
        <div className="ring-core">
          <img src={ceraLogo} alt="CERA" style={{ width: 75, height: 75, objectFit: 'contain' }} />
        </div>
        <div style={{ position: 'absolute', top: '18%', right: '11%', color: 'var(--accent)', font: '10px var(--app-font-mono)' }}>
          EXECUTE
        </div>
        <div style={{ position: 'absolute', bottom: '18%', left: '8%', color: '#A5B4FC', font: '10px var(--app-font-mono)' }}>
          ASSESS
        </div>
      </div>

      <div>
        <div className="eyebrow">LEARN · EXECUTE · EXCEL</div>
        <h1 style={{ fontSize: 'clamp(32px,4vw,54px)', letterSpacing: '-.06em', lineHeight: 0.98, margin: '12px 0', maxWidth: 500 }}>
          Teaching code,
          <br />
          <span style={{ color: '#A5B4FC' }}>with clarity.</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 420, lineHeight: 1.6 }}>
          The command center for faculty who want every lab, submission, and learning signal in reach.
        </p>
      </div>
    </div>
  );
}