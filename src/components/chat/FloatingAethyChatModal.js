// src/components/chat/FloatingAethyChatModal.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const FloatingAethyChatModal = () => {
  const { theme, isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hi there! How can we help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  const scrollViewRef = useRef();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;
  
  // 🔥 NEW: Position state for draggable button
  const pan = useRef(new Animated.ValueXY({ 
    x: width - 80, // 20px from right edge
    y: height - 180 // Above the bottom nav (usually 60-80px height + spacing)
  })).current;
  
  const [isDragging, setIsDragging] = useState(false);

  // 🔥 NEW: PanResponder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        
        // Snap to edges with safe zones
        const BUTTON_SIZE = 60;
        const MARGIN = 20;
        const BOTTOM_NAV_HEIGHT = 80; // Height of bottom navigation
        const TOP_MARGIN = 60; // Status bar + some padding
        
        let finalX = pan.x._value;
        let finalY = pan.y._value;
        
        // Constrain to screen bounds
        const minX = MARGIN;
        const maxX = width - BUTTON_SIZE - MARGIN;
        const minY = TOP_MARGIN;
        const maxY = height - BUTTON_SIZE - BOTTOM_NAV_HEIGHT - MARGIN;
        
        // Snap to nearest edge (left or right)
        if (finalX < width / 2) {
          finalX = minX; // Snap to left
        } else {
          finalX = maxX; // Snap to right
        }
        
        // Ensure Y is within bounds
        finalY = Math.max(minY, Math.min(finalY, maxY));
        
        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
        
        // Only open chat if it wasn't dragged much (tap gesture)
        const dragDistance = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);
        if (dragDistance < 10) {
          setTimeout(() => openChat(), 100);
        }
        
        setTimeout(() => setIsDragging(false), 100);
      },
    })
  ).current;

  // Pulse animation for notification
  useEffect(() => {
    if (showNotification && !isOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(notificationPulse, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(notificationPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showNotification, isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  const openChat = () => {
    if (isDragging) return; // 🔥 Prevent opening while dragging
    setIsOpen(true);
    setShowNotification(false);
    Animated.spring(modalSlide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  };

  const closeChat = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      isBot: false,
      timestamp: new Date(),
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
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
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
      return "📊 To track your emissions:\n1. Go to the Track tab\n2. Select a category\n3. Enter activity details\n4. I'll calculate the carbon impact!\n\nReady to start?";
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
          message.isBot ? styles.botBubble : styles.userBubble,
        ]}
      >
        {message.isBot && (
          <View style={styles.botAvatar}>
            <Text style={styles.avatarText}>🌿</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            message.isBot
              ? { backgroundColor: isDarkMode ? '#1E3A8A' : '#E0F2FE' }
              : { backgroundColor: '#10B981' },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.isBot
                ? { color: isDarkMode ? '#FFFFFF' : '#1E3A8A' }
                : { color: '#FFFFFF' },
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* 🔥 UPDATED: Draggable Floating Button */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: buttonScale }
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {showNotification && (
            <Animated.View
              style={[
                styles.notificationBadge,
                { transform: [{ scale: notificationPulse }] },
              ]}
            >
              <Text style={styles.notificationText}>1</Text>
            </Animated.View>
          )}
          
          <TouchableOpacity
            style={styles.chatButton}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <Icon name="chat" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {/* 🔥 NEW: Drag indicator dots */}
          <View style={styles.dragIndicator}>
            <View style={styles.dragDot} />
            <View style={styles.dragDot} />
            <View style={styles.dragDot} />
          </View>
        </Animated.View>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={closeChat}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: modalSlide }] },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={closeChat}
              >
                <Icon name="chevron-left" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🌿</Text>
              </View>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Aethy Team</Text>
                <Text style={styles.headerSubtitle}>Always here to help</Text>
              </View>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeChat}
              >
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={[styles.messagesContainer, { backgroundColor: theme.background }]}>
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map(renderMessage)}

                {isTyping && (
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <View style={styles.botAvatar}>
                      <Text style={styles.avatarText}>🌿</Text>
                    </View>
                    <View
                      style={[
                        styles.messageContent,
                        { backgroundColor: isDarkMode ? '#1E3A8A' : '#E0F2FE' },
                      ]}
                    >
                      <Text style={styles.typingIndicator}>●●●</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Input Area */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.card,
                  borderTopColor: isDarkMode ? '#374151' : '#E5E7EB',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                    color: theme.text,
                  },
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
                  inputText.trim() === '' && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={inputText.trim() === ''}
              >
                <Icon name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // 🔥 UPDATED: Floating Button Styles
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 9999,
  },
  chatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  // 🔥 NEW: Drag indicator styles
  dragIndicator: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  dragDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatContainer: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    marginRight: 8,
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
  closeButton: {
    padding: 4,
  },

  // Messages Styles
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

  // Input Styles
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

export default FloatingAethyChatModal;