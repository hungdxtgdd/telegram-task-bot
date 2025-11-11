/* ========================================
   INFINITE SCROLL IMPLEMENTATION
   Mobile-first infinite loading
   ======================================== */

class InfiniteScroll {
    constructor(options = {}) {
        this.options = {
            threshold: 100, // pixels from bottom to trigger load
            loadingText: 'Đang tải thêm...',
            noMoreText: 'Không còn dữ liệu',
            errorText: 'Lỗi khi tải dữ liệu',
            ...options
        };
        
        this.container = null;
        this.loadingElement = null;
        this.isLoading = false;
        this.hasMore = true;
        this.currentPage = 1;
        this.totalPages = 1;
        
        this.init();
    }

    init() {
        this.createLoadingElement();
        this.attachScrollListener();
    }

    createLoadingElement() {
        // Create loading indicator
        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'infinite-scroll-loading';
        this.loadingElement.innerHTML = `
            <div class="infinite-scroll-content">
                <div class="infinite-scroll-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="infinite-scroll-text">${this.options.loadingText}</div>
            </div>
        `;
        
        // Add CSS styles
        this.addStyles();
        
        // Initially hidden
        this.loadingElement.style.display = 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .infinite-scroll-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: var(--gray-50);
                border-top: 1px solid var(--gray-200);
            }
            
            .infinite-scroll-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            }
            
            .infinite-scroll-spinner {
                position: relative;
                width: 32px;
                height: 32px;
            }
            
            .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--gray-200);
                border-top: 3px solid var(--primary-600);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .infinite-scroll-text {
                font-size: 14px;
                color: var(--gray-600);
                font-weight: 500;
            }
            
            .infinite-scroll-loading.error .infinite-scroll-text {
                color: var(--error-600);
            }
            
            .infinite-scroll-loading.no-more .infinite-scroll-text {
                color: var(--gray-500);
            }
            
            .infinite-scroll-loading.no-more .spinner {
                display: none;
            }
            
            .infinite-scroll-loading.no-more::before {
                content: '✓';
                font-size: 24px;
                color: var(--success-600);
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .infinite-scroll-item {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp 0.5s ease forwards;
            }
            
            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    attachScrollListener() {
        // Use intersection observer for better performance
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback to scroll event
            this.setupScrollListener();
        }
    }

    setupIntersectionObserver() {
        // Create sentinel element
        this.sentinel = document.createElement('div');
        this.sentinel.className = 'infinite-scroll-sentinel';
        this.sentinel.style.height = '1px';
        this.sentinel.style.position = 'absolute';
        this.sentinel.style.bottom = '0';
        this.sentinel.style.left = '0';
        this.sentinel.style.right = '0';
        this.sentinel.style.pointerEvents = 'none';
        
        // Add sentinel to container
        if (this.container) {
            this.container.appendChild(this.sentinel);
        }
        
        // Create intersection observer
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.isLoading) {
                    this.loadMore();
                }
            });
        }, {
            root: null,
            rootMargin: `${this.options.threshold}px`,
            threshold: 0
        });
        
        // Observe sentinel
        this.observer.observe(this.sentinel);
    }

    setupScrollListener() {
        // Fallback scroll listener
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }

    handleScroll() {
        if (this.isLoading || !this.hasMore) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - this.options.threshold) {
            this.loadMore();
        }
    }

    setContainer(container) {
        this.container = container;
        
        // Add loading element to container
        if (this.container && this.loadingElement) {
            this.container.appendChild(this.loadingElement);
        }
        
        // Update sentinel if using intersection observer
        if (this.sentinel && this.container) {
            this.container.appendChild(this.sentinel);
        }
    }

    async loadMore() {
        if (this.isLoading || !this.hasMore) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            // Call load more callback
            if (this.options.onLoadMore) {
                const result = await this.options.onLoadMore(this.currentPage + 1);
                
                if (result) {
                    this.currentPage++;
                    this.hasMore = result.hasMore !== false;
                    this.totalPages = result.totalPages || this.totalPages;
                    
                    if (this.hasMore) {
                        this.hideLoading();
                    } else {
                        this.showNoMore();
                    }
                } else {
                    this.showError();
                }
            } else {
                // Default load more behavior
                await this.defaultLoadMore();
            }
        } catch (error) {
            console.error('Error loading more data:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    async defaultLoadMore() {
        // Default load more behavior
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add some dummy content
            this.addDummyContent();
            
            // Check if we should continue loading
            if (this.currentPage >= 5) { // Stop after 5 pages
                this.hasMore = false;
                this.showNoMore();
            } else {
                this.hideLoading();
            }
        } catch (error) {
            throw error;
        }
    }

    addDummyContent() {
        if (!this.container) return;
        
        // Add dummy content for demonstration
        const dummyItems = Array.from({ length: 10 }, (_, index) => {
            const item = document.createElement('div');
            item.className = 'infinite-scroll-item card mb-4';
            item.innerHTML = `
                <div class="card-body">
                    <h3 class="text-lg font-semibold text-gray-900">Item ${this.currentPage * 10 + index + 1}</h3>
                    <p class="text-gray-600">This is dummy content for infinite scroll demonstration.</p>
                </div>
            `;
            return item;
        });
        
        // Insert before loading element
        dummyItems.forEach(item => {
            this.container.insertBefore(item, this.loadingElement);
        });
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.className = 'infinite-scroll-loading';
            this.loadingElement.innerHTML = `
                <div class="infinite-scroll-content">
                    <div class="infinite-scroll-spinner">
                        <div class="spinner"></div>
                    </div>
                    <div class="infinite-scroll-text">${this.options.loadingText}</div>
                </div>
            `;
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    showNoMore() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.className = 'infinite-scroll-loading no-more';
            this.loadingElement.innerHTML = `
                <div class="infinite-scroll-content">
                    <div class="infinite-scroll-text">${this.options.noMoreText}</div>
                </div>
            `;
        }
    }

    showError() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.className = 'infinite-scroll-loading error';
            this.loadingElement.innerHTML = `
                <div class="infinite-scroll-content">
                    <div class="infinite-scroll-text">${this.options.errorText}</div>
                    <button onclick="infiniteScroll.retry()" class="btn btn-primary btn-sm mt-2">
                        Thử lại
                    </button>
                </div>
            `;
        }
    }

    retry() {
        this.hasMore = true;
        this.loadMore();
    }

    reset() {
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.hideLoading();
    }

    destroy() {
        // Remove event listeners
        if (this.observer) {
            this.observer.disconnect();
        }
        
        window.removeEventListener('scroll', this.handleScroll);
        
        // Remove elements
        if (this.loadingElement) {
            this.loadingElement.remove();
        }
        
        if (this.sentinel) {
            this.sentinel.remove();
        }
    }
}

// Initialize infinite scroll when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with custom load more callback
    window.infiniteScroll = new InfiniteScroll({
        onLoadMore: async (page) => {
            try {
                // Load more data based on current page
                const currentPath = window.location.pathname;
                let response;
                
                // Get auth token
                const token = localStorage.getItem('token') || 'test-token';
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };
                
                if (currentPath.includes('/users')) {
                    response = await fetch(`/api/users-enhanced?page=${page}&limit=20`, { headers });
                } else if (currentPath.includes('/tasks')) {
                    response = await fetch(`/api/tasks-enhanced?page=${page}&limit=20`, { headers });
                } else if (currentPath.includes('/projects')) {
                    response = await fetch(`/api/projects-enhanced?page=${page}&limit=20`, { headers });
                } else if (currentPath.includes('/okrs')) {
                    response = await fetch(`/api/okrs-enhanced?page=${page}&limit=20`, { headers });
                } else {
                    return null;
                }
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Handle both array response and object response
                let items = [];
                if (Array.isArray(data)) {
                    items = data;
                } else if (data.success && Array.isArray(data.items)) {
                    items = data.items;
                } else if (data.success && Array.isArray(data.data)) {
                    items = data.data;
                } else if (Array.isArray(data.items)) {
                    items = data.items;
                } else if (Array.isArray(data.data)) {
                    items = data.data;
                }
                
                // Render new items
                if (typeof renderItems === 'function') {
                    renderItems(items);
                }
                
                return {
                    hasMore: data.hasMore !== false && items.length > 0,
                    totalPages: data.totalPages || Math.ceil((data.total || items.length) / 20)
                };
            } catch (error) {
                console.error('Error loading more data:', error);
                throw error;
            }
        }
    });
});

// Export for use in other modules
window.InfiniteScroll = InfiniteScroll;
