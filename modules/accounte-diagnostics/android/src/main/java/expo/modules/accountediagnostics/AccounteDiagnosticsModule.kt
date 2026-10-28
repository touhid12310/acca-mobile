package expo.modules.accountediagnostics

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Why Android ended AccountE's earlier runs (Android 11+): a crash, a freeze
 * (ANR), low memory, the user swiping it away, an update… The JS side
 * (src/services/appExitMonitor.ts) reads this on the next launch and sends the
 * ones worth knowing about to admin → App errors.
 */
class AccounteDiagnosticsModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("AccounteDiagnostics")

    // Exits after `sinceMillis` (epoch ms), newest first, at most `limit`.
    // Empty before Android 11.
    AsyncFunction("getExitReasons") { sinceMillis: Double, limit: Int ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        emptyList<Map<String, Any?>>()
      } else {
        readExits(sinceMillis.toLong(), limit.coerceIn(1, 20))
      }
    }

    // Firebase Test Lab, which also runs Google Play's pre-launch report:
    // Google's robots install every upload and crawl it. Their errors (and
    // their test network's 504s) are not real users'. Test Lab sets this
    // system setting on its devices for exactly this check.
    Function("isTestLab") {
      try {
        Settings.System.getString(context.contentResolver, "firebase.test.lab") == "true"
      } catch (error: Exception) {
        false
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun readExits(sinceMillis: Long, limit: Int): List<Map<String, Any?>> {
    val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return manager
      .getHistoricalProcessExitReasons(context.packageName, 0, limit)
      .filter { it.timestamp > sinceMillis }
      .map { info ->
        mapOf(
          "reason" to reasonName(info.reason),
          "timestamp" to info.timestamp.toDouble(),
          "importance" to info.importance,
          "status" to info.status,
          "description" to info.description,
          "pssKb" to info.pss.toDouble(),
          "rssKb" to info.rss.toDouble(),
          "lowMemoryReportSupported" to ActivityManager.isLowMemoryKillReportSupported(),
        )
      }
  }

  private fun reasonName(reason: Int): String = when (reason) {
    ApplicationExitInfo.REASON_ANR -> "anr"
    ApplicationExitInfo.REASON_CRASH -> "crash"
    ApplicationExitInfo.REASON_CRASH_NATIVE -> "crash_native"
    ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "dependency_died"
    ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "excessive_resource_usage"
    ApplicationExitInfo.REASON_EXIT_SELF -> "exit_self"
    ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "initialization_failure"
    ApplicationExitInfo.REASON_LOW_MEMORY -> "low_memory"
    ApplicationExitInfo.REASON_OTHER -> "other"
    ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "permission_change"
    ApplicationExitInfo.REASON_SIGNALED -> "signaled"
    ApplicationExitInfo.REASON_USER_REQUESTED -> "user_requested"
    ApplicationExitInfo.REASON_USER_STOPPED -> "user_stopped"
    else -> "code_$reason"
  }
}
