package com.threelagi.mobile.incomingcall

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.threelagi.mobile.MainActivity
import com.threelagi.mobile.R

object IncomingCallNotificationHelper {
  const val CHANNEL_ID = "video-calls-ring"
  const val NOTIFICATION_ID = 0x3e1a61

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) return
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Video calls",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Incoming video calls"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 500)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
        setSound(null, null)
      }
    manager.createNotificationChannel(channel)
  }

  fun build(context: Context, call: IncomingCallPayload.Incoming): Notification {
    ensureChannel(context)
    val fullScreenIntent =
      PendingIntent.getActivity(
        context,
        call.sessionId.hashCode(),
        launchIntent(context, call.sessionId, call.callerId, call.callerName),
        pendingIntentFlags(),
      )
    val acceptIntent =
      PendingIntent.getBroadcast(
        context,
        ("accept-${call.sessionId}").hashCode(),
        IncomingCallActionReceiver.acceptIntent(context, call),
        pendingIntentFlags(),
      )
    val declineIntent =
      PendingIntent.getBroadcast(
        context,
        ("decline-${call.sessionId}").hashCode(),
        IncomingCallActionReceiver.declineIntent(context, call),
        pendingIntentFlags(),
      )

    val callerLabel = call.callerName?.trim().takeUnless { it.isNullOrEmpty() } ?: "Patient"
    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(call.title)
        .setContentText(call.body)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setSilent(true)
        .setOngoing(true)
        .setAutoCancel(false)
        .setColor(Color.parseColor("#3057F2"))
        .setFullScreenIntent(fullScreenIntent, true)
        .setContentIntent(fullScreenIntent)
        .addAction(
          NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_close_clear_cancel,
            "Decline",
            declineIntent,
          ).build(),
        )
        .addAction(
          NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_call,
            "Accept",
            acceptIntent,
          ).build(),
        )

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val caller =
        Person.Builder()
          .setName(callerLabel)
          .setImportant(true)
          .build()
      builder.setStyle(
        NotificationCompat.CallStyle.forIncomingCall(
          caller,
          declineIntent,
          acceptIntent,
        ),
      )
    }

    return builder.build()
  }

  fun dismiss(context: Context, sessionId: String?) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (sessionId == null) {
      manager.cancel(NOTIFICATION_ID)
      return
    }
    manager.cancel(NOTIFICATION_ID)
    manager.cancel(sessionId.hashCode())
  }

  private fun launchIntent(
    context: Context,
    sessionId: String,
    callerId: String?,
    callerName: String?,
  ): Intent {
    return Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra(EXTRA_SESSION_ID, sessionId)
      putExtra(EXTRA_CALLER_ID, callerId)
      putExtra(EXTRA_CALLER_NAME, callerName)
      putExtra(EXTRA_INCOMING_CALL, true)
    }
  }

  private fun pendingIntentFlags(): Int {
    val base = PendingIntent.FLAG_UPDATE_CURRENT
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      base or PendingIntent.FLAG_IMMUTABLE
    } else {
      base
    }
  }

  const val EXTRA_SESSION_ID = "sessionId"
  const val EXTRA_CALLER_ID = "callerId"
  const val EXTRA_CALLER_NAME = "callerName"
  const val EXTRA_INCOMING_CALL = "incomingCall"
}
