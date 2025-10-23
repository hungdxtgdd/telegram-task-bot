/* ========================================
   SWIPE GESTURES IMPLEMENTATION
   Mobile-first touch interactions
   ======================================== */

class SwipeGestures {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxVerticalDistance = 100;
        this.swipeThreshold = 30;
        
        this.init();
    }

    init() {
        // Add touch event listeners to all swipeable elements
        this.addSwipeListeners();
        
        // Add visual feedback for swipe actions
        this.addSwipeVisuals();
        
        // Add haptic feedback for supported devices
        this.addHapticFeedback();
    }

    addSwipeListeners() {
        // Add swipe listeners to task cards
        document.addEventListener('DOMContentLoaded', () => {
            this.attachSwipeToElements('.task-card', {
                onSwipeRight: this.completeTask.bind(this),
                onSwipeLeft: this.deleteTask.bind(this),
                onSwipeUp: this.editTask.bind(this),
                onSwipeDown: this.showTaskDetails.bind(this)
            });

            // Add swipe listeners to project cards
            this.attachSwipeToElements('.project-card', {
                onSwipeRight: this.activateProject.bind(this),
                onSwipeLeft: this.archiveProject.bind(this),
                onSwipeUp: this.editProject.bind(this),
                onSwipeDown: this.showProjectDetails.bind(this)
            });

            // Add swipe listeners to OKR cards
            this.attachSwipeToElements('.okr-card', {
                onSwipeRight: this.updateOKRProgress.bind(this),
                onSwipeLeft: this.pauseOKR.bind(this),
                onSwipeUp: this.editOKR.bind(this),
                onSwipeDown: this.showOKRDetails.bind(this)
            });

            // Add swipe listeners to user cards
            this.attachSwipeToElements('.user-card', {
                onSwipeRight: this.activateUser.bind(this),
                onSwipeLeft: this.deactivateUser.bind(this),
                onSwipeUp: this.editUser.bind(this),
                onSwipeDown: this.showUserDetails.bind(this)
            });
        });
    }

    attachSwipeToElements(selector, callbacks) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            // Add swipe indicators
            this.addSwipeIndicators(element);
            
            // Add touch event listeners
            element.addEventListener('touchstart', (e) => this.handleTouchStart(e, element, callbacks), { passive: false });
            element.addEventListener('touchmove', (e) => this.handleTouchMove(e, element), { passive: false });
            element.addEventListener('touchend', (e) => this.handleTouchEnd(e, element, callbacks), { passive: false });
            
            // Add mouse events for desktop testing
            element.addEventListener('mousedown', (e) => this.handleMouseStart(e, element, callbacks));
            element.addEventListener('mousemove', (e) => this.handleMouseMove(e, element));
            element.addEventListener('mouseup', (e) => this.handleMouseEnd(e, element, callbacks));
        });
    }

    handleTouchStart(e, element, callbacks) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        
        // Add active class for visual feedback
        element.classList.add('swipe-active');
        
        // Store callbacks on element
        element._swipeCallbacks = callbacks;
        
        // Prevent default to avoid scrolling
        e.preventDefault();
    }

    handleTouchMove(e, element) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Add visual feedback during swipe
        this.updateSwipeVisual(element, deltaX, deltaY);
        
        // Prevent default to avoid scrolling
        e.preventDefault();
    }

    handleTouchEnd(e, element, callbacks) {
        const touch = e.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;
        
        // Remove active class
        element.classList.remove('swipe-active');
        
        // Calculate swipe direction and distance
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Determine swipe direction
        if (absDeltaX > this.minSwipeDistance && absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
                this.executeSwipeAction(element, 'right', callbacks);
            } else {
                this.executeSwipeAction(element, 'left', callbacks);
            }
        } else if (absDeltaY > this.minSwipeDistance && absDeltaY > absDeltaX) {
            // Vertical swipe
            if (deltaY < 0) {
                this.executeSwipeAction(element, 'up', callbacks);
            } else {
                this.executeSwipeAction(element, 'down', callbacks);
            }
        }
        
        // Reset visual feedback
        this.resetSwipeVisual(element);
    }

    handleMouseStart(e, element, callbacks) {
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        element.classList.add('swipe-active');
        element._swipeCallbacks = callbacks;
        element._isMouseDown = true;
    }

    handleMouseMove(e, element) {
        if (!element._isMouseDown) return;
        
        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;
        this.updateSwipeVisual(element, deltaX, deltaY);
    }

    handleMouseEnd(e, element, callbacks) {
        if (!element._isMouseDown) return;
        
        element._isMouseDown = false;
        element.classList.remove('swipe-active');
        
        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (absDeltaX > this.minSwipeDistance && absDeltaX > absDeltaY) {
            if (deltaX > 0) {
                this.executeSwipeAction(element, 'right', callbacks);
            } else {
                this.executeSwipeAction(element, 'left', callbacks);
            }
        } else if (absDeltaY > this.minSwipeDistance && absDeltaY > absDeltaX) {
            if (deltaY < 0) {
                this.executeSwipeAction(element, 'up', callbacks);
            } else {
                this.executeSwipeAction(element, 'down', callbacks);
            }
        }
        
        this.resetSwipeVisual(element);
    }

    executeSwipeAction(element, direction, callbacks) {
        // Add haptic feedback
        this.triggerHapticFeedback();
        
        // Execute callback based on direction
        switch (direction) {
            case 'right':
                if (callbacks.onSwipeRight) {
                    callbacks.onSwipeRight(element);
                }
                break;
            case 'left':
                if (callbacks.onSwipeLeft) {
                    callbacks.onSwipeLeft(element);
                }
                break;
            case 'up':
                if (callbacks.onSwipeUp) {
                    callbacks.onSwipeUp(element);
                }
                break;
            case 'down':
                if (callbacks.onSwipeDown) {
                    callbacks.onSwipeDown(element);
                }
                break;
        }
        
        // Show swipe feedback
        this.showSwipeFeedback(element, direction);
    }

    addSwipeIndicators(element) {
        // Add swipe indicators to show available actions
        const indicators = document.createElement('div');
        indicators.className = 'swipe-indicators';
        indicators.innerHTML = `
            <div class="swipe-indicator swipe-right">
                <i class="fas fa-check"></i>
                <span>Complete</span>
            </div>
            <div class="swipe-indicator swipe-left">
                <i class="fas fa-trash"></i>
                <span>Delete</span>
            </div>
            <div class="swipe-indicator swipe-up">
                <i class="fas fa-edit"></i>
                <span>Edit</span>
            </div>
            <div class="swipe-indicator swipe-down">
                <i class="fas fa-info"></i>
                <span>Details</span>
            </div>
        `;
        
        element.appendChild(indicators);
    }

    updateSwipeVisual(element, deltaX, deltaY) {
        const indicators = element.querySelector('.swipe-indicators');
        if (!indicators) return;
        
        // Show appropriate indicator based on swipe direction
        const rightIndicator = indicators.querySelector('.swipe-right');
        const leftIndicator = indicators.querySelector('.swipe-left');
        const upIndicator = indicators.querySelector('.swipe-up');
        const downIndicator = indicators.querySelector('.swipe-down');
        
        // Reset all indicators
        [rightIndicator, leftIndicator, upIndicator, downIndicator].forEach(indicator => {
            if (indicator) {
                indicator.classList.remove('active');
            }
        });
        
        // Show indicator based on swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && rightIndicator) {
                rightIndicator.classList.add('active');
            } else if (deltaX < 0 && leftIndicator) {
                leftIndicator.classList.add('active');
            }
        } else {
            if (deltaY < 0 && upIndicator) {
                upIndicator.classList.add('active');
            } else if (deltaY > 0 && downIndicator) {
                downIndicator.classList.add('active');
            }
        }
    }

    resetSwipeVisual(element) {
        const indicators = element.querySelector('.swipe-indicators');
        if (!indicators) return;
        
        // Reset all indicators
        const allIndicators = indicators.querySelectorAll('.swipe-indicator');
        allIndicators.forEach(indicator => {
            indicator.classList.remove('active');
        });
    }

    showSwipeFeedback(element, direction) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `swipe-feedback swipe-${direction}`;
        
        // Add appropriate icon and text
        const feedbackData = this.getSwipeFeedbackData(direction);
        feedback.innerHTML = `
            <i class="fas ${feedbackData.icon}"></i>
            <span>${feedbackData.text}</span>
        `;
        
        // Add to element
        element.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 1000);
    }

    getSwipeFeedbackData(direction) {
        const feedbackData = {
            right: { icon: 'fa-check', text: 'Completed!' },
            left: { icon: 'fa-trash', text: 'Deleted!' },
            up: { icon: 'fa-edit', text: 'Edit Mode' },
            down: { icon: 'fa-info', text: 'Details' }
        };
        
        return feedbackData[direction] || { icon: 'fa-hand', text: 'Swipe' };
    }

    addSwipeVisuals() {
        // Add CSS for swipe indicators and feedback
        const style = document.createElement('style');
        style.textContent = `
            .swipe-indicators {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .swipe-active .swipe-indicators {
                opacity: 1;
            }
            
            .swipe-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px;
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                font-size: 12px;
                font-weight: 500;
                transform: scale(0.8);
                transition: transform 0.2s ease;
            }
            
            .swipe-indicator.active {
                transform: scale(1);
                background: var(--primary-600);
            }
            
            .swipe-indicator i {
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .swipe-feedback {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--primary-600);
                color: white;
                padding: 12px 24px;
                border-radius: 24px;
                font-weight: 500;
                z-index: 1000;
                animation: swipeFeedback 1s ease-out;
            }
            
            .swipe-feedback i {
                margin-right: 8px;
            }
            
            @keyframes swipeFeedback {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            .swipe-active {
                transform: scale(0.98);
                transition: transform 0.1s ease;
            }
        `;
        
        document.head.appendChild(style);
    }

    addHapticFeedback() {
        // Add haptic feedback for supported devices
        this.triggerHapticFeedback = () => {
            if ('vibrate' in navigator) {
                navigator.vibrate(50); // Short vibration
            }
        };
    }

    // Task-specific swipe actions
    completeTask(element) {
        const taskId = element.dataset.taskId;
        if (taskId) {
            // Call API to complete task
            fetch(`/api/tasks-enhanced/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    element.classList.add('completed');
                    this.showSwipeFeedback(element, 'right');
                }
            })
            .catch(error => console.error('Error completing task:', error));
        }
    }

    deleteTask(element) {
        const taskId = element.dataset.taskId;
        if (taskId && confirm('Bạn có chắc chắn muốn xóa task này?')) {
            fetch(`/api/tasks-enhanced/${taskId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    element.remove();
                    this.showSwipeFeedback(element, 'left');
                }
            })
            .catch(error => console.error('Error deleting task:', error));
        }
    }

    editTask(element) {
        const taskId = element.dataset.taskId;
        if (taskId && typeof showEditTaskModal === 'function') {
            showEditTaskModal(taskId);
        }
    }

    showTaskDetails(element) {
        const taskId = element.dataset.taskId;
        if (taskId && typeof showTaskDetailsModal === 'function') {
            showTaskDetailsModal(taskId);
        }
    }

    // Project-specific swipe actions
    activateProject(element) {
        const projectId = element.dataset.projectId;
        if (projectId) {
            fetch(`/api/projects-enhanced/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSwipeFeedback(element, 'right');
                }
            })
            .catch(error => console.error('Error activating project:', error));
        }
    }

    archiveProject(element) {
        const projectId = element.dataset.projectId;
        if (projectId && confirm('Bạn có chắc chắn muốn lưu trữ project này?')) {
            fetch(`/api/projects-enhanced/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'archived' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSwipeFeedback(element, 'left');
                }
            })
            .catch(error => console.error('Error archiving project:', error));
        }
    }

    editProject(element) {
        const projectId = element.dataset.projectId;
        if (projectId && typeof showEditProjectModal === 'function') {
            showEditProjectModal(projectId);
        }
    }

    showProjectDetails(element) {
        const projectId = element.dataset.projectId;
        if (projectId && typeof showProjectDetailsModal === 'function') {
            showProjectDetailsModal(projectId);
        }
    }

    // OKR-specific swipe actions
    updateOKRProgress(element) {
        const okrId = element.dataset.okrId;
        if (okrId && typeof showOKRProgressModal === 'function') {
            showOKRProgressModal(okrId);
        }
    }

    pauseOKR(element) {
        const okrId = element.dataset.okrId;
        if (okrId && confirm('Bạn có chắc chắn muốn tạm dừng OKR này?')) {
            fetch(`/api/okrs-enhanced/${okrId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paused' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSwipeFeedback(element, 'left');
                }
            })
            .catch(error => console.error('Error pausing OKR:', error));
        }
    }

    editOKR(element) {
        const okrId = element.dataset.okrId;
        if (okrId && typeof showEditOKRModal === 'function') {
            showEditOKRModal(okrId);
        }
    }

    showOKRDetails(element) {
        const okrId = element.dataset.okrId;
        if (okrId && typeof showOKRDetailsModal === 'function') {
            showOKRDetailsModal(okrId);
        }
    }

    // User-specific swipe actions
    activateUser(element) {
        const userId = element.dataset.userId;
        if (userId) {
            fetch(`/api/users-enhanced/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSwipeFeedback(element, 'right');
                }
            })
            .catch(error => console.error('Error activating user:', error));
        }
    }

    deactivateUser(element) {
        const userId = element.dataset.userId;
        if (userId && confirm('Bạn có chắc chắn muốn vô hiệu hóa user này?')) {
            fetch(`/api/users-enhanced/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'inactive' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.showSwipeFeedback(element, 'left');
                }
            })
            .catch(error => console.error('Error deactivating user:', error));
        }
    }

    editUser(element) {
        const userId = element.dataset.userId;
        if (userId && typeof editUser === 'function') {
            editUser(userId);
        }
    }

    showUserDetails(element) {
        const userId = element.dataset.userId;
        if (userId && typeof showUserDetailsModal === 'function') {
            showUserDetailsModal(userId);
        }
    }
}

// Initialize swipe gestures when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SwipeGestures();
});

// Export for use in other modules
window.SwipeGestures = SwipeGestures;
