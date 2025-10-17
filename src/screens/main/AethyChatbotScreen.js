// src/screens/main/AethyChatbotScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AethyChatbotScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hi there! How can we help you today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateBotResponse(inputText);
      const botMessage = {
        id: messages.length + 2,
        text: botResponse,
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('carbon') || input.includes('emission')) {
      return "🌍 I can help you track your carbon emissions! You can log activities from transport, food, energy, and shopping. Would you like to log an activity now?";
    } else if (input.includes('offset')) {
      return "🌳 You can purchase carbon offsets to neutralize your footprint. We partner with verified providers like Gold Standard and Verra. Shall I show you available options?";
    } else if (input.includes('challenge')) {
      return "🎯 Join our community challenges to reduce emissions together! Active challenges include 'Car-Free Week' and 'Plant-Based Month'. Want to participate?";
    } else if (input.includes('leaderboard') || input.includes('friends')) {
      return "🏆 Check out the Leaderboard to see how you compare with friends! Compete for the lowest carbon footprint and earn badges.";
    } else if (input.includes('help') || input.includes('support')) {
      return "💚 I'm here to help! You can ask me about:\n• Tracking emissions\n• Carbon offsets\n• Challenges & rewards\n• Leaderboards\n• Account settings\n\nWhat would you like to know?";
    } else if (input.includes('goal') || input.includes('target')) {
      return "🎯 Your current daily goal is to stay under your carbon target. You can adjust goals in Settings. Want me to help you set a new goal?";
    } else if (input.includes('reward') || input.includes('points')) {
      return "🎁 Earn eco-points by reducing emissions and completing challenges! Redeem points for gift vouchers from eco-friendly brands.";
    } else if (input.includes('track') || input.includes('log')) {
      return "📊 To track your emissions:\n1. Go to the Track tab\n2. Select a category (Transport, Food, Energy, Shopping)\n3. Enter your activity details\n4. I'll calculate the carbon impact!\n\nWould you like to start tracking now?";
    } else if (input.includes('premium') || input.includes('subscription')) {
      return "⭐ Premium features include:\n• Unlimited bank connections\n• Advanced analytics\n• Real-time tracking\n• Priority support\n• Custom offset portfolios\n\nWant to upgrade?";
    } else {
      return "Thanks for reaching out! I can help you with carbon tracking, offsets, challenges, and more. What would you like to know?";
    }
  };

  const renderMessage = (message) => {
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          message.isBot ? styles.botBubble : styles.userBubble
        ]}
      >
        {message.isBot && (
          <View style={styles.botAvatar}>
            <Text style={styles.avatarText}>🌿</Text>
          </View>
        )}
        <View style={[
          styles.messageContent,
          message.isBot 
            ? { backgroundColor: isDarkMode ? '#1E3A8A' : '#E0F2FE' }
            : { backgroundColor: '#10B981' }
        ]}>
          <Text style={[
            styles.messageText,
            message.isBot 
              ? { color: isDarkMode ? '#FFFFFF' : '#1E3A8A' }
              : { color: '#FFFFFF' }
          ]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  const QuickActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.quickAction,
        { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }
      ]}
      onPress={onPress}
    >
      <Icon name={icon} size={20} color={theme.primary} />
      <Text style={[styles.quickActionText, { color: theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>🌿</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Aethy Team</Text>
              <Text style={styles.headerSubtitle}>Always here to help</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: theme.background }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContent}
          >
            <QuickActionButton 
              icon="chart-line" 
              label="Track Activity" 
              onPress={() => setInputText("How do I track my carbon?")}
            />
            <QuickActionButton 
              icon="tree" 
              label="Carbon Offsets" 
              onPress={() => setInputText("Tell me about carbon offsets")}
            />
            <QuickActionButton 
              icon="trophy" 
              label="Challenges" 
              onPress={() => setInputText("What challenges are available?")}
            />
            <QuickActionButton 
              icon="help-circle" 
              label="Help" 
              onPress={() => setInputText("I need help")}
            />
          </ScrollView>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {isTyping && (
            <View style={[styles.messageBubble, styles.botBubble]}>
              <View style={styles.botAvatar}>
                <Text style={styles.avatarText}>🌿</Text>
              </View>
              <View style={[
                styles.messageContent,
                { backgroundColor: isDarkMode ? '#1E3A8A' : '#E0F2FE' }
              ]}>
                <Text style={styles.typingIndicator}>●●●</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          { 
            backgroundColor: theme.card,
            borderTopColor: isDarkMode ? '#374151' : '#E5E7EB'
          }
        ]}>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                color: theme.text
              }
            ]}
            placeholder="Ask me anything..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              inputText.trim() === '' && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={inputText.trim() === ''}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  quickActions: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionsContent: {
    paddingHorizontal: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 10,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  botBubble: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 16,
  },
  messageContent: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  typingIndicator: {
    fontSize: 18,
    color: '#6B7280',
    letterSpacing: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default AethyChatbotScreen;