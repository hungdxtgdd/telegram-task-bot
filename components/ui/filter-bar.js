/**
 * Filter Bar Component
 * Provides filtering capabilities for tasks
 */

class FilterBar {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.filters = options.filters || {
      status: [],
      priority: [],
      assignee: [],
      project: [],
      dueDate: null,
      search: ''
    };
    this.onChange = options.onChange || null;
    this.users = options.users || [];
    this.projects = options.projects || [];
    
    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the filter bar
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label">Trạng thái:</label>
          <select class="filter-select" id="filter-status">
            <option value="">Tất cả</option>
            <option value="todo" ${this.filters.status.includes('todo') ? 'selected' : ''}>To Do</option>
            <option value="in-progress" ${this.filters.status.includes('in-progress') ? 'selected' : ''}>In Progress</option>
            <option value="done" ${this.filters.status.includes('done') ? 'selected' : ''}>Done</option>
            <option value="blocked" ${this.filters.status.includes('blocked') ? 'selected' : ''}>Blocked</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Độ ưu tiên:</label>
          <select class="filter-select" id="filter-priority">
            <option value="">Tất cả</option>
            <option value="high" ${this.filters.priority.includes('high') ? 'selected' : ''}>High</option>
            <option value="medium" ${this.filters.priority.includes('medium') ? 'selected' : ''}>Medium</option>
            <option value="low" ${this.filters.priority.includes('low') ? 'selected' : ''}>Low</option>
            <option value="emergency" ${this.filters.priority.includes('emergency') ? 'selected' : ''}>Emergency</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Người giao:</label>
          <select class="filter-select" id="filter-assignee">
            <option value="">Tất cả</option>
            ${this.users.map(user => `
              <option value="${user.id}" ${this.filters.assignee.includes(String(user.id)) ? 'selected' : ''}>
                ${this.escapeHtml(user.full_name || user.name || user.username)}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Dự án:</label>
          <select class="filter-select" id="filter-project">
            <option value="">Tất cả</option>
            ${(this.projects || []).map(project => `
              <option value="${project.id}" ${this.filters.project.includes(String(project.id)) ? 'selected' : ''}>
                ${this.escapeHtml(project.project_name || project.name)}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group" style="flex: 1; min-width: 200px;">
          <input 
            type="text" 
            class="filter-search" 
            id="filter-search" 
            placeholder="Tìm kiếm tasks..."
            value="${this.escapeHtml(this.filters.search)}"
          >
        </div>
        
        <button class="filter-advanced-btn" id="filter-advanced-btn">
          <i class="fas fa-filter"></i> Lọc nâng cao
        </button>
      </div>
      
      ${this.renderActiveFilters()}
    `;
  }

  /**
   * Render active filter chips
   */
  renderActiveFilters() {
    const activeFilters = this.getActiveFilters();
    if (activeFilters.length === 0) return '';
    
    return `
      <div class="active-filters">
        ${activeFilters.map(filter => `
          <span class="filter-chip">
            <span>${filter.label}</span>
            <button class="filter-chip-remove" data-filter-type="${filter.type}" data-filter-value="${this.escapeHtml(filter.value)}" title="Xóa filter">
              <i class="fas fa-times"></i>
            </button>
          </span>
        `).join('')}
        <button class="filter-clear-all" id="filter-clear-all">Xóa tất cả</button>
      </div>
    `;
  }

  /**
   * Get active filters as array
   */
  getActiveFilters() {
    const active = [];
    
    if (this.filters.status.length > 0) {
      this.filters.status.forEach(status => {
        active.push({
          type: 'status',
          value: status,
          label: `Trạng thái: ${this.getStatusLabel(status)}`
        });
      });
    }
    
    if (this.filters.priority.length > 0) {
      this.filters.priority.forEach(priority => {
        active.push({
          type: 'priority',
          value: priority,
          label: `Độ ưu tiên: ${this.getPriorityLabel(priority)}`
        });
      });
    }
    
    if (this.filters.assignee.length > 0) {
      this.filters.assignee.forEach(assigneeId => {
        const user = this.users.find(u => String(u.id) === String(assigneeId));
        active.push({
          type: 'assignee',
          value: assigneeId,
          label: `Người giao: ${user ? (user.full_name || user.name || user.username) : assigneeId}`
        });
      });
    }
    
    if (this.filters.project.length > 0) {
      this.filters.project.forEach(projectId => {
        const project = this.projects.find(p => String(p.id) === String(projectId));
        active.push({
          type: 'project',
          value: projectId,
          label: `Dự án: ${project ? (project.project_name || project.name) : projectId}`
        });
      });
    }
    
    if (this.filters.search) {
      active.push({
        type: 'search',
        value: this.filters.search,
        label: `Tìm kiếm: "${this.filters.search}"`
      });
    }
    
    return active;
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'done': 'Done',
      'blocked': 'Blocked'
    };
    return labels[status] || status;
  }

  /**
   * Get priority label
   */
  getPriorityLabel(priority) {
    const labels = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'emergency': 'Emergency'
    };
    return labels[priority] || priority;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;
    
    // Status filter
    const statusSelect = this.container.querySelector('#filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        const value = statusSelect.value;
        this.filters.status = value ? [value] : [];
        this.updateFilters();
      });
    }
    
    // Priority filter
    const prioritySelect = this.container.querySelector('#filter-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', () => {
        const value = prioritySelect.value;
        this.filters.priority = value ? [value] : [];
        this.updateFilters();
      });
    }
    
    // Assignee filter
    const assigneeSelect = this.container.querySelector('#filter-assignee');
    if (assigneeSelect) {
      assigneeSelect.addEventListener('change', () => {
        const value = assigneeSelect.value;
        this.filters.assignee = value ? [value] : [];
        this.updateFilters();
      });
    }
    
    // Project filter
    const projectSelect = this.container.querySelector('#filter-project');
    if (projectSelect) {
      projectSelect.addEventListener('change', () => {
        const value = projectSelect.value;
        this.filters.project = value ? [value] : [];
        this.updateFilters();
      });
    }
    
    // Search filter (debounced)
    const searchInput = this.container.querySelector('#filter-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filters.search = e.target.value.trim();
          this.updateFilters();
        }, 300);
      });
    }
    
    // Clear all filters
    const clearAllBtn = this.container.querySelector('#filter-clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
    
    // Remove individual filter chips
    this.container.querySelectorAll('.filter-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-filter-type');
        const value = e.currentTarget.getAttribute('data-filter-value');
        this.removeFilter(type, value);
      });
    });
  }

  /**
   * Update filters and trigger onChange
   */
  updateFilters() {
    // Re-render active filters
    const activeFiltersContainer = this.container.querySelector('.active-filters');
    if (activeFiltersContainer) {
      activeFiltersContainer.outerHTML = this.renderActiveFilters();
      // Re-attach event listeners for remove buttons
      this.container.querySelectorAll('.filter-chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const type = e.currentTarget.getAttribute('data-filter-type');
          const value = e.currentTarget.getAttribute('data-filter-value');
          this.removeFilter(type, value);
        });
      });
    }
    
    // Trigger onChange callback
    if (this.onChange) {
      this.onChange(this.filters, this);
    }
  }

  /**
   * Remove a specific filter
   */
  removeFilter(type, value) {
    if (type === 'status') {
      this.filters.status = this.filters.status.filter(v => v !== value);
      const select = this.container.querySelector('#filter-status');
      if (select) {
        Array.from(select.options).forEach(opt => {
          if (opt.value === value) opt.selected = false;
        });
      }
    } else if (type === 'priority') {
      this.filters.priority = this.filters.priority.filter(v => v !== value);
      const select = this.container.querySelector('#filter-priority');
      if (select) {
        Array.from(select.options).forEach(opt => {
          if (opt.value === value) opt.selected = false;
        });
      }
    } else if (type === 'assignee') {
      this.filters.assignee = this.filters.assignee.filter(v => String(v) !== String(value));
      const select = this.container.querySelector('#filter-assignee');
      if (select) {
        Array.from(select.options).forEach(opt => {
          if (opt.value === value) opt.selected = false;
        });
      }
    } else if (type === 'project') {
      this.filters.project = this.filters.project.filter(v => String(v) !== String(value));
      const select = this.container.querySelector('#filter-project');
      if (select) {
        Array.from(select.options).forEach(opt => {
          if (opt.value === value) opt.selected = false;
        });
      }
    } else if (type === 'search') {
      this.filters.search = '';
      const input = this.container.querySelector('#filter-search');
      if (input) input.value = '';
    }
    
    this.updateFilters();
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.filters = {
      status: [],
      priority: [],
      assignee: [],
      project: [],
      dueDate: null,
      search: ''
    };
    
    // Reset UI
    const statusSelect = this.container.querySelector('#filter-status');
    if (statusSelect) statusSelect.selectedIndex = -1;
    
    const prioritySelect = this.container.querySelector('#filter-priority');
    if (prioritySelect) prioritySelect.selectedIndex = -1;
    
    const assigneeSelect = this.container.querySelector('#filter-assignee');
    if (assigneeSelect) assigneeSelect.selectedIndex = 0;
    
    const projectSelect = this.container.querySelector('#filter-project');
    if (projectSelect) projectSelect.selectedIndex = 0;
    
    const searchInput = this.container.querySelector('#filter-search');
    if (searchInput) searchInput.value = '';
    
    this.updateFilters();
  }

  /**
   * Get current filters
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Set filters
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.render();
    this.attachEventListeners();
  }

  /**
   * Update users or projects without re-rendering
   */
  updateData(data) {
    if (data.users) this.users = data.users;
    if (data.projects) this.projects = data.projects;
    this.render();
    this.attachEventListeners();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterBar;
}

