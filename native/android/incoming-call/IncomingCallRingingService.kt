package com.threelagi.mobile.incomingcall

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import com.threelagi.mobile.R

/**
 * Foreground service that loops [R.raw.incoming_call] until the call ends.
 * Required so ringing continues when the app is backgrounded or killed.
 */
class IncomingCallRingingService : Service() {
  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var sessionId: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopSelfSafely()
        return START_NOT_STICKY
      }
      else -> {
        val call = IncomingCallPayload.parseIncomingMap(
          intent?.extras?.let { bundle ->
            bundle.keySet().associateWith { key -> bundle.getString(key) ?: "" }
          } ?: emptyMap(),
        ) ?: intent?.let {
          IncomingCallPayload.Incoming(
            sessionId = it.getStringExtra(EXTRA_SESSION_ID) ?: return START_NOT_STICKY,
            callerId = it.getStringExtra(EXTRA_CALLER_ID),
            callerName = it.getStringExtra(EXTRA_CALLER_NAME),
            title = it.getStringExtra(EXTRA_TITLE) ?: "Incoming video call",
            body = it.getStringExtra(EXTRA_BODY) ?: "Incoming call",
          )
        } ?: return START_NOT_STICKY

        if (!IncomingCallController.shouldStart(this, call.sessionId)) {
          stopSelf()
          return START_NOT_STICKY
        }

        sessionId = call.sessionId
        acquireWakeLock()
        startForeground(
          IncomingCallNotificationHelper.NOTIFICATION_ID,
          IncomingCallNotificationHelper.build(this, call),
        )
        startRingtone()
        startVibration()
        return START_STICKY
      }
    }
  }

  override fun onDestroy() {
    releaseRingtone()
    releaseWakeLock()
    stopVibration()
    super.onDestroy()
  }

  private fun startRingtone() {
    releaseRingtone()
    mediaPlayer =
      MediaPlayer.create(this, R.raw.incoming_call)?.apply {
        isLooping = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
        }
        setVolume(1f, 1f)
        start()
      }
  }

  private fun releaseRingtone() {
    mediaPlayer?.run {
      try {
        if (isPlaying) stop()
      } catch (_: Exception) {
      }
      release()
    }
    mediaPlayer = null
  }

  private fun startVibration() {
    val vibrator = getSystemService(Vibrator::class.java) ?: return
    val pattern = longArrayOf(0, 700, 400, 700, 1400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(pattern, 0)
    }
  }

  private fun stopVibration() {
    val vibrator = getSystemService(Vibrator::class.java) ?: return
    vibrator.cancel()
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    wakeLock =
      pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "3elagi:IncomingCallRing").apply {
        setReferenceCounted(false)
        acquire(5 * 60_000L)
      }
  }

  private fun releaseWakeLock() {
    wakeLock?.let {
      if (it.isHeld) it.release()
    }
    wakeLock = null
  }

  private fun stopSelfSafely() {
    releaseRingtone()
    releaseWakeLock()
    stopVibration()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  companion object {
    const val ACTION_STOP = "com.threelagi.mobile.incomingcall.STOP"
    const val EXTRA_SESSION_ID = "sessionId"
    const val EXTRA_CALLER_ID = "callerId"
    const val EXTRA_CALLER_NAME = "callerName"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"

    fun start(context: Context, call: IncomingCallPayload.Incoming) {
      val intent =
        Intent(context, IncomingCallRingingService::class.java).apply {
          putExtra(EXTRA_SESSION_ID, call.sessionId)
          putExtra(EXTRA_CALLER_ID, call.callerId)
          putExtra(EXTRA_CALLER_NAME, call.callerName)
          putExtra(EXTRA_TITLE, call.title)
          putExtra(EXTRA_BODY, call.body)
        }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context, sessionId: String?) {
      IncomingCallNotificationHelper.dismiss(context, sessionId)
      val intent =
        Intent(context, IncomingCallRingingService::class.java).apply {
          action = ACTION_STOP
        }
      context.startService(intent)
    }
  }
}
