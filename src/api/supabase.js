useEffect(() => {
  let mounted = true;
  
  const setupSubscriptions = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth error:', error);
        return;
      }
      
      if (!user || !mounted) {
        return;
      }

      // Subscribe to profile updates
      const profileSub = subscribeToUserUpdates(user.id, (payload) => {
        if (mounted) {
          console.log('Profile updated:', payload);
          // Update UI
        }
      });

      // Subscribe to new notifications
      const notificationSub = subscribeToNotifications(user.id, (payload) => {
        if (mounted) {
          console.log('New notification:', payload);
          // Show notification
        }
      });

      // Store subscriptions for cleanup
      return { profileSub, notificationSub };
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }
  };

  let subscriptions = null;
  
  setupSubscriptions().then(subs => {
    subscriptions = subs;
  });

  return () => {
    mounted = false;
    if (subscriptions) {
      subscriptions.profileSub?.unsubscribe();
      subscriptions.notificationSub?.unsubscribe();
    }
  };
}, []);