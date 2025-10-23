/* CoreUI Admin Template - JavaScript */

// Sidebar Toggle
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggler = document.querySelector('.sidebar-toggler');
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    
    if (sidebarToggler && sidebar) {
        sidebarToggler.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            main.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Mobile sidebar toggle
    const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    if (mobileSidebarToggle && sidebar) {
        mobileSidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(event.target) && !sidebarToggler.contains(event.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
});

// Form Validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Show Alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Confirm Dialog
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Loading State
function setLoadingState(element, loading = true) {
    if (loading) {
        element.disabled = true;
        element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    } else {
        element.disabled = false;
        element.innerHTML = element.getAttribute('data-original-text') || 'Submit';
    }
}

// Table Actions
function initTableActions() {
    const editButtons = document.querySelectorAll('.btn-edit');
    const deleteButtons = document.querySelectorAll('.btn-delete');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            // Implement edit functionality
            console.log('Edit item:', id);
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            
            confirmAction(`Bạn có chắc chắn muốn xóa "${name}"?`, () => {
                // Implement delete functionality
                console.log('Delete item:', id);
            });
        });
    });
}

// Search Functionality
function initSearch() {
    const searchInput = document.querySelector('#searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

// Filter Functionality
function initFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            const filterValue = this.value;
            const filterType = this.getAttribute('data-filter');
            const rows = document.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const cell = row.querySelector(`[data-${filterType}]`);
                if (cell) {
                    const cellValue = cell.getAttribute(`data-${filterType}`);
                    if (filterValue === '' || cellValue === filterValue) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    });
}

// Clear Filters
function clearFilters() {
    const searchInput = document.querySelector('#searchInput');
    const filterSelects = document.querySelectorAll('.filter-select');
    
    if (searchInput) searchInput.value = '';
    
    filterSelects.forEach(select => {
        select.value = '';
    });
    
    // Show all rows
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
}

// Initialize all functionality
document.addEventListener('DOMContentLoaded', function() {
    initTableActions();
    initSearch();
    initFilters();
    
    // Add clear filters button functionality
    const clearFiltersBtn = document.querySelector('#clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
});

// Utility Functions
const CoreUI = {
    showAlert,
    confirmAction,
    setLoadingState,
    validateForm,
    clearFilters
};

// Export for global use
window.CoreUI = CoreUI;
