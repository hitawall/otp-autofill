package com.otpautofill.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage
import android.util.Log
import com.otpautofill.service.OTPProcessingService
import com.otpautofill.utils.OTPParser
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * BroadcastReceiver for intercepting incoming SMS messages and detecting OTPs
 */
@AndroidEntryPoint
class SmsReceiver : BroadcastReceiver() {

    @Inject
    lateinit var otpParser: OTPParser

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            messages.forEach { smsMessage ->
                val messageBody = smsMessage.messageBody
                val sender = smsMessage.originatingAddress
                val timestamp = smsMessage.timestampMillis
                
                Log.d(TAG, "Received SMS from $sender: ${messageBody.take(50)}...")
                
                // Parse OTP from message
                val otp = otpParser.parseOTP(messageBody, sender)
                
                if (otp != null) {
                    Log.d(TAG, "OTP detected: ${otp.code} from $sender")
                    
                    // Start OTP processing service
                    val serviceIntent = Intent(context, OTPProcessingService::class.java).apply {
                        putExtra(OTPProcessingService.EXTRA_OTP_CODE, otp.code)
                        putExtra(OTPProcessingService.EXTRA_SENDER, sender)
                        putExtra(OTPProcessingService.EXTRA_TIMESTAMP, timestamp)
                        putExtra(OTPProcessingService.EXTRA_MESSAGE_BODY, messageBody)
                    }
                    
                    context.startService(serviceIntent)
                }
            }
        }
    }

    companion object {
        private const val TAG = "SmsReceiver"
    }
}
