package com.otpautofill

import com.otpautofill.utils.OTPParser
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for OTPParser
 */
class OTPParserTest {

    private lateinit var otpParser: OTPParser

    @Before
    fun setUp() {
        otpParser = OTPParser()
    }

    @Test
    fun `should parse 6-digit OTP from bank message`() {
        val message = "Your SBI OTP is 123456 for transaction. Valid for 10 minutes."
        val sender = "SBI"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("123456", result?.code)
        assertEquals("SBI", result?.sender)
        assertTrue(result?.confidence ?: 0f > 0.7f)
    }

    @Test
    fun `should parse 4-digit OTP from verification message`() {
        val message = "Enter 7890 to verify your account"
        val sender = "VERIFY"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("7890", result?.code)
        assertEquals("VERIFY", result?.sender)
    }

    @Test
    fun `should parse 8-digit OTP from service message`() {
        val message = "Your verification code is 12345678"
        val sender = "AMAZON"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("12345678", result?.code)
        assertEquals("AMAZON", result?.sender)
    }

    @Test
    fun `should not parse OTP from non-OTP message`() {
        val message = "Your package has been delivered. Thank you for shopping with us."
        val sender = "SHOPPING"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNull(result)
    }

    @Test
    fun `should not parse sequential digits as OTP`() {
        val message = "Your code is 123456"
        val sender = "TEST"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNull(result)
    }

    @Test
    fun `should not parse same digits as OTP`() {
        val message = "Your code is 111111"
        val sender = "TEST"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNull(result)
    }

    @Test
    fun `should parse OTP with mixed case keywords`() {
        val message = "YOUR VERIFICATION CODE is 456789"
        val sender = "Service"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("456789", result?.code)
    }

    @Test
    fun `should parse OTP with special characters`() {
        val message = "Your OTP: 654321! Valid for 5 mins."
        val sender = "BANK"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("654321", result?.code)
    }

    @Test
    fun `should give higher confidence to known senders`() {
        val message = "Code: 123456"
        val knownSender = "HDFC"
        val unknownSender = "UNKNOWN"
        
        val knownResult = otpParser.parseOTP(message, knownSender)
        val unknownResult = otpParser.parseOTP(message, unknownSender)
        
        assertNotNull(knownResult)
        assertNotNull(unknownResult)
        assertTrue(
            (knownResult?.confidence ?: 0f) > (unknownResult?.confidence ?: 0f)
        )
    }

    @Test
    fun `should handle empty message`() {
        val result = otpParser.parseOTP("", "SENDER")
        
        assertNull(result)
    }

    @Test
    fun `should handle null sender`() {
        val message = "Your OTP is 123456"
        
        val result = otpParser.parseOTP(message, null)
        
        assertNotNull(result)
        assertEquals("123456", result?.code)
        assertEquals("Unknown", result?.sender)
    }

    @Test
    fun `should parse OTP with multiple numbers - choose most likely`() {
        val message = "Call 1234567890 for support. Your OTP is 456789."
        val sender = "SERVICE"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("456789", result?.code)
    }

    @Test
    fun `should parse OTP with time validity`() {
        val message = "Your OTP 987654 is valid for 10 minutes"
        val sender = "BANK"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("987654", result?.code)
    }

    @Test
    fun `should parse OTP with enter instruction`() {
        val message = "Please enter 345678 to complete your transaction"
        val sender = "PAYMENT"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("345678", result?.code)
    }

    @Test
    fun `should handle OTP in middle of message`() {
        val message = "Dear customer, your transaction for Rs.1000 requires OTP 567890. Please use this to complete."
        val sender = "BANK"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("567890", result?.code)
    }

    @Test
    fun `should not parse partial numbers`() {
        val message = "Your order #12345 has been shipped"
        val sender = "SHOPPING"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNull(result)
    }

    @Test
    fun `should parse OTP with international format`() {
        val message = "Your verification code is 246810"
        val sender = "+1234567890"
        
        val result = otpParser.parseOTP(message, sender)
        
        assertNotNull(result)
        assertEquals("246810", result?.code)
    }

    @Test
    fun `should handle confidence calculation correctly`() {
        val messages = listOf(
            "Your OTP is 123456" to "SBI",
            "Code: 123456" to "UNKNOWN",
            "123456" to "UNKNOWN",
            "Enter 123456 to verify" to "GOOGLE"
        )
        
        val results = messages.map { (msg, sender) ->
            otpParser.parseOTP(msg, sender)
        }.filterNotNull()
        
        // Should have at least 3 valid results
        assertTrue(results.size >= 3)
        
        // All should have confidence between 0 and 1
        results.forEach { result ->
            assertTrue(result.confidence >= 0f)
            assertTrue(result.confidence <= 1f)
        }
    }
}
