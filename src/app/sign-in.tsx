import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { useT } from '@/i18n';
import { sendEmailCode, signInWithGoogle, useAccount, verifyEmailCode } from '@/services/account';
import { cleanCode, isCode, isEmail } from '@/state/syncRules';
import { haptic, makeStyles, motion, space, useTheme } from '@/theme';

// matches Supabase → SMTP Settings → Minimum interval per user
const RESEND_S = 60;

/** Sign in with Google or a one-time email code. Optional: everything works signed out. */
export default function SignIn() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const acct = useAccount();
  const [step, setStep] = useState<'start' | 'code'>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | 'code' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<TextInput>(null);

  // Signed in (by code, by Google, or by the deep link): close with a word.
  useEffect(() => {
    if (acct.status === 'signedIn') {
      haptic.success();
      toast(t('account.signedIn'), 'check');
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acct.status]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const google = async () => {
    setError(null);
    setBusy('google');
    const r = await signInWithGoogle();
    setBusy(null);
    if (!r.ok && !('cancelled' in r)) {
      setError(r.message);
      haptic.fail();
    }
  };

  const send = async () => {
    if (!isEmail(email)) {
      setError(t('signin.badEmail'));
      haptic.fail();
      return;
    }
    setError(null);
    setBusy('email');
    const r = await sendEmailCode(email);
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      haptic.fail();
      return;
    }
    setStep('code');
    setWait(RESEND_S);
    setTimeout(() => codeRef.current?.focus(), motion.dur.ui);
  };

  const verify = async (value = code) => {
    if (!isCode(value)) return;
    setError(null);
    setBusy('code');
    const r = await verifyEmailCode(email, value);
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      haptic.fail();
    }
  };

  if (acct.status === 'off') {
    return (
      <Screen>
        <Header title={t('account.signIn')} />
        <View style={styles.pad}>
          <T kind="title">{t('signin.offTitle')}</T>
          <T kind="small">{t('signin.offBody')}</T>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={step === 'code' ? t('signin.codeTitle') : t('account.signIn')} onBack={step === 'code' ? () => setStep('start') : undefined} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          {step === 'start' ? (
            <Animated.View key="start" entering={FadeInDown.duration(motion.dur.ui)} exiting={FadeOut.duration(motion.dur.exit)} style={styles.stack}>
              <T kind="display">{t('signin.title')}</T>
              <T kind="small">{t('signin.body')}</T>
              <Button label={t('signin.google')} glyph="globe" variant="ink" loading={busy === 'google'} disabled={!!busy} onPress={google} style={styles.gap} />
              <View style={styles.or}>
                <Hairline style={styles.flex} />
                <T kind="mono">{t('signin.or')}</T>
                <Hairline style={styles.flex} />
              </View>
              <Field
                glyph="mail"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder={t('signin.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={send}
                accessibilityLabel={t('signin.email')}
              />
              <Button label={t('signin.sendCode')} glyph="mail" loading={busy === 'email'} disabled={!!busy || !email.trim()} onPress={send} />
            </Animated.View>
          ) : (
            <Animated.View key="code" entering={FadeInDown.duration(motion.dur.ui)} style={styles.stack}>
              <T kind="small">{t('signin.codeSent', { email: email.trim() })}</T>
              <Field
                ref={codeRef}
                glyph="lock"
                value={code}
                onChangeText={(v) => {
                  setCode(cleanCode(v));
                  setError(null);
                }}
                placeholder="000000"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={() => verify()}
                style={styles.code}
                accessibilityLabel={t('signin.codeLabel')}
              />
              <Button label={t('signin.verify')} glyph="check" loading={busy === 'code'} disabled={!!busy || !isCode(code)} onPress={() => verify()} />
              <Button
                label={wait > 0 ? t('signin.resendIn', { s: wait }) : t('signin.resend')}
                variant="quiet"
                glyph="refresh"
                disabled={wait > 0 || !!busy}
                onPress={send}
              />
            </Animated.View>
          )}

          {error ? (
            <Animated.View entering={FadeIn}>
              <T kind="small" color={c.lateriteText} accessibilityLiveRegion="assertive">
                {error}
              </T>
            </Animated.View>
          ) : null}

          <T kind="caption" style={styles.fine}>
            {t('signin.fine')}
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  pad: { paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: space.xxxl, gap: space.lg },
  stack: { gap: space.md },
  gap: { marginTop: space.md },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.sm },
  code: { fontSize: 24, letterSpacing: 8 },
  fine: { marginTop: space.xl },
}));
