/* ========================================
   REAL-TIME COLLABORATION IMPLEMENTATION
   WebSocket-based live updates
   ======================================== */

class RealtimeCollaboration {
    constructor(options = {}) {
        this.options = {
            wsUrl: 'wss://your-websocket-server.com/ws',
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            heartbeatInterval: 30000,
            ...options
        };
        
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
        this.pendingMessages = [];
        this.subscribers = new Map();
        this.userId = null;
        this.userRole = null;
        
        this.init();
    }

    init() {
        this.loadUserInfo();
        this.setupEventListeners();
        // Only connect if WebSocket URL is properly configured
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Real-time collaboration disabled in production - WebSocket server not configured
            // Silently disable without console warning
        } else {
            this.connect();
        }
    }

    loadUserInfo() {
        // Load user info from localStorage or API
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const user = JSON.parse(userInfo);
            this.userId = user.id;
            this.userRole = user.role;
        }
    }

    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseHeartbeat();
            } else {
                this.resumeHeartbeat();
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });

        // Handle online/offline events
        window.addEventListener('online', () => {
            this.connect();
        });

        window.addEventListener('offline', () => {
            this.disconnect();
        });
    }

    connect() {
        try {
            // Use WebSocket if available, fallback to polling
            if ('WebSocket' in window) {
                this.connectWebSocket();
            } else {
                this.connectPolling();
            }
        } catch (error) {
            console.error('Error connecting to real-time service:', error);
            this.scheduleReconnect();
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.options.wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.flushPendingMessages();
            this.emit('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected');
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    connectPolling() {
        // Fallback to polling if WebSocket not available
        console.log('WebSocket not available, using polling');
        this.isConnected = true;
        this.startPolling();
    }

    startPolling() {
        this.pollingInterval = setInterval(() => {
            this.pollForUpdates();
        }, 5000); // Poll every 5 seconds
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async pollForUpdates() {
        try {
            const response = await fetch('/api/realtime/poll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    lastUpdate: this.lastUpdateTime || Date.now() - 60000
                })
            });

            const data = await response.json();
            
            if (data.success && data.updates) {
                data.updates.forEach(update => {
                    this.handleMessage(update);
                });
                this.lastUpdateTime = Date.now();
            }
        } catch (error) {
            console.error('Error polling for updates:', error);
        }
    }

    handleMessage(data) {
        const { type, payload, timestamp, userId } = data;
        
        // Don't process own messages
        if (userId === this.userId) return;
        
        // Update last seen timestamp
        this.lastUpdateTime = timestamp;
        
        // Emit to subscribers
        this.emit(type, payload);
        
        // Handle specific message types
        switch (type) {
            case 'user_online':
                this.handleUserOnline(payload);
                break;
            case 'user_offline':
                this.handleUserOffline(payload);
                break;
            case 'data_updated':
                this.handleDataUpdated(payload);
                break;
            case 'collaboration_started':
                this.handleCollaborationStarted(payload);
                break;
            case 'collaboration_ended':
                this.handleCollaborationEnded(payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
        }
    }

    handleUserOnline(user) {
        this.showUserStatus(user, 'online');
        this.updateUserPresence(user.id, 'online');
    }

    handleUserOffline(user) {
        this.showUserStatus(user, 'offline');
        this.updateUserPresence(user.id, 'offline');
    }

    handleDataUpdated(data) {
        const { entity, entityId, changes } = data;
        
        // Update UI based on entity type
        switch (entity) {
            case 'user':
                this.updateUserUI(entityId, changes);
                break;
            case 'task':
                this.updateTaskUI(entityId, changes);
                break;
            case 'project':
                this.updateProjectUI(entityId, changes);
                break;
            case 'okr':
                this.updateOKRUI(entityId, changes);
                break;
        }
        
        // Show update notification
        this.showUpdateNotification(entity, changes);
    }

    handleCollaborationStarted(data) {
        const { user, entity, entityId } = data;
        this.showCollaborationIndicator(user, entity, entityId);
    }

    handleCollaborationEnded(data) {
        const { user, entity, entityId } = data;
        this.hideCollaborationIndicator(user, entity, entityId);
    }

    handleNotification(notification) {
        this.showNotification(notification);
    }

    sendMessage(type, payload) {
        const message = {
            type,
            payload,
            userId: this.userId,
            userRole: this.userRole,
            timestamp: Date.now()
        };

        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Store for later sending
            this.pendingMessages.push(message);
        }
    }

    flushPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            this.sendMessage(message.type, message.payload);
        }
    }

    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const callbacks = this.subscribers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event callback:', error);
                }
            });
        }
    }

    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.sendMessage('heartbeat', { timestamp: Date.now() });
        }, this.options.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    pauseHeartbeat() {
        this.stopHeartbeat();
    }

    resumeHeartbeat() {
        if (this.isConnected) {
            this.startHeartbeat();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connect();
            }, this.options.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
        }
    }

    disconnect() {
        this.isConnected = false;
        this.stopHeartbeat();
        this.stopPolling();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // UI Update Methods
    updateUserUI(userId, changes) {
        // Update user card in UI
        const userCard = document.querySelector(`[data-user-id="${userId}"]`);
        if (userCard) {
            // Apply changes to user card
            Object.keys(changes).forEach(key => {
                const element = userCard.querySelector(`[data-field="${key}"]`);
                if (element) {
                    element.textContent = changes[key];
                }
            });
            
            // Add update indicator
            this.addUpdateIndicator(userCard);
        }
    }

    updateTaskUI(taskId, changes) {
        // Update task card in UI
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
            // Apply changes to task card
            Object.keys(changes).forEach(key => {
                const element = taskCard.querySelector(`[data-field="${key}"]`);
                if (element) {
                    element.textContent = changes[key];
                }
            });
            
            // Add update indicator
            this.addUpdateIndicator(taskCard);
        }
    }

    updateProjectUI(projectId, changes) {
        // Update project card in UI
        const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
        if (projectCard) {
            // Apply changes to project card
            Object.keys(changes).forEach(key => {
                const element = projectCard.querySelector(`[data-field="${key}"]`);
                if (element) {
                    element.textContent = changes[key];
                }
            });
            
            // Add update indicator
            this.addUpdateIndicator(projectCard);
        }
    }

    updateOKRUI(okrId, changes) {
        // Update OKR card in UI
        const okrCard = document.querySelector(`[data-okr-id="${okrId}"]`);
        if (okrCard) {
            // Apply changes to OKR card
            Object.keys(changes).forEach(key => {
                const element = okrCard.querySelector(`[data-field="${key}"]`);
                if (element) {
                    element.textContent = changes[key];
                }
            });
            
            // Add update indicator
            this.addUpdateIndicator(okrCard);
        }
    }

    addUpdateIndicator(element) {
        // Add visual indicator for updated items
        element.classList.add('updated-item');
        
        setTimeout(() => {
            element.classList.remove('updated-item');
        }, 3000);
    }

    updateUserPresence(userId, status) {
        // Update user presence indicator
        const presenceIndicator = document.querySelector(`[data-user-presence="${userId}"]`);
        if (presenceIndicator) {
            presenceIndicator.className = `user-presence ${status}`;
        }
    }

    showUserStatus(user, status) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
            status === 'online' ? 'bg-success-600' : 'bg-gray-600'
        } text-white`;
        notification.innerHTML = `
            <i class="fas fa-user mr-2"></i>
            ${user.name} is ${status}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showUpdateNotification(entity, changes) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.innerHTML = `
            <i class="fas fa-sync-alt mr-2"></i>
            ${entity} updated
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    showCollaborationIndicator(user, entity, entityId) {
        const indicator = document.createElement('div');
        indicator.className = 'collaboration-indicator';
        indicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-600">${user.name} is editing ${entity}</span>
            </div>
        `;
        
        const targetElement = document.querySelector(`[data-${entity}-id="${entityId}"]`);
        if (targetElement) {
            targetElement.appendChild(indicator);
        }
    }

    hideCollaborationIndicator(user, entity, entityId) {
        const indicator = document.querySelector(`[data-collaborator="${user.id}"]`);
        if (indicator) {
            indicator.remove();
        }
    }

    showNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm';
        notificationElement.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas fa-bell text-primary-600"></i>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-gray-900">${notification.title}</h3>
                    <p class="text-sm text-gray-500 mt-1">${notification.message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notificationElement);
        
        setTimeout(() => {
            notificationElement.remove();
        }, 5000);
    }

    // Public API Methods
    notifyDataUpdate(entity, entityId, changes) {
        this.sendMessage('data_updated', {
            entity,
            entityId,
            changes
        });
    }

    startCollaboration(entity, entityId) {
        this.sendMessage('collaboration_started', {
            entity,
            entityId
        });
    }

    endCollaboration(entity, entityId) {
        this.sendMessage('collaboration_ended', {
            entity,
            entityId
        });
    }

    sendNotification(title, message, type = 'info') {
        this.sendMessage('notification', {
            title,
            message,
            type
        });
    }
}

// Initialize real-time collaboration
document.addEventListener('DOMContentLoaded', () => {
    window.realtimeCollaboration = new RealtimeCollaboration({
        wsUrl: 'wss://your-websocket-server.com/ws',
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
    });
});

// Export for use in other modules
window.RealtimeCollaboration = RealtimeCollaboration;
