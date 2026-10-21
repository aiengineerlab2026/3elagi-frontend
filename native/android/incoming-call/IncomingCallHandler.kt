package com.threelagi.mobile.incomingcall

import android.content.Context
import com.google.firebase.messaging.RemoteMessage

object IncomingCallHandler {
  fun handleIncoming(context: Context, message: RemoteMessage): Boolean {
    val call = IncomingCallPayload.parseIncoming(message) ?: return false
    if (!IncomingCallController.shouldStart(context, call.sessionId)) return true
    IncomingCallRingingService.start(context.applicationContext, call)
    return true
  }

  fun handleIncomingData(context: Context, data: Map<String, String>): Boolean {
    val call = IncomingCallPayload.parseIncomingMap(data) ?: return false
    if (!IncomingCallController.shouldStart(context, call.sessionId)) return true
    IncomingCallRingingService.start(context.applicationContext, call)
    return true
  }

  fun handleCancelled(context: Context, message: RemoteMessage): Boolean {
    val sessionId = IncomingCallPayload.parseCancelled(message) ?: return false
    IncomingCallController.stop(context.applicationContext, sessionId)
    return true
  }

  fun handleCancelledData(context: Context, data: Map<String, String>): Boolean {
    val sessionId = IncomingCallPayload.parseCancelledMap(data) ?: return false
    IncomingCallController.stop(context.applicationContext, sessionId)
    return true
  }
}
