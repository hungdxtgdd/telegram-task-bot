/**
 * Kanban Board Component
 * Manages drag & drop functionality for Kanban board
 */

class KanbanBoard {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.columns = {
      'todo': null,
      'in-progress': null,
      'done': null,
      'blocked': null
    };
    this.sortableInstances = {};
    this.onTaskMove = options.onTaskMove || null;
    this.onTaskDrop = options.onTaskDrop || null;
    
    this.initialize();
  }

  /**
   * Initialize Kanban board
   */
  initialize() {
    if (!this.container) return;
    
    // Get column containers (desktop only - mobile doesn't need drag & drop)
    this.columns.todo = this.container.querySelector('#todoTasks');
    this.columns['in-progress'] = this.container.querySelector('#inProgressTasks');
    this.columns.done = this.container.querySelector('#doneTasks');
    this.columns.blocked = this.container.querySelector('#blockedTasks');
    
    // Only initialize SortableJS for desktop columns (not mobile)
    // Mobile columns don't need drag & drop, they use tabs
    Object.keys(this.columns).forEach(status => {
      const column = this.columns[status];
      if (column && !column.closest('.kanban-columns-mobile')) {
        // Only initialize if not in mobile container
        this.initializeColumn(column, status);
      }
    });
  }

  /**
   * Initialize SortableJS for a column
   */
  initializeColumn(column, status) {
    this.sortableInstances[status] = new Sortable(column, {
      group: 'kanban-tasks', // Allow dragging between columns
      animation: 150,
      ghostClass: 'task-card-ghost',
      chosenClass: 'task-card-chosen',
      dragClass: 'task-card-drag',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      forceFallback: false,
      
      onStart: (evt) => {
        // Add visual feedback when drag starts
        evt.item.classList.add('dragging');
        this.onDragStart(evt, status);
      },
      
      onEnd: (evt) => {
        // Remove visual feedback when drag ends
        evt.item.classList.remove('dragging');
        
        const newStatus = this.getStatusFromElement(evt.to);
        const oldStatus = this.getStatusFromElement(evt.from);
        
        if (newStatus && oldStatus && newStatus !== oldStatus) {
          // Task moved to different column
          const taskId = evt.item.getAttribute('data-task-id');
          if (taskId) {
            this.handleTaskMove(taskId, oldStatus, newStatus, evt);
          }
        }
        
        this.onDragEnd(evt, oldStatus, newStatus);
      },
      
      onAdd: (evt) => {
        // Task added to this column
        const taskId = evt.item.getAttribute('data-task-id');
        if (taskId) {
          this.onTaskAdded(evt, status);
        }
        // Update column count
        this.updateColumnCount(status);
      },
      
      onRemove: (evt) => {
        // Task removed from this column
        this.onTaskRemoved(evt, status);
        // Update column count
        const oldStatus = this.getStatusFromElement(evt.from);
        if (oldStatus) {
          this.updateColumnCount(oldStatus);
        }
      }
    });
  }

  /**
   * Get status from column element
   */
  getStatusFromElement(element) {
    if (!element) return null;
    
    // Check if element is a column container
    if (element.id === 'todoTasks') return 'todo';
    if (element.id === 'inProgressTasks') return 'in-progress';
    if (element.id === 'doneTasks') return 'done';
    if (element.id === 'blockedTasks') return 'blocked';
    
    // Check parent elements
    const parent = element.closest('[id$="Tasks"]');
    if (parent) {
      if (parent.id === 'todoTasks') return 'todo';
      if (parent.id === 'inProgressTasks') return 'in-progress';
      if (parent.id === 'doneTasks') return 'done';
      if (parent.id === 'blockedTasks') return 'blocked';
    }
    
    return null;
  }

  /**
   * Handle task move
   */
  handleTaskMove(taskId, oldStatus, newStatus, evt) {
    if (this.onTaskMove) {
      this.onTaskMove({
        taskId: taskId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex,
        element: evt.item
      });
    }
    
    if (this.onTaskDrop) {
      this.onTaskDrop({
        taskId: taskId,
        oldStatus: oldStatus,
        newStatus: newStatus,
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex,
        element: evt.item
      });
    }
  }

  /**
   * Drag start callback
   */
  onDragStart(evt, status) {
    // Add column highlight
    const column = evt.from.closest('.kanban-column');
    if (column) {
      column.classList.add('drag-source');
    }
  }

  /**
   * Drag end callback
   */
  onDragEnd(evt, oldStatus, newStatus) {
    // Remove column highlights
    const columns = this.container.querySelectorAll('.kanban-column');
    columns.forEach(col => {
      col.classList.remove('drag-source', 'drag-target');
    });
  }

  /**
   * Task added callback
   */
  onTaskAdded(evt, status) {
    // Update column count
    this.updateColumnCount(status);
  }

  /**
   * Task removed callback
   */
  onTaskRemoved(evt, status) {
    // Update column count
    this.updateColumnCount(status);
  }

  /**
   * Update column count badge
   */
  updateColumnCount(status) {
    const column = this.columns[status];
    if (!column) return;
    
    const count = column.children.length;
    const countElement = document.getElementById(`${status}Count`);
    if (countElement) {
      countElement.textContent = count;
    }
  }

  /**
   * Destroy Sortable instances
   */
  destroy() {
    Object.values(this.sortableInstances).forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    });
    this.sortableInstances = {};
  }

  /**
   * Reinitialize after DOM changes
   */
  reinitialize() {
    this.destroy();
    this.initialize();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanBoard;
}

