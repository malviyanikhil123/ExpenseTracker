import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { useRegister } from '@/api/queries';
import { API_BASE_URL } from '@/api/client';
import { Screen } from '@/components/screen';
import { palette } from '@/constants/app-theme';
import { useAuthStore } from '@/stores/auth-store';
import { RegisterIllustration } from '@/components/vector-illustrations';

const schema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(8) });
type Form = z.infer<typeof schema>;

export default function Register() {
  const register = useRegister();
  const setSession = useAuthStore((state) => state.setSession);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { fullName: '', email: '', password: '' } });
  const errorMessage = register.error
    ? isAxiosError(register.error)
      ? register.error.response?.data?.message ??
        (register.error.code === 'ERR_NETWORK'
          ? `Cannot reach ${API_BASE_URL}. Check Wi-Fi and Windows Firewall.`
          : register.error.message)
      : 'Could not create your account.'
    : null;
  return (
    <Screen style={styles.screen}>
      <View style={styles.headerContainer}>
        <View style={styles.illustrationContainer}>
          <RegisterIllustration />
        </View>
        <Text variant="displaySmall" style={styles.title}>Create account</Text>
      </View>
      <View style={styles.form}>
        {(['fullName', 'email', 'password'] as const).map((name) => (
          <Controller key={name} control={control} name={name} render={({ field }) => (
            <TextInput label={name === 'fullName' ? 'Full name' : name[0].toUpperCase() + name.slice(1)} mode="outlined" secureTextEntry={name === 'password'} autoCapitalize={name === 'email' ? 'none' : 'words'} value={field.value} onChangeText={field.onChange} error={!!errors[name]} />
          )} />
        ))}
        {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
        <Button
          mode="contained"
          style={styles.actionBtn}
          contentStyle={styles.button}
          loading={register.isPending}
          onPress={handleSubmit(async (values) => {
            try {
              await setSession(await register.mutateAsync(values));
            } catch {
              // The mutation exposes the error through register.error.
            }
          })}>
          Create account
        </Button>
        <Link href="/(auth)/login" asChild><Button>Already have an account? Sign in</Button></Link>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { justifyContent: 'center', gap: 32 },
  headerContainer: { alignItems: 'flex-start' },
  illustrationContainer: { width: '100%', alignItems: 'center', marginBottom: 12 },
  title: { fontWeight: '800', color: palette.text },
  form: { gap: 14 },
  button: { height: 52 },
  actionBtn: { borderRadius: 16 },
});
