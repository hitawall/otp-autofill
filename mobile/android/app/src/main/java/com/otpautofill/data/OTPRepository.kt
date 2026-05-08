package com.otpautofill.data

import android.content.Context
import java.util.UUID

class OTPRepository(private val context: Context) {
    fun saveOTP(
        code: String,
        sender: String,
        timestamp: Long,
        messageBody: String
    ): String {
        return UUID.randomUUID().toString()
    }

    fun scheduleOTPDeletion(otpId: String, delayMs: Long) {
        // Placeholder for local-only prototype; can be replaced with WorkManager.
    }
}
