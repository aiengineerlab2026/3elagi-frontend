package com.threelagi.mobile

import com.google.firebase.messaging.RemoteMessage
import com.threelagi.mobile.incomingcall.IncomingCallHandler
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Intercepts incoming / cancelled video-call FCM messages for native ringing,
 * then delegates everything else to Expo Notifications.
 */
class ThreelagiFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    if (IncomingCallHandler.handleCancelled(this, remoteMessage)) {
      return
    }
    if (IncomingCallHandler.handleIncoming(this, remoteMessage)) {
      return
    }
    super.onMessageReceived(remoteMessage)
  }
}
