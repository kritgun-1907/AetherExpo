import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { supabase, signIn, signUp } from './src/api/supabase';
import ParticleContainer from './src/components/ParticleContainer'; // 1. Import the new component

// Define paths for your assets
const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');
const LOGO_IMAGE = require('./assets/logo-transparent.png');

export default function LoginScreen({ setIsLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ... (Your handleSignUp and handleSignIn functions remain the same)
    const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSignUp = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      Alert.alert('Success!', 'Please check your email to confirm your account.');
    }
    setLoading(false);
  };
  
  const handleSignIn = async () => {
    if (!email || !password) {
        Alert.alert('Error', 'Email and password cannot be empty.');
        return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    if (error) {
        Alert.alert('Sign In Failed', error.message);
    } else if (data.user) {
        setIsLoggedIn(true);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={styles.backgroundImage}
      >
        {/* 2. Add the ParticleContainer here */}
        <ParticleContainer /> 

        <View style={styles.overlay}>
          <View style={styles.header}>
            <Image 
              source={LOGO_IMAGE}
              style={styles.logo} 
            />
            <Text style={styles.title}>Αἴτηρ</Text>
            <Text style={styles.subtitle}>Track your carbon footprint</Text>
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

            {loading ? (
              <ActivityIndicator size="large" color="#4ade80" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.signInButton]} onPress={handleSignIn}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#f0fdf4',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#d1fae5',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    backgroundColor: '#4ade80',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#064e3b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  signInButtonText: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: 'bold',
  },
});