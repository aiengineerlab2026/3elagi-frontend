package com.threelagi.mobile.incomingcall

import android.content.Context

/** Tracks the active ringing call and prevents duplicate ring sessions. */
object IncomingCallController {
  @Volatile
  private var activeCallId: String? = null

  fun shouldStart(context: Context, callId: String): Boolean {
    synchronized(this) {
      if (activeCallId == callId) return false
      val previous = activeCallId
      activeCallId = callId
      if (previous != null) {
        IncomingCallRingingService.stop(context.applicationContext, previous)
        IncomingCallNotificationHelper.dismiss(context.applicationContext, previous)
      }
      return true
    }
  }

  fun activeCallId(): String? = activeCallId

  fun stop(context: Context, callId: String? = null) {
    synchronized(this) {
      if (callId != null && activeCallId != null && activeCallId != callId) return
      activeCallId = null
    }
    IncomingCallRingingService.stop(context.applicationContext, callId)
    IncomingCallNotificationHelper.dismiss(context.applicationContext, callId)
  }
}
