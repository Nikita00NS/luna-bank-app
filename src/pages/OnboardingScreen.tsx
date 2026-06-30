import React, { useEffect } from 'react';
import { useStore } from '../lib/store';

// Onboarding now redirects to AuthScreen
export default function OnboardingScreen() {
  const { go } = useStore();
  useEffect(() => { go('auth'); }, []);
  return null;
}
