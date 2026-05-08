package com.otpautofill.data.model

data class BrowserConnection(
    val id: String,
    val serverUrl: String,
    val connected: Boolean = false,
    val reconnectAttempts: Int = 0
)
