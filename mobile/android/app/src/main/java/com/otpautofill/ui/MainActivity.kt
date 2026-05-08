package com.otpautofill.ui

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val textView = TextView(this).apply {
            text = "OTP Auto-Fill prototype is running."
            textSize = 18f
            setPadding(48, 72, 48, 72)
        }
        setContentView(textView)
    }
}
