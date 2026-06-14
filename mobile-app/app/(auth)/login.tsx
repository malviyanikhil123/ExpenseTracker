import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { useLogin } from '@/api/queries';
import { API_BASE_URL } from '@/api/client';
import { Screen } from '@/components/screen';
import { palette } from '@/constants/app-theme';
import { useAuthStore } from '@/stores/auth-store';
import { LoginIllustration } from '@/components/vector-illustrations';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type Form = z.infer<typeof schema>;

export default function Login() {
  const login = useLogin();
  const setSession = useAuthStore((state) => state.setSession);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  
  const errorMessage = login.error
    ? isAxiosError(login.error)
      ? login.error.response?.data?.message ??
        (login.error.code === 'ERR_NETWORK'
          ? `Cannot reach ${API_BASE_URL}. Check Wi-Fi and Windows Firewall.`
          : login.error.message)
      : 'Unable to sign in. Try again.'
    : null;
  
  const submit = handleSubmit(async (values) => {
    try {
      await setSession(await login.mutateAsync(values));
    } catch {
      // The mutation exposes the error through login.error for the form message.
    }
  });
  return (
    <Screen style={styles.screen}>
      <View style={styles.headerContainer}>
        <View style={styles.illustrationContainer}>
          <LoginIllustration />
        </View>
        <Text variant="displaySmall" style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your money clearly.</Text>
      </View>
      <View style={styles.form}>
        <Controller control={control} name="email" render={({ field }) => (
          <TextInput label="Email" mode="outlined" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={!!errors.email} />
        )} />
        <Controller control={control} name="password" render={({ field }) => (
          <TextInput label="Password" mode="outlined" secureTextEntry value={field.value} onChangeText={field.onChange} error={!!errors.password} />
        )} />
        {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
        <Button mode="contained" contentStyle={styles.button} loading={login.isPending} onPress={submit}>Sign in</Button>
        <Link href="/(auth)/register" asChild><Button>New here? Create account</Button></Link>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { justifyContent: 'center', gap: 36 },
  headerContainer: { alignItems: 'flex-start' },
  illustrationContainer: { width: '100%', alignItems: 'center', marginBottom: 12 },
  title: { fontWeight: '800', color: palette.text },
  subtitle: { color: palette.muted, marginTop: 8 },
  form: { gap: 14 },
  button: { height: 52 },
});
