/**
 * Task Card Component
 * Renders a task card with different variants (compact, standard, expanded)
 */

class TaskCard {
  constructor(task, options = {}) {
    this.task = task;
    this.variant = options.variant || 'standard'; // compact, standard, expanded
    this.onClick = options.onClick || null;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.showActions = options.showActions !== false;
  }

  /**
   * Normalize status to standard format
   */
  normalizeStatus(status) {
    if (!status) return 'todo';
    const statusLower = status.toLowerCase().replace(/_/g, '-');
    const statusMap = {
      'pending': 'todo',
      'completed': 'done',
      'cancelled': 'blocked',
      'in-progress': 'in-progress',
      'inprogress': 'in-progress',
      'todo': 'todo',
      'done': 'done',
      'blocked': 'blocked'
    };
    return statusMap[statusLower] || 'todo';
  }

  /**
   * Normalize priority to standard format
   */
  normalizePriority(priority) {
    if (!priority) return 'medium';
    const priorityLower = priority.toLowerCase();
    const priorityMap = {
      'emergency': 'emergency',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return priorityMap[priorityLower] || 'medium';
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)} ngày trễ`, class: 'overdue' };
      } else if (diffDays === 0) {
        return { text: 'Hôm nay', class: 'upcoming' };
      } else if (diffDays === 1) {
        return { text: 'Ngày mai', class: 'upcoming' };
      } else if (diffDays <= 7) {
        return { text: `${diffDays} ngày nữa`, class: 'upcoming' };
      } else {
        return { text: date.toLocaleDateString('vi-VN'), class: 'normal' };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get assignee initials for avatar
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Render the task card
   */
  render() {
    const status = this.normalizeStatus(this.task.status);
    const priority = this.normalizePriority(this.task.priority);
    const dueDate = this.formatDate(this.task.deadline || this.task.due_date);
    const assigneeName = this.task.assignee_name || this.task.assignee?.full_name || 'Chưa giao';
    const projectName = this.task.project_name || this.task.project?.project_name || null;
    const description = this.task.description || this.task.result_description || '';

    const card = document.createElement('div');
    card.className = `task-card task-card-${this.variant}`;
    card.setAttribute('data-task-id', this.task.id);
    
    if (this.onClick) {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (!e.target.closest('.task-card-actions')) {
          this.onClick(this.task);
        }
      });
    }

    card.innerHTML = `
      ${this.renderPriorityIndicator(priority)}
      <div class="task-card-header">
        <h3 class="task-card-title">${this.escapeHtml(this.task.task_name || this.task.title || 'Untitled Task')}</h3>
        ${this.showActions ? this.renderActions() : ''}
      </div>
      <div class="task-card-body">
        ${description ? `<p class="task-card-description">${this.escapeHtml(description)}</p>` : ''}
        <div class="task-card-meta">
          ${this.renderStatusBadge(status)}
          ${this.renderAssignee(assigneeName)}
          ${projectName ? this.renderProject(projectName) : ''}
          ${dueDate ? this.renderDueDate(dueDate) : ''}
        </div>
        ${this.task.progress_percentage !== undefined ? this.renderProgress() : ''}
        ${this.task.tags && this.task.tags.length > 0 ? this.renderTags() : ''}
      </div>
      <div class="task-card-footer">
        <div class="task-card-footer-left">
          ${this.renderFooterInfo()}
        </div>
        <div class="task-card-footer-right">
          ${this.renderComments()}
          ${this.renderAttachments()}
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Render priority indicator
   */
  renderPriorityIndicator(priority) {
    return `<div class="task-card-priority task-card-priority-${priority}"></div>`;
  }

  /**
   * Render status badge
   */
  renderStatusBadge(status) {
    const statusLabels = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'done': 'Done',
      'blocked': 'Blocked'
    };
    return `<span class="task-card-status task-card-status-${status}">${statusLabels[status] || status}</span>`;
  }

  /**
   * Render assignee
   */
  renderAssignee(name) {
    const initials = this.getInitials(name);
    return `
      <div class="task-card-assignee" title="${this.escapeHtml(name)}">
        <div class="task-card-assignee-avatar">${initials}</div>
        <span class="task-card-assignee-name">${this.escapeHtml(name)}</span>
      </div>
    `;
  }

  /**
   * Render project
   */
  renderProject(name) {
    return `
      <div class="task-card-project" title="${this.escapeHtml(name)}">
        <i class="fas fa-folder task-card-project-icon"></i>
        <span>${this.escapeHtml(name)}</span>
      </div>
    `;
  }

  /**
   * Render due date
   */
  renderDueDate(dueDate) {
    return `
      <div class="task-card-due-date task-card-due-date-${dueDate.class}" title="${dueDate.text}">
        <i class="far fa-calendar-alt"></i>
        <span>${dueDate.text}</span>
      </div>
    `;
  }

  /**
   * Render progress bar
   */
  renderProgress() {
    const progress = this.task.progress_percentage || 0;
    return `
      <div class="task-card-progress">
        <div class="task-card-progress-bar" style="width: ${progress}%"></div>
      </div>
    `;
  }

  /**
   * Render tags
   */
  renderTags() {
    if (!this.task.tags || this.task.tags.length === 0) return '';
    const tags = Array.isArray(this.task.tags) ? this.task.tags : [];
    return `
      <div class="task-card-tags">
        ${tags.slice(0, 3).map(tag => `<span class="task-card-tag">${this.escapeHtml(tag)}</span>`).join('')}
        ${tags.length > 3 ? `<span class="task-card-tag">+${tags.length - 3}</span>` : ''}
      </div>
    `;
  }

  /**
   * Render actions
   */
  renderActions() {
    const editHandler = this.onEdit ? `onclick="event.stopPropagation(); window.handleTaskEdit(this)"` : '';
    const deleteHandler = this.onDelete ? `onclick="event.stopPropagation(); window.handleTaskDelete(this)"` : '';
    
    return `
      <div class="task-card-actions">
        ${this.onEdit ? `<button class="task-card-action-btn" ${editHandler} title="Chỉnh sửa">
          <i class="fas fa-edit"></i>
        </button>` : ''}
        ${this.onDelete ? `<button class="task-card-action-btn" ${deleteHandler} title="Xóa">
          <i class="fas fa-trash"></i>
        </button>` : ''}
      </div>
    `;
  }

  /**
   * Render footer info
   */
  renderFooterInfo() {
    const created = this.task.created_at ? new Date(this.task.created_at).toLocaleDateString('vi-VN') : '';
    return created ? `<span>Đã tạo: ${created}</span>` : '';
  }

  /**
   * Render comments count
   */
  renderComments() {
    const count = this.task.comments_count || 0;
    if (count === 0) return '';
    return `
      <div class="task-card-comments" title="${count} bình luận">
        <i class="far fa-comment"></i>
        <span>${count}</span>
      </div>
    `;
  }

  /**
   * Render attachments count
   */
  renderAttachments() {
    const count = this.task.attachments_count || 0;
    if (count === 0) return '';
    return `
      <div class="task-card-attachments" title="${count} tệp đính kèm">
        <i class="far fa-paperclip"></i>
        <span>${count}</span>
      </div>
    `;
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
  module.exports = TaskCard;
}

