package com.otpautofill.data.repository

import com.otpautofill.data.model.BrowserConnection
import java.util.concurrent.ConcurrentHashMap

class BrowserConnectionRepository {
    private val connections = ConcurrentHashMap<String, BrowserConnection>()

    suspend fun updateConnectionStatus(connectionId: String, connected: Boolean) {
        val existing = connections[connectionId]
        if (existing != null) {
            connections[connectionId] = existing.copy(connected = connected)
        }
    }

    suspend fun getConnection(connectionId: String): BrowserConnection? {
        return connections[connectionId]
    }

    suspend fun resetReconnectAttempts(connectionId: String) {
        val existing = connections[connectionId]
        if (existing != null) {
            connections[connectionId] = existing.copy(reconnectAttempts = 0)
        }
    }

    suspend fun incrementReconnectAttempts(connectionId: String) {
        val existing = connections[connectionId]
        if (existing != null) {
            connections[connectionId] = existing.copy(
                reconnectAttempts = existing.reconnectAttempts + 1
            )
        }
    }
}
