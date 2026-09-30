import { useState } from 'react';
import { createProfile } from '../../db/repository';
import { useDataVersion } from '../../data/DataVersion';
import { Blob } from '../../components/Blob';

export function WelcomeScreen() {
  const { bump } = useDataVersion();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await createProfile(name, email);
    bump();
  }

  return (
    <div className="screen welcome">
      <div className="welcome__art" aria-hidden="true">
        <Blob shape="flower" color="var(--yellow)" size={150} rotate={8} className="welcome__blob welcome__blob--a" />
        <Blob shape="heart" color="var(--pink)" size={110} rotate={-10} className="welcome__blob welcome__blob--b" />
        <Blob shape="star" color="var(--lavender)" size={80} rotate={14} className="welcome__blob welcome__blob--c" />
      </div>

      <header className="welcome__head">
        <h1>Health Diary</h1>
        <p className="welcome__tagline">Log how you feel and what you eat. Find out what sets you off.</p>
      </header>

      <form onSubmit={handleSubmit} className="form">
        <label>
          <span className="field-label">What should we call you?</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            autoComplete="given-name"
            required
          />
        </label>
        <label>
          <span className="field-label">Email (optional)</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <button type="submit" className="btn btn--dark btn--block" disabled={!name.trim() || busy}>
          Create my diary
        </button>
        <p className="muted welcome__note">Your diary stays on this device. No password needed.</p>
      </form>
    </div>
  );
}
