import { Redirect } from 'expo-router';

import { updateSettings } from '@/state/settings';

/** Placeholder: replaced in the redesign. */
export default function Onboarding() {
  updateSettings({ onboarded: true });
  return <Redirect href="/" />;
}
