/* ========================================
   PULL-TO-REFRESH IMPLEMENTATION
   Mobile-first refresh gesture
   ======================================== */

class PullToRefresh {
    constructor(options = {}) {
        this.options = {
            threshold: 80,
            resistance: 2.5,
            refreshText: 'Kéo để làm mới',
            releaseText: 'Thả để làm mới',
            refreshingText: 'Đang làm mới...',
            ...options
        };
        
        this.startY = 0;
        this.currentY = 0;
        this.isRefreshing = false;
        this.isPulling = false;
        this.refreshElement = null;
        
        this.init();
    }

    init() {
        this.createRefreshElement();
        this.attachEventListeners();
    }

    createRefreshElement() {
        // Create refresh indicator
        this.refreshElement = document.createElement('div');
        this.refreshElement.className = 'pull-to-refresh';
        this.refreshElement.innerHTML = `
            <div class="pull-to-refresh-content">
                <div class="pull-to-refresh-icon">
                    <i class="fas fa-sync-alt"></i>
                </div>
                <div class="pull-to-refresh-text">${this.options.refreshText}</div>
            </div>
        `;
        
        // Add CSS styles
        this.addStyles();
        
        // Insert at the top of the body
        document.body.insertBefore(this.refreshElement, document.body.firstChild);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pull-to-refresh {
                position: fixed;
                top: -80px;
                left: 0;
                right: 0;
                height: 80px;
                background: var(--primary-600);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                transition: transform 0.3s ease;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .pull-to-refresh-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .pull-to-refresh-icon {
                font-size: 24px;
                transition: transform 0.3s ease;
            }
            
            .pull-to-refresh-icon.spinning {
                animation: spin 1s linear infinite;
            }
            
            .pull-to-refresh-text {
                font-size: 14px;
                font-weight: 500;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .pull-to-refresh.visible {
                transform: translateY(80px);
            }
            
            .pull-to-refresh.refreshing {
                background: var(--primary-700);
            }
            
            .pull-to-refresh.release {
                background: var(--success-600);
            }
        `;
        
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Touch events
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse events for desktop testing
        document.addEventListener('mousedown', this.handleMouseStart.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseEnd.bind(this));
        
        // Prevent default touch behavior on scroll
        document.addEventListener('touchmove', (e) => {
            if (this.isPulling && window.scrollY === 0) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    handleTouchStart(e) {
        if (window.scrollY === 0 && !this.isRefreshing) {
            this.startY = e.touches[0].clientY;
            this.isPulling = true;
        }
    }

    handleTouchMove(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        this.currentY = e.touches[0].clientY;
        const deltaY = this.currentY - this.startY;
        
        if (deltaY > 0) {
            // Pulling down
            const pullDistance = Math.min(deltaY / this.options.resistance, this.options.threshold);
            this.updatePullDistance(pullDistance);
            
            // Prevent scrolling when pulling
            if (pullDistance > 10) {
                e.preventDefault();
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.isPulling) return;
        
        this.isPulling = false;
        const deltaY = this.currentY - this.startY;
        
        if (deltaY > this.options.threshold && !this.isRefreshing) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }
    }

    handleMouseStart(e) {
        if (window.scrollY === 0 && !this.isRefreshing && e.target === document.body) {
            this.startY = e.clientY;
            this.isPulling = true;
        }
    }

    handleMouseMove(e) {
        if (!this.isPulling || this.isRefreshing) return;
        
        this.currentY = e.clientY;
        const deltaY = this.currentY - this.startY;
        
        if (deltaY > 0) {
            const pullDistance = Math.min(deltaY / this.options.resistance, this.options.threshold);
            this.updatePullDistance(pullDistance);
        }
    }

    handleMouseEnd(e) {
        if (!this.isPulling) return;
        
        this.isPulling = false;
        const deltaY = this.currentY - this.startY;
        
        if (deltaY > this.options.threshold && !this.isRefreshing) {
            this.triggerRefresh();
        } else {
            this.resetPull();
        }
    }

    updatePullDistance(pullDistance) {
        const progress = pullDistance / this.options.threshold;
        const translateY = Math.min(pullDistance, this.options.threshold);
        
        // Update visual feedback
        this.refreshElement.style.transform = `translateY(${translateY}px)`;
        
        // Update icon rotation
        const icon = this.refreshElement.querySelector('.pull-to-refresh-icon i');
        if (icon) {
            icon.style.transform = `rotate(${progress * 180}deg)`;
        }
        
        // Update text based on progress
        const text = this.refreshElement.querySelector('.pull-to-refresh-text');
        if (text) {
            if (progress >= 1) {
                text.textContent = this.options.releaseText;
                this.refreshElement.classList.add('release');
            } else {
                text.textContent = this.options.refreshText;
                this.refreshElement.classList.remove('release');
            }
        }
        
        // Show refresh element when pulling
        if (pullDistance > 10) {
            this.refreshElement.classList.add('visible');
        } else {
            this.refreshElement.classList.remove('visible');
        }
    }

    triggerRefresh() {
        this.isRefreshing = true;
        this.refreshElement.classList.add('refreshing');
        
        // Update text and icon
        const text = this.refreshElement.querySelector('.pull-to-refresh-text');
        const icon = this.refreshElement.querySelector('.pull-to-refresh-icon i');
        
        if (text) text.textContent = this.options.refreshingText;
        if (icon) {
            icon.classList.add('spinning');
        }
        
        // Trigger refresh callback
        if (this.options.onRefresh) {
            this.options.onRefresh().finally(() => {
                this.resetPull();
            });
        } else {
            // Default refresh behavior
            this.defaultRefresh().finally(() => {
                this.resetPull();
            });
        }
    }

    async defaultRefresh() {
        // Default refresh behavior - reload the page
        try {
            // Show loading state
            this.showLoadingState();
            
            // Simulate refresh delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reload the page
            window.location.reload();
        } catch (error) {
            console.error('Error during refresh:', error);
            this.showErrorState();
        }
    }

    resetPull() {
        this.isRefreshing = false;
        this.isPulling = false;
        
        // Reset visual state
        this.refreshElement.style.transform = 'translateY(-80px)';
        this.refreshElement.classList.remove('visible', 'refreshing', 'release');
        
        // Reset icon
        const icon = this.refreshElement.querySelector('.pull-to-refresh-icon i');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
            icon.classList.remove('spinning');
        }
        
        // Reset text
        const text = this.refreshElement.querySelector('.pull-to-refresh-text');
        if (text) {
            text.textContent = this.options.refreshText;
        }
    }

    showLoadingState() {
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'fixed top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang làm mới...';
        document.body.appendChild(loadingIndicator);
        
        setTimeout(() => {
            loadingIndicator.remove();
        }, 2000);
    }

    showErrorState() {
        // Show error indicator
        const errorIndicator = document.createElement('div');
        errorIndicator.className = 'fixed top-4 right-4 bg-error-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        errorIndicator.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Lỗi khi làm mới';
        document.body.appendChild(errorIndicator);
        
        setTimeout(() => {
            errorIndicator.remove();
        }, 3000);
    }

    // Public method to trigger refresh programmatically
    refresh() {
        if (!this.isRefreshing) {
            this.triggerRefresh();
        }
    }

    // Public method to destroy the pull-to-refresh
    destroy() {
        if (this.refreshElement) {
            this.refreshElement.remove();
        }
        
        // Remove event listeners
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('mousedown', this.handleMouseStart);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseEnd);
    }
}

// Initialize pull-to-refresh when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with custom refresh callback
    window.pullToRefresh = new PullToRefresh({
        onRefresh: async () => {
            // Custom refresh logic
            try {
                // Refresh data based on current page
                const currentPath = window.location.pathname;
                
                if (currentPath.includes('/users')) {
                    // Refresh users data
                    if (typeof loadUsers === 'function') {
                        await loadUsers();
                    }
                } else if (currentPath.includes('/tasks')) {
                    // Refresh tasks data
                    if (typeof loadTasks === 'function') {
                        await loadTasks();
                    }
                } else if (currentPath.includes('/projects')) {
                    // Refresh projects data
                    if (typeof loadProjects === 'function') {
                        await loadProjects();
                    }
                } else if (currentPath.includes('/okrs')) {
                    // Refresh OKRs data
                    if (typeof loadOKRs === 'function') {
                        await loadOKRs();
                    }
                } else {
                    // Default refresh
                    window.location.reload();
                }
                
                // Show success message
                const successIndicator = document.createElement('div');
                successIndicator.className = 'fixed top-4 right-4 bg-success-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                successIndicator.innerHTML = '<i class="fas fa-check mr-2"></i>Đã làm mới thành công!';
                document.body.appendChild(successIndicator);
                
                setTimeout(() => {
                    successIndicator.remove();
                }, 2000);
                
            } catch (error) {
                console.error('Error during refresh:', error);
                throw error;
            }
        }
    });
});

// Export for use in other modules
window.PullToRefresh = PullToRefresh;
