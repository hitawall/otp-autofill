package com.otpautofill.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.otpautofill.R

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Create main layout
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 72, 48, 72)
            setBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
        }

        // Title
        val titleView = TextView(this).apply {
            text = "🔐 OTP Auto-Fill"
            textSize = 24f
            setPadding(0, 0, 0, 24)
            setTextColor(ContextCompat.getColor(context, android.R.color.black))
        }
        layout.addView(titleView)

        // Status
        val statusView = TextView(this).apply {
            text = "Status: Ready to pair"
            textSize = 16f
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusView)

        // Instructions
        val instructionsView = TextView(this).apply {
            text = "1. Open Chrome extension\\n2. Click 'Pair New Device'\\n3. Scan QR code or enter pairing code"
            textSize = 14f
            setPadding(0, 0, 0, 24)
        }
        layout.addView(instructionsView)

        // Scan Button
        val scanButton = Button(this).apply {
            text = "📷 Scan Pairing Code"
            setOnClickListener {
                // TODO: Implement QR code scanning
                statusView.text = "Status: Scanning not implemented yet"
            }
        }
        layout.addView(scanButton)

        // Connection status
        val connectionView = TextView(this).apply {
            text = "\\n📱 Waiting for browser connection..."
            textSize = 14f
            setPadding(0, 24, 0, 0)
        }
        layout.addView(connectionView)

        setContentView(layout)
    }
}
