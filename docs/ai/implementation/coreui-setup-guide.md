# CoreUI Setup Implementation Guide

## Step 1: Download CoreUI Assets

### Download CoreUI Admin Template
```bash
# Download from CoreUI website
wget https://coreui.io/demo/4.0/free/coreui-free-bootstrap-admin-template.zip
unzip coreui-free-bootstrap-admin-template.zip
```

### Extract Required Files
```
assets/
├── css/
│   ├── coreui.min.css
│   ├── coreui-icons.min.css
│   └── custom.css
├── js/
│   ├── coreui.bundle.min.js
│   ├── charts.min.js
│   └── custom.js
└── img/
    └── coreui-icons/
```

## Step 2: Create Base Layout

### Main Layout Template
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Management System</title>
    
    <!-- CoreUI CSS -->
    <link rel="stylesheet" href="/assets/css/coreui.min.css">
    <link rel="stylesheet" href="/assets/css/coreui-icons.min.css">
    <link rel="stylesheet" href="/assets/css/custom.css">
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Sidebar content -->
        </div>
        
        <!-- Main Content -->
        <div class="main">
            <!-- Header -->
            <header class="header">
                <!-- Header content -->
            </header>
            
            <!-- Content -->
            <main class="content">
                <!-- Page content -->
            </main>
        </div>
    </div>
    
    <!-- CoreUI JS -->
    <script src="/assets/js/coreui.bundle.min.js"></script>
    <script src="/assets/js/charts.min.js"></script>
    <script src="/assets/js/custom.js"></script>
</body>
</html>
```

## Step 3: Implement Sidebar Navigation

### Sidebar Structure
```html
<div class="sidebar">
    <nav class="sidebar-nav">
        <ul class="nav">
            <li class="nav-item">
                <a class="nav-link" href="/dashboard">
                    <i class="nav-icon cil-speedometer"></i>
                    Dashboard
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/okrs">
                    <i class="nav-icon cil-target"></i>
                    OKRs
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/projects">
                    <i class="nav-icon cil-folder"></i>
                    Projects
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/tasks">
                    <i class="nav-icon cil-task"></i>
                    Tasks
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/users">
                    <i class="nav-icon cil-people"></i>
                    Users
                </a>
            </li>
        </ul>
    </nav>
</div>
```

## Step 4: Create Dashboard Widgets

### Statistics Widgets
```html
<div class="row">
    <div class="col-sm-6 col-lg-3">
        <div class="card text-white bg-primary">
            <div class="card-body">
                <div class="text-value-lg">9.823</div>
                <div>Total OKRs</div>
            </div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="card text-white bg-info">
            <div class="card-body">
                <div class="text-value-lg">89.9%</div>
                <div>Active Projects</div>
            </div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="card text-white bg-warning">
            <div class="card-body">
                <div class="text-value-lg">1.200</div>
                <div>Pending Tasks</div>
            </div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-3">
        <div class="card text-white bg-danger">
            <div class="card-body">
                <div class="text-value-lg">12</div>
                <div>Overdue Items</div>
            </div>
        </div>
    </div>
</div>
```

### Charts Widget
```html
<div class="card">
    <div class="card-header">
        <strong>Progress Overview</strong>
    </div>
    <div class="card-body">
        <canvas id="progressChart"></canvas>
    </div>
</div>
```

## Step 5: Implement Data Tables

### CoreUI Data Table
```html
<div class="card">
    <div class="card-header">
        <strong>OKRs Management</strong>
        <div class="card-header-actions">
            <button class="btn btn-primary" onclick="addOKR()">
                <i class="cil-plus"></i> Add OKR
            </button>
        </div>
    </div>
    <div class="card-body">
        <table class="table table-responsive-sm">
            <thead>
                <tr>
                    <th>Objective</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="okrsTableBody">
                <!-- Dynamic content -->
            </tbody>
        </table>
    </div>
</div>
```

## Step 6: Custom CSS Integration

### Custom Styles
```css
/* Custom.css */
:root {
    --primary-color: #321fdb;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --warning-color: #ffc107;
    --danger-color: #dc3545;
}

/* Custom card styles */
.custom-card {
    border: 1px solid #e3e6f0;
    border-radius: 0.35rem;
    box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
}

/* Custom button styles */
.btn-custom {
    border-radius: 0.35rem;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
    }
    
    .sidebar.show {
        transform: translateX(0);
    }
}
```

## Step 7: JavaScript Integration

### CoreUI JavaScript Setup
```javascript
// custom.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize CoreUI components
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggler = document.querySelector('.sidebar-toggler');
    
    // Sidebar toggle
    if (sidebarToggler) {
        sidebarToggler.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Initialize charts
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
    
    // Initialize data tables
    initDataTables();
});

function initCharts() {
    // Progress chart
    const ctx = document.getElementById('progressChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Not Started'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: ['#28a745', '#ffc107', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

function initDataTables() {
    // Initialize CoreUI data tables
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        // Add CoreUI table enhancements
        table.classList.add('table-striped');
    });
}
```

## Step 8: Migration Strategy

### Phase 1: Layout Migration
1. Replace current layout with CoreUI layout
2. Implement sidebar navigation
3. Add header and breadcrumbs
4. Test basic navigation

### Phase 2: Component Migration
1. Replace custom cards with CoreUI cards
2. Implement CoreUI data tables
3. Add CoreUI forms and modals
4. Test all CRUD operations

### Phase 3: Enhancement
1. Add analytics widgets
2. Implement advanced filtering
2. Optimize for mobile
3. Performance testing

## Testing Checklist

### Functionality Tests
- [ ] All CRUD operations work
- [ ] Authentication system intact
- [ ] API endpoints functional
- [ ] Data persistence verified

### UI/UX Tests
- [ ] Responsive design works
- [ ] Navigation is intuitive
- [ ] Loading performance acceptable
- [ ] Cross-browser compatibility

### Integration Tests
- [ ] CoreUI components load correctly
- [ ] Custom CSS doesn't conflict
- [ ] JavaScript functions properly
- [ ] Charts and widgets display
