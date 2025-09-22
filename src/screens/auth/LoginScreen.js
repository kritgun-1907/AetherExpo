import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Button } from 'react-native-elements';
import { signIn } from '../../api/supabase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      navigation.navigate('Main');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>🌍 Aether</Text>
        <Text style={styles.tagline}>Track your carbon footprint</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title="Login"
          loading={loading}
          buttonStyle={styles.loginButton}
          onPress={handleLogin}
        />

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 50
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#065F46'
  },
  tagline: {
    fontSize: 16,
    color: '#047857',
    marginTop: 10
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    elevation: 3
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#111827'
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#10B981',
    marginBottom: 20
  },
  loginButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 15
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  signupText: {
    color: '#6B7280'
  },
  signupLink: {
    color: '#10B981',
    fontWeight: 'bold'
  }
});

export default LoginScreen;