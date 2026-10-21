package com.threelagi.mobile.incomingcall

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap

class IncomingCallModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "IncomingCallModule"

  @ReactMethod
  fun startRinging(payload: ReadableMap, promise: Promise) {
    try {
      val sessionId = payload.getString("sessionId") ?: payload.getString("session_id")
      if (sessionId.isNullOrBlank()) {
        promise.resolve(false)
        return
      }
      val call =
        IncomingCallPayload.Incoming(
          sessionId = sessionId,
          callerId = payload.getString("callerId") ?: payload.getString("caller_id"),
          callerName = payload.getString("callerName") ?: payload.getString("caller_name"),
          title = payload.getString("title") ?: "Incoming video call",
          body = payload.getString("body") ?: "Incoming call",
        )
      if (!IncomingCallController.shouldStart(reactApplicationContext, call.sessionId)) {
        promise.resolve(false)
        return
      }
      IncomingCallRingingService.start(reactApplicationContext.applicationContext, call)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("incoming_call_start_failed", error)
    }
  }

  @ReactMethod
  fun stopRinging(sessionId: String?, promise: Promise) {
    try {
      IncomingCallController.stop(
        reactApplicationContext.applicationContext,
        sessionId?.takeIf { it.isNotBlank() },
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("incoming_call_stop_failed", error)
    }
  }

  /** Reads MainActivity launch extras from notification accept/decline/full-screen. */
  @ReactMethod
  fun consumeLaunchIntent(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
      val intent = activity?.intent
      if (intent == null || !intent.getBooleanExtra(IncomingCallNotificationHelper.EXTRA_INCOMING_CALL, false)) {
        promise.resolve(null)
        return
      }

      val sessionId = intent.getStringExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID)
      if (sessionId.isNullOrBlank()) {
        promise.resolve(null)
        return
      }

      val payload: WritableMap =
        Arguments.createMap().apply {
          putString("sessionId", sessionId)
          putString("callerId", intent.getStringExtra(IncomingCallNotificationHelper.EXTRA_CALLER_ID))
          putString("callerName", intent.getStringExtra(IncomingCallNotificationHelper.EXTRA_CALLER_NAME))
          putBoolean("acceptCall", intent.getBooleanExtra("acceptCall", false))
          putBoolean("declineCall", intent.getBooleanExtra("declineCall", false))
        }

      intent.removeExtra(IncomingCallNotificationHelper.EXTRA_INCOMING_CALL)
      intent.removeExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID)
      intent.removeExtra(IncomingCallNotificationHelper.EXTRA_CALLER_ID)
      intent.removeExtra(IncomingCallNotificationHelper.EXTRA_CALLER_NAME)
      intent.removeExtra("acceptCall")
      intent.removeExtra("declineCall")

      promise.resolve(payload)
    } catch (error: Exception) {
      promise.reject("incoming_call_launch_failed", error)
    }
  }
}
