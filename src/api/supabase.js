// Add to your components
useEffect(() => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Subscribe to profile updates
  const profileSub = subscribeToUserUpdates(user.id, (payload) => {
    console.log('Profile updated:', payload);
    // Update UI
  });

  // Subscribe to new notifications
  const notificationSub = subscribeToNotifications(user.id, (payload) => {
    console.log('New notification:', payload);
    // Show notification
  });

  return () => {
    profileSub.unsubscribe();
    notificationSub.unsubscribe();
  };
}, []);