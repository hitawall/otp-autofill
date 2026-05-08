package com.otpautofill.service

import android.util.Log
import com.otpautofill.data.model.BrowserConnection
import com.otpautofill.data.repository.BrowserConnectionRepository
import kotlinx.coroutines.*
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages WebSocket connections to browser extensions
 */
@Singleton
class WebSocketManager @Inject constructor(
    private val connectionRepository: BrowserConnectionRepository
) {

    private val activeConnections = mutableMapOf<String, WebSocketClient>()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "WebSocketManager"
        private const val RECONNECT_DELAY = 5000L // 5 seconds
        private const val MAX_RECONNECT_ATTEMPTS = 5
    }

    /**
     * Connect to a browser extension
     */
    suspend fun connectToBrowser(
        connectionId: String,
        serverUrl: String,
        authToken: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val uri = URI(serverUrl)
                val webSocketClient = object : WebSocketClient(uri) {
                    override fun onOpen(handshake: ServerHandshake?) {
                        Log.d(TAG, "WebSocket connection opened to $serverUrl")
                        
                        // Send authentication
                        send(createAuthMessage(authToken))
                        
                        // Update connection status
                        scope.launch {
                            connectionRepository.updateConnectionStatus(connectionId, true)
                        }
                    }

                    override fun onMessage(message: String?) {
                        message?.let { handleMessage(connectionId, it) }
                    }

                    override fun onClose(code: Int, reason: String?, remote: Boolean) {
                        Log.d(TAG, "WebSocket connection closed: $reason")
                        
                        // Update connection status
                        scope.launch {
                            connectionRepository.updateConnectionStatus(connectionId, false)
                        }
                        
                        // Remove from active connections
                        activeConnections.remove(connectionId)
                        
                        // Attempt reconnection
                        if (code != 1000) { // Not a normal closure
                            scheduleReconnection(connectionId, serverUrl, authToken)
                        }
                    }

                    override fun onError(ex: Exception?) {
                        Log.e(TAG, "WebSocket error", ex)
                    }
                }

                activeConnections[connectionId] = webSocketClient
                webSocketClient.connect()
                
                // Wait for connection
                delay(3000)
                webSocketClient.isOpen

            } catch (e: Exception) {
                Log.e(TAG, "Failed to connect to browser", e)
                false
            }
        }
    }

    /**
     * Disconnect from a browser
     */
    suspend fun disconnectFromBrowser(connectionId: String) {
        withContext(Dispatchers.IO) {
            activeConnections[connectionId]?.let { client ->
                client.close()
                activeConnections.remove(connectionId)
                connectionRepository.updateConnectionStatus(connectionId, false)
            }
        }
    }

    /**
     * Broadcast OTP to all connected browsers
     */
    suspend fun broadcastOTP(
        otpId: String,
        encryptedCode: String,
        sender: String,
        timestamp: Long
    ): Boolean {
        return withContext(Dispatchers.IO) {
            val message = createOTPMessage(otpId, encryptedCode, sender, timestamp)
            var successCount = 0
            
            activeConnections.values.forEach { client ->
                if (client.isOpen) {
                    try {
                        client.send(message)
                        successCount++
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to send OTP to browser", e)
                    }
                }
            }
            
            successCount > 0
        }
    }

    /**
     * Send message to specific browser
     */
    suspend fun sendToBrowser(connectionId: String, message: String): Boolean {
        return withContext(Dispatchers.IO) {
            activeConnections[connectionId]?.let { client ->
                if (client.isOpen) {
                    try {
                        client.send(message)
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to send message to browser $connectionId", e)
                        false
                    }
                } else false
            } ?: false
        }
    }

    /**
     * Get connection status
     */
    fun getConnectionStatus(): Map<String, Boolean> {
        return activeConnections.mapValues { it.value.isOpen }
    }

    /**
     * Handle incoming messages from browsers
     */
    private fun handleMessage(connectionId: String, message: String) {
        try {
            // Parse message and handle accordingly
            when {
                message.contains("\"type\":\"ping\"") -> {
                    // Respond to ping
                    scope.launch {
                        sendToBrowser(connectionId, createPongMessage())
                    }
                }
                message.contains("\"type\":\"disconnect\"") -> {
                    // Handle disconnection request
                    scope.launch {
                        disconnectFromBrowser(connectionId)
                    }
                }
                else -> {
                    Log.d(TAG, "Received message from browser $connectionId: $message")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling message from browser", e)
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private fun scheduleReconnection(
        connectionId: String,
        serverUrl: String,
        authToken: String
    ) {
        scope.launch {
            delay(RECONNECT_DELAY)
            
            val connection = connectionRepository.getConnection(connectionId)
            if (connection != null && connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                Log.d(TAG, "Attempting to reconnect to browser $connectionId")
                
                val success = connectToBrowser(connectionId, serverUrl, authToken)
                if (success) {
                    connectionRepository.resetReconnectAttempts(connectionId)
                } else {
                    connectionRepository.incrementReconnectAttempts(connectionId)
                }
            }
        }
    }

    /**
     * Create authentication message
     */
    private fun createAuthMessage(authToken: String): String {
        return """
            {
                "type": "auth",
                "token": "$authToken",
                "timestamp": ${System.currentTimeMillis()}
            }
        """.trimIndent()
    }

    /**
     * Create OTP message
     */
    private fun createOTPMessage(
        otpId: String,
        encryptedCode: String,
        sender: String,
        timestamp: Long
    ): String {
        return """
            {
                "type": "otp",
                "id": "$otpId",
                "code": "$encryptedCode",
                "sender": "$sender",
                "timestamp": $timestamp
            }
        """.trimIndent()
    }

    /**
     * Create pong response
     */
    private fun createPongMessage(): String {
        return """
            {
                "type": "pong",
                "timestamp": ${System.currentTimeMillis()}
            }
        """.trimIndent()
    }

    /**
     * Cleanup all connections
     */
    fun cleanup() {
        scope.launch {
            activeConnections.values.forEach { it.close() }
            activeConnections.clear()
        }
    }
}
