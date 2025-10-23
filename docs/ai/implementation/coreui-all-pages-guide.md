# CoreUI Implementation Guide for All Pages

## Complete Page Inventory

### Authentication Pages
- **login.html** - Main login page
- **test-login.html** - Login testing page

### Management Pages (New UI)
- **okrs-management-new.html** - OKRs management (new)
- **projects-management-new.html** - Projects management (new)
- **tasks-management-new.html** - Tasks management (new)
- **users-management-new.html** - Users management (new)

### Management Pages (Enhanced UI)
- **okrs-enhanced.html** - OKRs management (enhanced)
- **projects-enhanced.html** - Projects management (enhanced)
- **tasks-enhanced.html** - Tasks management (enhanced)

### Legacy Management Pages
- **users-management.html** - Users management (legacy)
- **users-simple.html** - Users management (simple)

### Dashboard Pages
- **test-dashboard.html** - Main dashboard
- **test-simple-dashboard.html** - Simple dashboard

### Monitoring & Test Pages
- **monitoring.html** - System monitoring
- **test-auth.html** - Authentication testing
- **test-delete.html** - Delete functionality testing
- **test-user.html** - User functionality testing

## Implementation Strategy

### Phase 1: Core Layout Implementation

#### 1.1 Create Base CoreUI Layout
```html
<!-- templates/coreui-layout.html -->
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
        
        <!-- Main Content -->
        <div class="main">
            <!-- Header -->
            <header class="header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-6">
                            <button class="sidebar-toggler">
                                <i class="cil-menu"></i>
                            </button>
                        </div>
                        <div class="col-6 text-right">
                            <span class="text-muted">Welcome, Admin</span>
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Content -->
            <main class="content">
                <!-- Page content will be inserted here -->
                <div id="page-content">
                    <!-- Dynamic content -->
                </div>
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

### Phase 2: Page-Specific Implementation

#### 2.1 Authentication Pages

##### login.html - CoreUI Login
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Task Management System</title>
    <link rel="stylesheet" href="/assets/css/coreui.min.css">
    <link rel="stylesheet" href="/assets/css/coreui-icons.min.css">
</head>
<body class="app flex-row align-items-center">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card-group">
                    <div class="card p-4">
                        <div class="card-body">
                            <h1>Login</h1>
                            <p class="text-muted">Sign In to your account</p>
                            <form id="loginForm">
                                <div class="input-group mb-3">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">
                                            <i class="cil-user"></i>
                                        </span>
                                    </div>
                                    <input class="form-control" type="text" placeholder="Username" name="username">
                                </div>
                                <div class="input-group mb-4">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">
                                            <i class="cil-lock-locked"></i>
                                        </span>
                                    </div>
                                    <input class="form-control" type="password" placeholder="Password" name="password">
                                </div>
                                <div class="row">
                                    <div class="col-6">
                                        <button class="btn btn-primary px-4" type="submit">Login</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="/assets/js/coreui.bundle.min.js"></script>
</body>
</html>
```

#### 2.2 Management Pages Template

##### CoreUI Management Page Template
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OKRs Management - Task Management System</title>
    <link rel="stylesheet" href="/assets/css/coreui.min.css">
    <link rel="stylesheet" href="/assets/css/coreui-icons.min.css">
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
                <div class="container-fluid">
                    <!-- Breadcrumb -->
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item active">OKRs</li>
                        </ol>
                    </nav>
                    
                    <!-- Page Title -->
                    <div class="row">
                        <div class="col-12">
                            <h1>OKRs Management</h1>
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
                    <div class="row">
                        <div class="col-sm-6 col-lg-3">
                            <div class="card text-white bg-primary">
                                <div class="card-body">
                                    <div class="text-value-lg" id="totalOKRs">0</div>
                                    <div>Total OKRs</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6 col-lg-3">
                            <div class="card text-white bg-success">
                                <div class="card-body">
                                    <div class="text-value-lg" id="activeOKRs">0</div>
                                    <div>Active OKRs</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6 col-lg-3">
                            <div class="card text-white bg-warning">
                                <div class="card-body">
                                    <div class="text-value-lg" id="atRiskOKRs">0</div>
                                    <div>At Risk</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6 col-lg-3">
                            <div class="card text-white bg-info">
                                <div class="card-body">
                                    <div class="text-value-lg" id="completedOKRs">0</div>
                                    <div>Completed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filter Bar -->
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="input-group">
                                        <div class="input-group-prepend">
                                            <span class="input-group-text">
                                                <i class="cil-magnifying-glass"></i>
                                            </span>
                                        </div>
                                        <input type="text" class="form-control" placeholder="Search OKRs..." id="searchInput">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-control" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="achieved">Achieved</option>
                                        <option value="at-risk">At Risk</option>
                                        <option value="dropped">Dropped</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-control" id="quarterFilter">
                                        <option value="">All Quarters</option>
                                        <option value="Q1">Q1 2024</option>
                                        <option value="Q2">Q2 2024</option>
                                        <option value="Q3">Q3 2024</option>
                                        <option value="Q4">Q4 2024</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-primary" onclick="addOKR()">
                                        <i class="cil-plus"></i> Add OKR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-header">
                            <strong>OKRs List</strong>
                        </div>
                        <div class="card-body">
                            <table class="table table-responsive-sm">
                                <thead>
                                    <tr>
                                        <th>Objective</th>
                                        <th>Status</th>
                                        <th>Progress</th>
                                        <th>Quarter</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="okrsTableBody">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <script src="/assets/js/coreui.bundle.min.js"></script>
    <script src="/assets/js/charts.min.js"></script>
    <script src="/assets/js/custom.js"></script>
</body>
</html>
```

#### 2.3 Dashboard Pages

##### test-dashboard.html - CoreUI Dashboard
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Task Management System</title>
    <link rel="stylesheet" href="/assets/css/coreui.min.css">
    <link rel="stylesheet" href="/assets/css/coreui-icons.min.css">
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
                <div class="container-fluid">
                    <!-- Page Title -->
                    <div class="row">
                        <div class="col-12">
                            <h1>Dashboard</h1>
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
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
                    
                    <!-- Charts Row -->
                    <div class="row">
                        <div class="col-sm-6 col-lg-3">
                            <div class="card">
                                <div class="card-header">
                                    <strong>Progress Overview</strong>
                                </div>
                                <div class="card-body">
                                    <canvas id="progressChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6 col-lg-3">
                            <div class="card">
                                <div class="card-header">
                                    <strong>Recent Activity</strong>
                                </div>
                                <div class="card-body">
                                    <div class="timeline">
                                        <!-- Timeline content -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <script src="/assets/js/coreui.bundle.min.js"></script>
    <script src="/assets/js/charts.min.js"></script>
    <script src="/assets/js/custom.js"></script>
</body>
</html>
```

## Implementation Checklist

### Phase 1: Core Setup
- [ ] Download CoreUI Admin template
- [ ] Extract assets to /assets/ folder
- [ ] Create base layout template
- [ ] Setup responsive grid system
- [ ] Implement sidebar navigation
- [ ] Add header component

### Phase 2: Authentication Pages
- [ ] Update login.html with CoreUI
- [ ] Update test-login.html with CoreUI
- [ ] Implement CoreUI forms
- [ ] Add responsive design
- [ ] Test authentication flow

### Phase 3: Management Pages (New UI)
- [ ] Update okrs-management-new.html
- [ ] Update projects-management-new.html
- [ ] Update tasks-management-new.html
- [ ] Update users-management-new.html
- [ ] Implement CoreUI data tables
- [ ] Add analytics widgets

### Phase 4: Management Pages (Enhanced UI)
- [ ] Update okrs-enhanced.html
- [ ] Update projects-enhanced.html
- [ ] Update tasks-enhanced.html
- [ ] Implement CoreUI components
- [ ] Maintain existing functionality

### Phase 5: Legacy Pages
- [ ] Update users-management.html
- [ ] Update users-simple.html
- [ ] Implement CoreUI components
- [ ] Test backward compatibility

### Phase 6: Dashboard Pages
- [ ] Update test-dashboard.html
- [ ] Update test-simple-dashboard.html
- [ ] Add CoreUI dashboard widgets
- [ ] Implement analytics charts

### Phase 7: Monitoring & Test Pages
- [ ] Update monitoring.html
- [ ] Update test-auth.html
- [ ] Update test-delete.html
- [ ] Update test-user.html
- [ ] Implement CoreUI components

## Quality Assurance

### Testing Checklist
- [ ] All pages load correctly
- [ ] Responsive design works on all devices
- [ ] All CRUD operations functional
- [ ] Authentication system intact
- [ ] API endpoints working
- [ ] Cross-browser compatibility
- [ ] Performance optimized
- [ ] Accessibility standards met

### Performance Metrics
- [ ] Page load time < 3 seconds
- [ ] Core Web Vitals within thresholds
- [ ] Mobile performance score > 90
- [ ] No JavaScript errors
- [ ] No CSS conflicts

## Success Criteria
- [ ] All 17 pages updated with CoreUI
- [ ] Consistent design across all pages
- [ ] All existing functionality preserved
- [ ] Improved user experience
- [ ] Mobile-responsive design
- [ ] Professional appearance
- [ ] Easy maintenance and updates
