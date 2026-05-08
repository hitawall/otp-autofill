package com.otpautofill.utils

import android.util.Log
import java.util.regex.Pattern
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Utility class for parsing OTP codes from SMS messages
 */
@Singleton
class OTPParser @Inject constructor() {

    data class ParsedOTP(
        val code: String,
        val sender: String,
        val timestamp: Long,
        val messageBody: String,
        val confidence: Float
    )

    // Common OTP patterns
    private val otpPatterns = listOf(
        // 6-digit OTPs
        Pattern.compile("\\b(\\d{6})\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:code|otp|verification|pin|auth)[\\s:]*([0-9]{6})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("([0-9]{6})(?:\\s+is\\s+your)", Pattern.CASE_INSENSITIVE),
        
        // 4-digit OTPs
        Pattern.compile("\\b(\\d{4})\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:code|otp|verification|pin|auth)[\\s:]*([0-9]{4})", Pattern.CASE_INSENSITIVE),
        
        // 8-digit OTPs
        Pattern.compile("\\b(\\d{8})\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:code|otp|verification|pin|auth)[\\s:]*([0-9]{8})", Pattern.CASE_INSENSITIVE),
        
        // Generic pattern with context
        Pattern.compile("(?:your|the)(?:\\s+)?(?:one-time|one time|verification|security|access)(?:\\s+)?(?:code|pin|otp|password|passcode)(?:\\s+is)?[:\\s]*([0-9]{4,8})", Pattern.CASE_INSENSITIVE),
        
        // Bank-specific patterns
        Pattern.compile("(?:sbi|hdfc|icici|axis|kotak|pnb)(?:\\s+bank)?(?:\\s+)?(?:otp|code|verification)[\\s:]*([0-9]{4,8})", Pattern.CASE_INSENSITIVE)
    )

    // Known OTP senders (banks, services, etc.)
    private val knownOTPSenders = setOf(
        // Banks
        "SBI", "HDFC", "ICICI", "AXIS", "KOTAK", "PNB", "BOI", "BOB", "CANARA", "UNION",
        "SBIBANK", "HDFCBK", "ICICIBANK", "AXISBANK", "KOTAKBANK",
        
        // Digital services
        "GOOGLE", "APPLE", "AMAZON", "FACEBOOK", "WHATSAPP", "TWITTER", "INSTAGRAM",
        "LINKEDIN", "MICROSOFT", "NETFLIX", "SPOTIFY", "UBER", "OLA",
        
        // Payment services
        "PAYTM", "PHONEPE", "GPAY", "UPI", "BHIM", "MOBIKWIK", "FREECHARGE",
        
        // Common OTP service providers
        "MSG91", "TEXTLOCAL", "TWILIO", "PLIVO", "SINCH", "CLICKATELL",
        
        // Generic patterns
        "VM", "VERIFY", "OTP", "VERIFY", "AUTH"
    )

    /**
     * Parse OTP from SMS message
     */
    fun parseOTP(messageBody: String, sender: String?): ParsedOTP? {
        if (messageBody.isBlank()) return null

        Log.d(TAG, "Parsing OTP from sender: $sender")

        // Check if sender is known OTP sender
        val isKnownSender = sender?.let { knownOTPSenders.contains(it.uppercase()) } ?: false
        
        // Try each pattern
        for (pattern in otpPatterns) {
            val matcher = pattern.matcher(messageBody)
            if (matcher.find()) {
                val code = matcher.group(1) ?: continue
                
                // Validate code
                if (isValidOTPCode(code)) {
                    val confidence = calculateConfidence(code, messageBody, sender, isKnownSender)
                    
                    Log.d(TAG, "Found OTP: $code with confidence: $confidence")
                    
                    return ParsedOTP(
                        code = code,
                        sender = sender ?: "Unknown",
                        timestamp = System.currentTimeMillis(),
                        messageBody = messageBody,
                        confidence = confidence
                    )
                }
            }
        }

        Log.d(TAG, "No OTP found in message")
        return null
    }

    /**
     * Validate if the extracted code is a valid OTP
     */
    private fun isValidOTPCode(code: String): Boolean {
        // OTP should be 4-8 digits
        if (code.length !in 4..8) return false
        
        // Should be all digits
        if (!code.all { it.isDigit() }) return false
        
        // Should not be all same digits (like 111111)
        if (code.all { it == code.first() }) return false
        
        // Should not be sequential (like 123456)
        if (isSequential(code)) return false
        
        return true
    }

    /**
     * Check if digits are sequential
     */
    private fun isSequential(code: String): Boolean {
        for (i in 1 until code.length) {
            if (code[i].digitToInt() - code[i-1].digitToInt() != 1) {
                return false
            }
        }
        return true
    }

    /**
     * Calculate confidence score for OTP detection
     */
    private fun calculateConfidence(
        code: String,
        messageBody: String,
        sender: String?,
        isKnownSender: Boolean
    ): Float {
        var confidence = 0.5f // Base confidence

        // Boost for known senders
        if (isKnownSender) {
            confidence += 0.3f
        }

        // Boost for OTP-related keywords
        val keywords = listOf("otp", "code", "verification", "verify", "pin", "auth", "secure", "login")
        val keywordCount = keywords.count { keyword ->
            messageBody.contains(keyword, ignoreCase = true)
        }
        confidence += (keywordCount * 0.1f).coerceAtMost(0.3f)

        // Boost for common OTP patterns in message
        if (messageBody.contains("is your", ignoreCase = true) ||
            messageBody.contains("enter", ignoreCase = true) ||
            messageBody.contains("valid for", ignoreCase = true)) {
            confidence += 0.1f
        }

        // Adjust based on code length (6-digit is most common)
        when (code.length) {
            6 -> confidence += 0.1f
            4, 8 -> confidence += 0.05f
        }

        return confidence.coerceIn(0f, 1f)
    }

    companion object {
        private const val TAG = "OTPParser"
    }
}
