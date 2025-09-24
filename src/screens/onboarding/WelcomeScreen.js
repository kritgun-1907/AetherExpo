// src/screens/onboarding/WelcomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const BACKGROUND_IMAGE = require('../../../assets/hero-carbon-tracker.jpg');
const LOGO_IMAGE = require('../../../assets/logo-transparent.png');

export default function WelcomeScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground 
        source={BACKGROUND_IMAGE} 
        resizeMode="cover" 
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        >
          <View style={styles.content}>
            {/* Logo and App Name */}
            <View style={styles.logoContainer}>
              <Image source={LOGO_IMAGE} style={styles.logo} />
              <Text style={styles.appName}>Aether</Text>
              <Text style={styles.tagline}>Track • Reduce • Offset</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <View style={styles.feature}>
                <Text style={styles.featureEmoji}>🌍</Text>
                <Text style={styles.featureText}>Track Your Carbon Footprint</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureEmoji}>🏆</Text>
                <Text style={styles.featureText}>Earn Rewards & Achievements</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureEmoji}>🌱</Text>
                <Text style={styles.featureText}>Offset Your Impact</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.getStartedButton}
                onPress={() => navigation.navigate('Permissions')}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.signInText}>I already have an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 18,
    color: '#D1FAE5',
    letterSpacing: 3,
  },
  featuresContainer: {
    width: '100%',
    marginVertical: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  featureEmoji: {
    fontSize: 32,
    marginRight: 20,
  },
  featureText: {
    fontSize: 18,
    color: '#FFFFFF',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signInText: {
    color: '#D1FAE5',
    fontSize: 16,
    textAlign: 'center',
  },
});