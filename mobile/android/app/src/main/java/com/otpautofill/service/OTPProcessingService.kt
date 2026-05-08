package com.otpautofill.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.otpautofill.R
import com.otpautofill.data.OTPRepository
import com.otpautofill.utils.EncryptionUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Service for processing detected OTPs and sending them to connected browsers
 */
@AndroidEntryPoint
class OTPProcessingService : Service() {

    @Inject
    lateinit var otpRepository: OTPRepository

    @Inject
    lateinit var encryptionUtils: EncryptionUtils

    @Inject
    lateinit var webSocketManager: WebSocketManager

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var notificationManager: NotificationManager

    companion object {
        const val EXTRA_OTP_CODE = "extra_otp_code"
        const val EXTRA_SENDER = "extra_sender"
        const val EXTRA_TIMESTAMP = "extra_timestamp"
        const val EXTRA_MESSAGE_BODY = "extra_message_body"
        
        private const val NOTIFICATION_CHANNEL_ID = "otp_processing_channel"
        private const val NOTIFICATION_ID = 1001
        private const val TAG = "OTPProcessingService"
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        
        Log.d(TAG, "OTP Processing Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val otpCode = intent?.getStringExtra(EXTRA_OTP_CODE)
        val sender = intent?.getStringExtra(EXTRA_SENDER)
        val timestamp = intent?.getLongExtra(EXTRA_TIMESTAMP, 0L) ?: 0L
        val messageBody = intent?.getStringExtra(EXTRA_MESSAGE_BODY) ?: ""

        if (!otpCode.isNullOrBlank()) {
            processOTP(otpCode, sender, timestamp, messageBody)
        }

        return START_NOT_STICKY
    }

    private fun processOTP(code: String, sender: String?, timestamp: Long, messageBody: String) {
        serviceScope.launch {
            try {
                Log.d(TAG, "Processing OTP: $code from $sender")

                // Save OTP to local database
                val otpId = otpRepository.saveOTP(
                    code = code,
                    sender = sender ?: "Unknown",
                    timestamp = timestamp,
                    messageBody = messageBody
                )

                // Encrypt OTP for transmission
                val encryptedOTP = encryptionUtils.encryptOTP(code)

                // Send to connected browsers via WebSocket
                val success = webSocketManager.broadcastOTP(
                    otpId = otpId,
                    encryptedCode = encryptedOTP,
                    sender = sender ?: "Unknown",
                    timestamp = timestamp
                )

                if (success) {
                    showNotification("OTP Sent", "OTP has been sent to your browser")
                    Log.d(TAG, "OTP successfully sent to browser")
                } else {
                    showNotification("OTP Failed", "Could not send OTP to browser")
                    Log.w(TAG, "Failed to send OTP to browser")
                }

                // Auto-delete OTP after 5 minutes
                otpRepository.scheduleOTPDeletion(otpId, 5 * 60 * 1000L)

            } catch (e: Exception) {
                Log.e(TAG, "Error processing OTP", e)
                showNotification("Error", "Failed to process OTP")
            }
        }
    }

    private fun showNotification(title: String, message: String) {
        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "OTP Processing",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for OTP processing and browser communication"
            }

            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "OTP Processing Service destroyed")
    }
}
