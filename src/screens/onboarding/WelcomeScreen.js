// src/screens/onboarding/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.emoji}>🌍</Text>
      <Text style={[styles.title, { color: theme.primaryText }]}>Welcome to Aether</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
        Track your carbon footprint and save the planet, one step at a time
      </Text>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.buttonBackground }]}
        onPress={() => navigation.navigate('Permissions')}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 100, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 50, paddingHorizontal: 20 },
  button: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 25 },
  buttonText: { fontSize: 18, fontWeight: 'bold' },
});