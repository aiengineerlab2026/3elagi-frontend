package com.threelagi.mobile.incomingcall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.threelagi.mobile.MainActivity

class IncomingCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val sessionId = intent.getStringExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID) ?: return
    when (intent.action) {
      ACTION_DECLINE -> {
        IncomingCallController.stop(context, sessionId)
        val launch =
          Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID, sessionId)
            putExtra(IncomingCallNotificationHelper.EXTRA_INCOMING_CALL, true)
            putExtra("declineCall", true)
          }
        context.startActivity(launch)
      }
      ACTION_ACCEPT -> {
        IncomingCallController.stop(context, sessionId)
        val launch =
          Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            data = Uri.parse("threelagi://video-call?sessionId=$sessionId")
            putExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID, sessionId)
            putExtra(IncomingCallNotificationHelper.EXTRA_INCOMING_CALL, true)
            putExtra("acceptCall", true)
          }
        context.startActivity(launch)
      }
    }
  }

  companion object {
    const val ACTION_ACCEPT = "com.threelagi.mobile.incomingcall.ACCEPT"
    const val ACTION_DECLINE = "com.threelagi.mobile.incomingcall.DECLINE"

    fun acceptIntent(context: Context, call: IncomingCallPayload.Incoming): Intent {
      return Intent(context, IncomingCallActionReceiver::class.java).apply {
        action = ACTION_ACCEPT
        putExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID, call.sessionId)
      }
    }

    fun declineIntent(context: Context, call: IncomingCallPayload.Incoming): Intent {
      return Intent(context, IncomingCallActionReceiver::class.java).apply {
        action = ACTION_DECLINE
        putExtra(IncomingCallNotificationHelper.EXTRA_SESSION_ID, call.sessionId)
      }
    }
  }
}
