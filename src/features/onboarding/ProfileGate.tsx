import { useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../../db/schema';
import { getProfile } from '../../db/repository';
import { useDataVersion } from '../../data/DataVersion';
import { WelcomeScreen } from './WelcomeScreen';
import { OnboardingFlow } from './OnboardingFlow';

// Shows sign-up, then onboarding, before the rest of the app. Re-reads on bump() so Manage can restart setup.
export function ProfileGate({ children }: { children: ReactNode }) {
  const { version } = useDataVersion();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    getProfile().then((p) => setProfile(p ?? null));
  }, [version]);

  if (profile === undefined) return null;
  if (profile === null) return <WelcomeScreen />;
  if (!profile.onboardedAt) return <OnboardingFlow profile={profile} />;
  return <>{children}</>;
}
