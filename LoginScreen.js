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
import { supabase, signIn } from './src/api/supabase'; // We only need signIn here
import ParticleContainer from './src/components/ParticleContainer';

// Define paths for your assets
const BACKGROUND_IMAGE = require('./assets/hero-carbon-tracker.jpg');
const LOGO_IMAGE = require('./assets/logo-transparent.png');

// Note: navigation is now a prop
export default function LoginScreen({ navigation }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign In is the primary action on this screen now
  const handleSignIn = async () => {
    if (!email || !password) {
        Alert.alert('Error', 'Email and password cannot be empty.');
        return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    if (error) {
        Alert.alert('Sign In Failed', error.message);
    }
    // The onAuthStateChange listener in App.js will handle setting isLoggedIn
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
                <TouchableOpacity style={styles.button} onPress={handleSignIn}>
                  <Text style={styles.buttonText}>Sign In</Text>
                </TouchableOpacity>

                {/* LINKS TO OTHER SCREENS */}
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

// Add/update these styles in your StyleSheet
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
  // New styles for the links
  linksContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#4ade80',
    paddingVertical: 10,
    fontSize: 14,
  },
});