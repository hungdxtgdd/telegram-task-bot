/**
 * View Mode Switcher Component
 * Allows users to switch between different view modes (List, Kanban, Gantt, Timeline)
 */

class ViewModeSwitcher {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.currentView = options.currentView || 'list';
    this.onChange = options.onChange || null;
    this.views = options.views || [
      { id: 'list', label: 'Danh sách', icon: 'fa-list' },
      { id: 'kanban', label: 'Kanban', icon: 'fa-columns' },
      { id: 'gantt', label: 'Gantt', icon: 'fa-chart-gantt' },
      { id: 'timeline', label: 'Timeline', icon: 'fa-stream' }
    ];
    
    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the view mode switcher
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="view-mode-switcher">
        ${this.views.map(view => `
          <button 
            class="view-mode-btn ${view.id === this.currentView ? 'active' : ''}" 
            data-view="${view.id}"
            aria-label="Switch to ${view.label} view"
            aria-pressed="${view.id === this.currentView}"
          >
            <i class="fas ${view.icon}"></i>
            <span>${view.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;
    
    const buttons = this.container.querySelectorAll('.view-mode-btn');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const viewId = e.currentTarget.getAttribute('data-view');
        this.setView(viewId);
      });
    });
  }

  /**
   * Set the current view
   */
  setView(viewId) {
    if (this.currentView === viewId) return;
    
    // Update active state
    const buttons = this.container.querySelectorAll('.view-mode-btn');
    buttons.forEach(button => {
      const isActive = button.getAttribute('data-view') === viewId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive);
    });
    
    this.currentView = viewId;
    
    // Trigger onChange callback
    if (this.onChange) {
      this.onChange(viewId, this);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('tasks-view-mode', viewId);
    } catch (e) {
      console.warn('Failed to save view mode to localStorage:', e);
    }
  }

  /**
   * Get the current view
   */
  getView() {
    return this.currentView;
  }

  /**
   * Load view from localStorage
   */
  loadSavedView() {
    try {
      const saved = localStorage.getItem('tasks-view-mode');
      if (saved && this.views.some(v => v.id === saved)) {
        this.setView(saved);
      }
    } catch (e) {
      console.warn('Failed to load view mode from localStorage:', e);
    }
  }

  /**
   * Show/hide specific view buttons
   */
  setVisibleViews(viewIds) {
    this.views = this.views.filter(v => viewIds.includes(v.id));
    this.render();
    this.attachEventListeners();
    // Restore active state
    if (this.views.some(v => v.id === this.currentView)) {
      this.setView(this.currentView);
    } else if (this.views.length > 0) {
      this.setView(this.views[0].id);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewModeSwitcher;
}

