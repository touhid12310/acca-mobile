package expo.modules.accountesms

import android.Manifest
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Read-only access to the SMS inbox for AccountE's bank / wallet import.
 *
 * Nothing is filtered here — the JS layer decides which messages look like
 * transaction alerts and uploads only those. There is no receiver and no
 * send capability; the app just reads the inbox when it is opened.
 */
class AccounteSmsModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private fun hasReadPermission(): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) ==
      PackageManager.PERMISSION_GRANTED

  override fun definition() = ModuleDefinition {
    Name("AccounteSms")

    Function("hasPermission") {
      hasReadPermission()
    }

    // Inbox messages received after `sinceMillis` (epoch ms), newest first,
    // at most `limit` of them.
    AsyncFunction("readInbox") { sinceMillis: Double, limit: Int ->
      if (!hasReadPermission()) {
        throw CodedException("ERR_SMS_PERMISSION", "READ_SMS permission has not been granted", null)
      }

      val projection = arrayOf(
        Telephony.Sms._ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE,
      )
      val cap = limit.coerceIn(1, 2000)
      val messages = mutableListOf<Map<String, Any?>>()

      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMillis.toLong().toString()),
        "${Telephony.Sms.DATE} DESC",
      )?.use { cursor ->
        val idIndex = cursor.getColumnIndexOrThrow(Telephony.Sms._ID)
        val addressIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)

        while (cursor.moveToNext() && messages.size < cap) {
          messages.add(
            mapOf(
              "id" to cursor.getLong(idIndex).toString(),
              "address" to (cursor.getString(addressIndex) ?: ""),
              "body" to (cursor.getString(bodyIndex) ?: ""),
              "date" to cursor.getLong(dateIndex).toDouble(),
            )
          )
        }
      }

      messages
    }
  }
}
