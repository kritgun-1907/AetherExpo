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
import { supabase, signIn } from './src/api/supabase';

const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');
const LOGO_IMAGE = require('./assets/logo-transparent.png');

export default function LoginScreen({ navigation }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password cannot be empty.');
      return;
    }

    setLoading(true);
    
    try {
      // Add timeout protection to the signIn call
      const signInPromise = signIn(email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      
      if (error) {
        Alert.alert('Sign In Failed', error.message || 'Unable to sign in. Please try again.');
      } else if (data) {
        // Success - the auth listener in App.js will handle navigation
        console.log('Sign in successful');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert(
        'Connection Error', 
        error.message || 'Unable to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
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
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4ade80" />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.button} onPress={handleSignIn}>
                  <Text style={styles.buttonText}>Sign In</Text>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.linkText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

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
  linksContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#4ade80',
    paddingVertical: 10,
    fontSize: 14,
  },
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#4ade80',
    marginTop: 10,
    fontSize: 14,
  },
});