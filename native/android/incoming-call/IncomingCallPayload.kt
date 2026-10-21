package com.threelagi.mobile.incomingcall

import com.google.firebase.messaging.RemoteMessage

/** Normalizes Expo / FCM data payloads for video-call pushes. */
object IncomingCallPayload {
  data class Incoming(
    val sessionId: String,
    val callerId: String?,
    val callerName: String?,
    val title: String,
    val body: String,
  )

  fun parseIncoming(message: RemoteMessage): Incoming? {
    return parseIncomingMap(message.data)
  }

  fun parseIncomingMap(data: Map<String, String>): Incoming? {
    val flat = flatten(data)
    if (flat["type"] != "incoming_video_call") return null
    val sessionId = flat["sessionId"] ?: flat["session_id"] ?: return null
    val callerName = flat["callerName"] ?: flat["caller_name"]
    val title = flat["title"] ?: "Incoming video call"
    val body = flat["body"] ?: "${callerName ?: "Patient"} is calling"
    return Incoming(
      sessionId = sessionId,
      callerId = flat["callerId"] ?: flat["caller_id"],
      callerName = callerName,
      title = title,
      body = body,
    )
  }

  fun parseCancelled(message: RemoteMessage): String? {
    return parseCancelledMap(message.data)
  }

  fun parseCancelledMap(data: Map<String, String>): String? {
    val flat = flatten(data)
    if (flat["type"] != "video_call_cancelled") return null
    return flat["sessionId"] ?: flat["session_id"]
  }

  private fun flatten(data: Map<String, String>): Map<String, String> {
    val out = mutableMapOf<String, String>()
    data.forEach { (key, value) ->
      out[key] = value
      if (key == "body" && value.startsWith("{")) {
        try {
          val json = org.json.JSONObject(value)
          json.keys().forEach { nestedKey ->
            out[nestedKey] = json.optString(nestedKey)
          }
        } catch (_: Exception) {
          // ignore malformed nested JSON
        }
      }
    }
    return out
  }
}
