// Login credentials (in real app, this would be handled by backend)
const users = {
    'employee@company.com': { password: 'emp123', role: 'employee', name: 'John Doe', type: 'full-time' },
    'intern@company.com': { password: 'int123', role: 'employee', name: 'Alice Brown', type: 'intern' },
    'trainee@company.com': { password: 'trn123', role: 'employee', name: 'Bob White', type: 'trainee' },
    // 'manager@company.com': { password: 'mgr123', role: 'manager', name: 'Jane Smith', type: 'full-time' },
    'admin@company.com': { password: 'admin123', role: 'admin', name: 'Admin User', type: 'full-time' }
};

let currentUser = null;
let currentRole = null;
let currentUserType = null; // To store full-time, intern, trainee

// Indian National Holidays 2024 (Provided in problem, keeping as is)
const indianHolidays = [
    { date: '2024-01-01', name: 'New Year\'s Day' },
    { date: '2024-01-26', name: 'Republic Day' },
    { date: '2024-03-08', name: 'Holi' },
    { date: '2024-03-29', name: 'Good Friday' },
    { date: '2024-04-11', name: 'Eid ul-Fitr' },
    { date: '2024-04-14', name: 'Baisakhi' },
    { date: '2024-04-17', name: 'Ram Navami' },
    { date: '2024-05-01', name: 'Labour Day' },
    { date: '2024-05-23', name: 'Buddha Purnima' },
    { date: '2024-06-17', name: 'Eid ul-Adha' },
    { date: '2024-08-15', name: 'Independence Day' },
    { date: '2024-08-26', name: 'Janmashtami' },
    { date: '2024-09-07', name: 'Ganesh Chaturthi' },
    { date: '2024-10-02', name: 'Gandhi Jayanti' },
    { date: '2024-10-12', name: 'Dussehra' },
    { date: '2024-11-01', name: 'Diwali' },
    { date: '2024-11-15', name: 'Guru Nanak Jayanti' },
    { date: '2024-12-25', name: 'Christmas Day' }
];

// Global variable for the leave system
let leaveSystem = null;

// Login functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        // Validate credentials
        if (users[email] && users[email].password === password && users[email].role === role) {
            currentUser = users[email].name;
            currentRole = role;
            currentUserType = users[email].type; // Store user type
            
            // Hide login page and show app
            loginPage.style.display = 'none';
            appContainer.classList.add('active');
            
            // Update user info in navigation
            document.getElementById('current-user').textContent = currentUser;
            document.getElementById('current-role-badge').textContent = role;
            
            // Initialize the leave management system
            leaveSystem = new LeaveManagementSystem();
            
            // Setup role-based navigation
            setupRoleBasedNavigation();
            
            showNotification('Login successful!', 'success');
        } else {
            showNotification('Invalid credentials. Please check your email, password and role.', 'error');
        }
    });
});

// Logout functionality
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        currentRole = null;
        currentUserType = null;
        
        // Hide app and show login page
        document.getElementById('app-container').classList.remove('active');
        document.getElementById('login-page').style.display = 'flex';
        
        // Reset login form
        document.getElementById('login-form').reset();
        
        showNotification('Logged out successfully!', 'info');
    }
}

// Setup role-based navigation
function setupRoleBasedNavigation() {
    const applyNav = document.getElementById('apply-nav');
    const holidaysNav = document.getElementById('holidays-nav');
    const adminNav = document.getElementById('admin-nav');
    
    // Hide/show navigation items based on role
    if (currentRole === 'manager') {
        applyNav.style.display = 'none'; // Managers cannot apply for leave
        holidaysNav.style.display = 'flex'; // Managers can view holidays
        adminNav.style.display = 'flex'; // Managers have admin access
    } else if (currentRole === 'admin') {
        applyNav.style.display = 'none'; // Admins cannot apply for leave
        holidaysNav.style.display = 'flex'; // Admins can view holidays
        adminNav.style.display = 'flex'; // Admins have admin access
    } else { // Employee or Intern/Trainee
        applyNav.style.display = 'flex';
        holidaysNav.style.display = 'flex';
        adminNav.style.display = 'none';
    }

    // Hide/show academic document upload based on leave type selection
    const leaveTypeSelect = document.getElementById('leave-type');
    const academicDocGroup = document.getElementById('academic-doc-group');
    if (leaveTypeSelect) {
        leaveTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'academic') {
                academicDocGroup.style.display = 'block';
            } else {
                academicDocGroup.style.display = 'none';
            }
        });
    }
}

// HRMS Leave Management System
class LeaveManagementSystem {
    constructor() {
        this.leaveRequests = JSON.parse(localStorage.getItem('leaveRequests')) || [];
        this.holidays = JSON.parse(localStorage.getItem('holidays')) || [...indianHolidays];
        this.userLeaveBalances = JSON.parse(localStorage.getItem('userLeaveBalances')) || {}; // Store balances per user
        this.maxLopDaysPerYear = 10; // Configurable max LOP days
        this.leaveCarryForwardCap = 5; // Unused leaves carry forward cap

        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSampleData();
        this.initializeUserBalances(); // Initialize or update current user's balance
        this.accrueLeaves(); // Accrue leaves monthly
        this.convertNegativeBalanceToLOP(); // Convert negative balance to LOP
        this.updateDashboard();
        this.renderCalendar();
        this.updateLeaveHistory();
        this.loadPendingRequests();
        this.loadQuotaManagement();
        this.renderHolidayList();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(e.target.closest('.nav-link').dataset.section);
            });
        });

        // Leave form
        const leaveForm = document.getElementById('leave-form');
        if (leaveForm) {
            leaveForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitLeaveRequest();
            });
        }

        // Date calculation
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        if (startDate) startDate.addEventListener('change', () => this.calculateDuration());
        if (endDate) endDate.addEventListener('change', () => this.calculateDuration());

        // Save draft
        const saveDraft = document.getElementById('save-draft');
        if (saveDraft) saveDraft.addEventListener('click', () => this.saveDraft());

        // Filters
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const monthFilter = document.getElementById('month-filter');
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterHistory());
        if (typeFilter) typeFilter.addEventListener('change', () => this.filterHistory());
        if (monthFilter) monthFilter.addEventListener('change', () => this.filterHistory());

        // Admin tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showAdminTab(e.target.dataset.tab);
            });
        });

        // Calendar navigation
        const prevMonth = document.getElementById('prev-month');
        const nextMonth = document.getElementById('next-month');
        if (prevMonth) prevMonth.addEventListener('click', () => this.changeMonth(-1));
        if (nextMonth) nextMonth.addEventListener('click', () => this.changeMonth(1));

        // Admin calendar navigation
        const adminPrevMonth = document.getElementById('admin-prev-month');
        const adminNextMonth = document.getElementById('admin-next-month');
        if (adminPrevMonth) adminPrevMonth.addEventListener('click', () => this.changeAdminMonth(-1));
        if (adminNextMonth) adminNextMonth.addEventListener('click', () => this.changeAdminMonth(1));

        // Holiday form
        const holidayForm = document.getElementById('holiday-form');
        if (holidayForm) {
            holidayForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addHoliday();
            });
        }

        // Modal close
        const closeModal = document.querySelector('.close');
        if (closeModal) closeModal.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    loadSampleData() {
        // Sample leave requests (ensure `employee` field is present)
        if (this.leaveRequests.length === 0) {
            this.leaveRequests = [
                {
                    id: 'LR001',
                    employee: 'John Doe',
                    type: 'sick',
                    startDate: '2024-01-15',
                    endDate: '2024-01-17',
                    duration: '3 business days',
                    reason: 'Fever and cold',
                    status: 'approved',
                    appliedDate: '2024-01-12',
                    approvedBy: 'Jane Smith'
                },
                {
                    id: 'LR002',
                    employee: 'John Doe',
                    type: 'vacation',
                    startDate: '2024-07-28',
                    endDate: '2024-07-30',
                    duration: '3 business days',
                    reason: 'Family vacation',
                    status: 'pending',
                    appliedDate: '2024-07-20',
                    approvedBy: ''
                },
                {
                    id: 'LR003',
                    employee: 'John Doe',
                    type: 'casual',
                    startDate: '2024-01-08',
                    endDate: '2024-01-10',
                    duration: '3 business days',
                    reason: 'Personal work',
                    status: 'rejected',
                    appliedDate: '2024-01-05',
                    approvedBy: 'Jane Smith',
                    rejectionReason: 'Insufficient notice period'
                },
                {
                    id: 'LR004',
                    employee: 'Alice Brown',
                    type: 'wfh',
                    startDate: '2024-07-26',
                    endDate: '2024-07-26',
                    duration: '1 business day',
                    reason: 'Remote work setup',
                    status: 'approved',
                    appliedDate: '2024-07-25',
                    approvedBy: 'Jane Smith'
                },
                {
                    id: 'LR005',
                    employee: 'Bob White',
                    type: 'comp-off',
                    startDate: '2024-07-29',
                    endDate: '2024-07-29',
                    duration: '1 business day',
                    reason: 'Compensatory off for weekend work',
                    status: 'pending',
                    appliedDate: '2024-07-24',
                    approvedBy: ''
                },
                {
                    id: 'LR006',
                    employee: 'John Doe',
                    type: 'lop',
                    startDate: '2024-07-01',
                    endDate: '2024-07-02',
                    duration: '2 business days',
                    reason: 'Exceeded leave balance',
                    status: 'lop',
                    appliedDate: '2024-07-01',
                    approvedBy: 'System'
                }
            ];
            localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
        }
    }

    initializeUserBalances() {
        const allUsers = Object.values(users);
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth() + 1; // 1-indexed

        allUsers.forEach(user => {
            if (!this.userLeaveBalances[user.name]) {
                this.userLeaveBalances[user.name] = {
                    sick: { total: 0, used: 0, carryForward: 0 },
                    casual: { total: 0, used: 0, carryForward: 0 },
                    vacation: { total: 0, used: 0, carryForward: 0 },
                    academic: { total: 0, used: 0 },
                    wfh: { total: 0, used: 0 }, // WFH treated as a separate quota
                    'comp-off': { total: 0, used: 0 }, // Comp Off treated as a separate quota
                    lop: { used: 0, annualUsed: 0 }, // LOP tracking
                    lastAccrualMonth: 0, // Track last accrual month for initial setup
                    lastAccrualYear: 0
                };
            }

            // Set initial quotas based on user type if not already set (e.g., on first login)
            const balance = this.userLeaveBalances[user.name];
            if (user.type === 'full-time') {
                if (balance.sick.total === 0) balance.sick.total = 12;
                if (balance.casual.total === 0) balance.casual.total = 15;
                if (balance.vacation.total === 0) balance.vacation.total = 20;
                if (balance.academic.total === 0) balance.academic.total = 5;
                if (balance.wfh.total === 0) balance.wfh.total = 12; // Example WFH quota for full-time
                if (balance['comp-off'].total === 0) balance['comp-off'].total = 5; // Example Comp Off quota
            } else if (user.type === 'intern' || user.type === 'trainee') {
                // Interns/Trainees earn leave monthly (e.g., 0.5 Sick + 0.5 Casual)
                if (balance.sick.total === 0) balance.sick.total = 0; // Will be accrued
                if (balance.casual.total === 0) balance.casual.total = 0; // Will be accrued
                if (balance.vacation.total === 0) balance.vacation.total = 0;
                if (balance.academic.total === 0) balance.academic.total = 0;
                if (balance.wfh.total === 0) balance.wfh.total = 0;
                if (balance['comp-off'].total === 0) balance['comp-off'].total = 0;
            }

            // If it's a new user or a new year/month, set lastAccrualMonth/Year to trigger accrual
            if (!balance.lastAccrualMonth || balance.lastAccrualYear < currentYear) {
                balance.lastAccrualMonth = 0; // Reset to 0 to accrue for current year from Jan
                balance.lastAccrualYear = currentYear;
            }
        });
        localStorage.setItem('userLeaveBalances', JSON.stringify(this.userLeaveBalances));
    }


    accrueLeaves() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-indexed
        const currentYear = today.getFullYear();

        Object.keys(this.userLeaveBalances).forEach(userName => {
            const user = Object.values(users).find(u => u.name === userName);
            if (!user) return; // Should not happen

            let userBalance = this.userLeaveBalances[userName];
            let lastAccrualMonth = userBalance.lastAccrualMonth || 0;
            let lastAccrualYear = userBalance.lastAccrualYear || currentYear;

            // Handle year change and full annual accrual for full-time employees at the start of the year
            if (lastAccrualYear < currentYear) {
                // Carry forward unused leaves
                userBalance.sick.carryForward = Math.min(this.leaveCarryForwardCap, userBalance.sick.total - userBalance.sick.used);
                userBalance.casual.carryForward = Math.min(this.leaveCarryForwardCap, userBalance.casual.total - userBalance.casual.used);
                userBalance.vacation.carryForward = Math.min(this.leaveCarryForwardCap, userBalance.vacation.total - userBalance.vacation.used);
                
                // Reset used leaves for the new year
                userBalance.sick.used = 0;
                userBalance.casual.used = 0;
                userBalance.vacation.used = 0;
                userBalance.academic.used = 0;
                userBalance.wfh.used = 0;
                userBalance['comp-off'].used = 0;
                userBalance.lop.annualUsed = 0; // Reset annual LOP


                if (user.type === 'full-time') {
                    // Re-add full annual quota for full-time employees
                    userBalance.sick.total = 12 + userBalance.sick.carryForward;
                    userBalance.casual.total = 15 + userBalance.casual.carryForward;
                    userBalance.vacation.total = 20 + userBalance.vacation.carryForward;
                    userBalance.academic.total = 5;
                    userBalance.wfh.total = 12;
                    userBalance['comp-off'].total = 5;
                } else if (user.type === 'intern' || user.type === 'trainee') {
                    // For interns/trainees, total is based on accrual, carry forward is applied
                    userBalance.sick.total = userBalance.sick.carryForward;
                    userBalance.casual.total = userBalance.casual.carryForward;
                    userBalance.vacrual.total = userBalance.vacation.carryForward; // No new vacation for interns/trainees, only carry forward
                    userBalance.academic.total = 0;
                    userBalance.wfh.total = 0;
                    userBalance['comp-off'].total = 0;
                }
                
                // Reset carry forward after adding to total
                userBalance.sick.carryForward = 0;
                userBalance.casual.carryForward = 0;
                userBalance.vacation.carryForward = 0;

                lastAccrualMonth = 0; // Reset month to accrue from January for the new year
            }

            // Monthly accrual for interns and trainees
            if (user.type === 'intern' || user.type === 'trainee') {
                for (let m = lastAccrualMonth + 1; m <= currentMonth; m++) {
                    if (m > 12) break; // Should not happen with correct lastAccrualMonth logic
                    userBalance.sick.total += 0.5;
                    userBalance.casual.total += 0.5;
                }
            }
            userBalance.lastAccrualMonth = currentMonth;
            userBalance.lastAccrualYear = currentYear;
        });

        localStorage.setItem('userLeaveBalances', JSON.stringify(this.userLeaveBalances));
    }


    convertNegativeBalanceToLOP() {
        const currentUserBalance = this.userLeaveBalances[currentUser];
        if (!currentUserBalance) return;

        const leaveTypes = ['sick', 'casual', 'vacation', 'academic', 'wfh', 'comp-off'];
        let lopInCurrentMonth = 0;

        leaveTypes.forEach(type => {
            if (currentUserBalance[type]) {
                const remaining = currentUserBalance[type].total - currentUserBalance[type].used;
                if (remaining < 0) {
                    const lopDays = Math.abs(remaining);
                    currentUserBalance[type].used = currentUserBalance[type].total; // Set used to total, effectively zeroing out remaining balance
                    lopInCurrentMonth += lopDays; // Add to LOP for this month
                    showNotification(`Leave balance for ${this.formatLeaveType(type)} was negative. ${lopDays} day(s) converted to LOP.`, 'warning');
                }
            }
        });

        if (lopInCurrentMonth > 0) {
            currentUserBalance.lop.used += lopInCurrentMonth;
            currentUserBalance.lop.annualUsed += lopInCurrentMonth;

            // Add a new LOP request for tracking
            this.leaveRequests.push({
                id: 'LOP' + Date.now(),
                employee: currentUser,
                type: 'lop',
                startDate: new Date().toISOString().split('T')[0], // Today's date
                endDate: new Date().toISOString().split('T')[0],
                duration: `${lopInCurrentMonth} day(s)`,
                reason: 'Negative leave balance conversion',
                status: 'lop',
                appliedDate: new Date().toISOString().split('T')[0],
                approvedBy: 'System'
            });
            localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
        }

        // Check overall annual LOP limit
        if (currentUserBalance.lop.annualUsed > this.maxLopDaysPerYear) {
            showNotification(`You have exceeded the maximum annual Loss of Pay (LOP) limit of ${this.maxLopDaysPerYear} days.`, 'error');
        }

        localStorage.setItem('userLeaveBalances', JSON.stringify(this.userLeaveBalances));
    }


    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Special handling for sections
        if (sectionId === 'dashboard') {
            this.updateDashboard();
        } else if (sectionId === 'history') {
            this.updateLeaveHistory();
        } else if (sectionId === 'admin') {
            this.showAdminTab('pending-requests'); // Default to pending requests
        } else if (sectionId === 'holidays') {
            this.renderCalendar();
            this.renderHolidayList();
        }
    }

    updateDashboard() {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (!dashboardGrid) return;

        // If not an employee, show a simplified manager/admin overview
        if (currentRole !== 'employee') {
            dashboardGrid.innerHTML = `
                <div class="balance-card" style="grid-column: 1 / -1;">
                    <div class="card-header">
                        <i class="fas fa-users"></i>
                        <h3>Team Overview</h3>
                    </div>
                    <div class="card-content">
                        <p>Welcome, ${currentUser}!</p>
                        <p>Access admin functions to manage leave requests, holidays, and quotas.</p>
                        <br>
                        <h4>Pending Requests: ${this.leaveRequests.filter(r => r.status === 'pending').length}</h4>
                        <h4>Total Holidays: ${this.holidays.length}</h4>
                    </div>
                </div>
            `;
            return;
        }

        const userBalance = this.userLeaveBalances[currentUser];
        if (!userBalance) return;

        // Update leave balances for current employee
        const leaveTypes = ['sick', 'casual', 'vacation', 'academic', 'wfh', 'comp-off'];
        leaveTypes.forEach(type => {
            const balanceData = userBalance[type];
            if (balanceData) {
                const remaining = balanceData.total - balanceData.used;
                const percentage = balanceData.total > 0 ? (remaining / balanceData.total) * 100 : 0;

                const balanceElement = document.getElementById(`${type}-balance`);
                const totalElement = document.getElementById(`${type}-total`);
                const progressBar = document.getElementById(`${type}-progress`);

                if (balanceElement) balanceElement.textContent = Math.max(0, remaining).toFixed(1); // Show remaining as 0 if negative for display
                if (totalElement) totalElement.textContent = `/ ${balanceData.total.toFixed(1)} days`;
                if (progressBar) progressBar.style.width = `${Math.max(0, percentage)}%`; // Ensure progress doesn't go below 0%
            }
        });

        // Update LOP balance
        const lopBalanceElement = document.getElementById('lop-balance');
        const lopTotalElement = document.getElementById('lop-total');
        const lopProgressBar = document.getElementById('lop-progress');
        
        if (lopBalanceElement) lopBalanceElement.textContent = userBalance.lop.annualUsed;
        if (lopTotalElement) lopTotalElement.textContent = `/ ${this.maxLopDaysPerYear} days`;
        if (lopProgressBar) {
            const lopPercentage = (userBalance.lop.annualUsed / this.maxLopDaysPerYear) * 100;
            lopProgressBar.style.width = `${Math.min(100, lopPercentage)}%`; // Cap LOP progress at 100%
            lopProgressBar.style.background = 'linear-gradient(90deg, #dc3545, #ff7b8b)'; // Red gradient for LOP
        }


        // Update recent requests (filtered by current user if employee)
        this.updateRecentRequests();
    }

    updateRecentRequests() {
        const container = document.getElementById('recent-requests');
        if (!container) return;

        let requestsToDisplay = this.leaveRequests;
        if (currentRole === 'employee') {
            requestsToDisplay = requestsToDisplay.filter(req => req.employee === currentUser);
        }

        const recentRequests = requestsToDisplay.slice().sort((a,b) => new Date(b.appliedDate) - new Date(a.appliedDate)).slice(0, 5); // Sort by applied date and take 5 most recent

        container.innerHTML = recentRequests.map(request => `
            <div class="activity-item">
                <div class="activity-info">
                    <h4>${this.formatLeaveType(request.type)} - ${request.duration}</h4>
                    <p>${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)}</p>
                    ${currentRole !== 'employee' ? `<p><strong>Employee:</strong> ${request.employee}</p>` : ''}
                </div>
                <span class="status-badge status-${request.status}">${request.status}</span>
            </div>
        `).join('');

        if (recentRequests.length === 0) {
            container.innerHTML = '<p class="text-center">No recent activity.</p>';
        }
    }

    calculateDuration() {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const durationElement = document.getElementById('duration');

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (end < start) {
                durationElement.value = 'Invalid date range';
                showNotification('End date cannot be before start date.', 'error');
                return;
            }

            let businessDays = 0;
            let currentDate = new Date(start);
            
            while (currentDate <= end) {
                const dayOfWeek = currentDate.getDay();
                const dateString = currentDate.toISOString().split('T')[0];
                const isHoliday = this.holidays.some(holiday => holiday.date === dateString);

                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) { // Not Sunday, Saturday, or a holiday
                    businessDays++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            durationElement.value = `${businessDays} business days`;
        } else {
            durationElement.value = 'Auto-calculated';
        }
    }

    async submitLeaveRequest() {
        const leaveType = document.getElementById('leave-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const durationText = document.getElementById('duration').value;
        const reason = document.getElementById('reason').value;
        const emergencyContact = document.getElementById('emergency-contact').value;
        const managerEmail = document.getElementById('manager-email').value;
        const academicDoc = document.getElementById('academic-doc');

        if (!leaveType || !startDate || !endDate || !reason) {
            showNotification('Please fill all required fields (Leave Type, Start Date, End Date, Reason).', 'error');
            return;
        }

        const durationDays = parseFloat(durationText.split(' ')[0]);
        if (isNaN(durationDays) || durationDays <= 0) {
            showNotification('Invalid duration calculated. Please check dates.', 'error');
            return;
        }

        const startDateTime = new Date(startDate + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
        const endDateTime = new Date(endDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day

        // Validation for overlapping leaves
        if (this.validateOverlappingLeaves(startDate, endDate)) {
            showNotification('Your leave request overlaps with an existing approved or pending leave.', 'error');
            return;
        }

        // Validation for holidays/weekends (already handled in duration calculation)
        // Re-check just in case the duration calculation was bypassed
        const { includesWeekend, includesHoliday } = this.validateHolidayWeekend(startDate, endDate);
        if (durationDays === 0 && (includesWeekend || includesHoliday)) {
             showNotification('Your leave duration is 0 business days because it falls entirely on weekends or holidays. Please adjust your dates.', 'warning');
             return;
        }


        // Specific validations based on leave type
        const now = new Date();
        const cutoffTime = 10; // 10 AM cutoff for same-day sick leave

        if (leaveType === 'sick') {
            if (startDate === today.toISOString().split('T')[0] && now.getHours() >= cutoffTime) {
                showNotification(`Sick leave for today can only be applied before ${cutoffTime} AM.`, 'error');
                return;
            }
        } else if (leaveType === 'casual' || leaveType === 'vacation') {
            const advanceDaysRequired = 3; // Example: 3 working days in advance
            let futureBusinessDays = 0;
            let tempDate = new Date(today);
            tempDate.setDate(today.getDate() + 1); // Start checking from tomorrow

            while (futureBusinessDays < advanceDaysRequired) {
                if (tempDate.getTime() >= startDateTime.getTime()) break; // Stop if we reach start date
                const dayOfWeek = tempDate.getDay();
                const dateString = tempDate.toISOString().split('T')[0];
                const isHoliday = this.holidays.some(holiday => holiday.date === dateString);

                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
                    futureBusinessDays++;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }

            if (startDateTime.getTime() <= today.getTime() || futureBusinessDays < advanceDaysRequired) {
                showNotification(`${this.formatLeaveType(leaveType)} must be applied at least ${advanceDaysRequired} business day(s) in advance.`, 'error');
                return;
            }
        } else if (leaveType === 'academic') {
            if (!academicDoc || !academicDoc.files || academicDoc.files.length === 0) {
                showNotification('Academic Leave requires a supporting document.', 'error');
                return;
            }
            // In a real app, you would upload and store this document.
            // For now, we'll just check if a file is selected.
        }

        const userBalance = this.userLeaveBalances[currentUser];
        if (!userBalance) {
            showNotification('User leave balance not found. Please log in again.', 'error');
            return;
        }

        let finalLeaveType = leaveType;
        let isLOP = false;

        // Check leave balance for types that consume quota
        if (['sick', 'casual', 'vacation', 'academic', 'wfh', 'comp-off'].includes(leaveType)) {
            const available = userBalance[leaveType].total - userBalance[leaveType].used;
            if (durationDays > available) {
                const lopDays = durationDays - available;
                // Check if total LOP for the year will exceed the limit
                if (userBalance.lop.annualUsed + lopDays > this.maxLopDaysPerYear) {
                    showNotification(`Applying this leave would exceed your maximum annual Loss of Pay (LOP) limit of ${this.maxLopDaysPerYear} days. Remaining LOP for this year: ${this.maxLopDaysPerYear - userBalance.lop.annualUsed} days.`, 'error');
                    return;
                }
                isLOP = true;
                finalLeaveType = 'lop'; // Mark as LOP if balance exceeded
                showNotification(`${this.formatLeaveType(leaveType)} balance is insufficient. ${lopDays} day(s) will be treated as Loss of Pay (LOP).`, 'warning');
            }
        }

        const formData = {
            id: 'LR' + String(this.leaveRequests.length + 1).padStart(3, '0'),
            employee: currentUser,
            type: finalLeaveType,
            originalType: leaveType, // Keep original type for reference if it becomes LOP
            startDate: startDate,
            endDate: endDate,
            duration: durationText,
            reason: reason,
            emergencyContact: emergencyContact,
            managerEmail: managerEmail,
            status: 'pending', // All new requests start as pending
            appliedDate: new Date().toISOString().split('T')[0],
            approvedBy: '',
            rejectionReason: '',
            // academicDocPath: academicDoc.files.length > 0 ? academicDoc.files[0].name : '' // Placeholder for document path
        };

        this.leaveRequests.push(formData);
        localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests)); // Save to local storage
        
        // Reset form
        document.getElementById('leave-form').reset();
        document.getElementById('academic-doc-group').style.display = 'none';

        showNotification('Leave request submitted successfully!', 'success');
        
        // Send email notification (placeholder)
        this.sendEmailNotification(formData, 'applied');

        this.updateDashboard();
        this.updateLeaveHistory();
    }

    saveDraft() {
        const formData = {
            type: document.getElementById('leave-type').value,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            reason: document.getElementById('reason').value,
            emergencyContact: document.getElementById('emergency-contact').value,
            managerEmail: document.getElementById('manager-email').value
        };

        // In a real app, this would save to localStorage or backend
        // For now, it's a simple notification
        showNotification('Draft saved successfully!', 'info');
    }

    updateLeaveHistory() {
        const tbody = document.getElementById('history-tbody');
        if (!tbody) return;

        let requestsToDisplay = this.leaveRequests;

        // Filter by current user if employee
        if (currentRole === 'employee') {
            requestsToDisplay = requestsToDisplay.filter(req => req.employee === currentUser);
        }

        const filteredRequests = this.filterRequests(requestsToDisplay);

        tbody.innerHTML = filteredRequests.map(request => `
            <tr>
                <td>${request.id}</td>
                <td>${this.formatLeaveType(request.originalType || request.type)}</td>
                <td>${this.formatDate(request.startDate)}</td>
                <td>${this.formatDate(request.endDate)}</td>
                <td>${request.duration}</td>
                <td><span class="status-badge status-${request.status}">${request.status}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="leaveSystem.viewRequest('${request.id}')">View</button>
                    ${request.status === 'pending' && currentRole === 'employee' && new Date(request.startDate) > new Date() ? `<button class="action-btn btn-cancel" onclick="leaveSystem.cancelRequest('${request.id}')">Cancel</button>` : ''}
                </td>
            </tr>
        `).join('');

        if (filteredRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No leave history found for the selected filters.</td></tr>';
        }
    }

    filterRequests(requests) {
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const monthFilter = document.getElementById('month-filter');

        return requests.filter(request => {
            if (statusFilter && statusFilter.value && request.status !== statusFilter.value) return false;
            if (typeFilter && typeFilter.value) {
                const effectiveType = request.originalType || request.type; // Use originalType if exists
                if (effectiveType !== typeFilter.value) return false;
            }
            if (monthFilter && monthFilter.value) {
                const requestMonth = request.startDate.substring(0, 7);
                if (requestMonth !== monthFilter.value) return false;
            }
            return true;
        });
    }

    filterHistory() {
        this.updateLeaveHistory();
    }

    viewRequest(requestId) {
        const request = this.leaveRequests.find(r => r.id === requestId);
        if (request) {
            const modalBody = document.getElementById('modal-body');
            modalBody.innerHTML = `
                <h2>Leave Request Details</h2>
                <div class="request-details">
                    <p><strong>Request ID:</strong> ${request.id}</p>
                    <p><strong>Employee:</strong> ${request.employee}</p>
                    <p><strong>Leave Type:</strong> ${this.formatLeaveType(request.originalType || request.type)}</p>
                    <p><strong>Duration:</strong> ${request.duration}</p>
                    <p><strong>Start Date:</strong> ${this.formatDate(request.startDate)}</p>
                    <p><strong>End Date:</strong> ${this.formatDate(request.endDate)}</p>
                    <p><strong>Reason:</strong> ${request.reason}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${request.status}">${request.status}</span></p>
                    <p><strong>Applied Date:</strong> ${this.formatDate(request.appliedDate)}</p>
                    ${request.approvedBy ? `<p><strong>Approved By:</strong> ${request.approvedBy}</p>` : ''}
                    ${request.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${request.rejectionReason}</p>` : ''}
                    ${request.emergencyContact ? `<p><strong>Emergency Contact:</strong> ${request.emergencyContact}</p>` : ''}
                    ${request.managerEmail ? `<p><strong>Manager Email:</strong> ${request.managerEmail}</p>` : ''}
                    ${request.type === 'academic' && request.academicDocPath ? `<p><strong>Supporting Document:</strong> <a href="${request.academicDocPath}" target="_blank">View Document</a></p>` : ''}
                </div>
            `;
            document.getElementById('request-modal').style.display = 'block';
        }
    }

    cancelRequest(requestId) {
        const request = this.leaveRequests.find(r => r.id === requestId);
        // Employees can cancel a leave before its start date.
        if (request && request.status === 'pending' && new Date(request.startDate) > new Date()) {
            if (confirm('Are you sure you want to cancel this leave request?')) {
                request.status = 'cancelled';
                // Refund leave balance if it was approved and consumed (though pending means it hasn't consumed yet)
                // For simplicity, we assume pending requests haven't affected balance.
                // If the design changes such that pending affects balance, refund logic needed here.

                localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
                this.updateLeaveHistory();
                this.updateDashboard();
                showNotification('Leave request cancelled successfully!', 'info');
                this.sendEmailNotification(request, 'cancelled');
            }
        } else if (request && new Date(request.startDate) <= new Date()) {
            showNotification('Cannot cancel a leave request on or after its start date.', 'error');
        } else {
            showNotification('Only pending leave requests can be cancelled.', 'error');
        }
    }

    closeModal() {
        document.getElementById('request-modal').style.display = 'none';
    }

    // Admin Panel Functions
    showAdminTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }

        // Load specific tab content
        if (tabId === 'pending-requests') {
            this.loadPendingRequests();
        } else if (tabId === 'holiday-management') {
            this.renderAdminCalendar();
            this.renderHolidayList();
        } else if (tabId === 'quota-management') {
            this.loadQuotaManagement();
        } else if (tabId === 'user-management') {
            // User management is a backend function in a real app.
            // For this prototype, it's a descriptive message.
        }
    }

    loadPendingRequests() {
        const container = document.getElementById('pending-requests-grid');
        if (!container) return;

        const pendingRequests = this.leaveRequests.filter(r => r.status === 'pending');

        container.innerHTML = pendingRequests.map(request => `
            <div class="request-card">
                <div class="request-header">
                    <h3>${request.id} - ${this.formatLeaveType(request.originalType || request.type)} by ${request.employee}</h3>
                    <div class="request-actions">
                        <button class="action-btn btn-approve" onclick="leaveSystem.approveRequest('${request.id}')">Approve</button>
                        <button class="action-btn btn-reject" onclick="leaveSystem.rejectRequest('${request.id}')">Reject</button>
                    </div>
                </div>
                <p><strong>Duration:</strong> ${request.duration}</p>
                <p><strong>Dates:</strong> ${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)}</p>
                <p><strong>Reason:</strong> ${request.reason}</p>
                <p><strong>Applied:</strong> ${this.formatDate(request.appliedDate)}</p>
                ${request.emergencyContact ? `<p><strong>Emergency Contact:</strong> ${request.emergencyContact}</p>` : ''}
                ${request.managerEmail ? `<p><strong>Manager Email:</strong> ${request.managerEmail}</p>` : ''}
            </div>
        `).join('');

        if (pendingRequests.length === 0) {
            container.innerHTML = '<p class="text-center">No pending requests found.</p>';
        }
    }

    approveRequest(requestId) {
        const request = this.leaveRequests.find(r => r.id === requestId);
        if (request) {
            request.status = 'approved';
            request.approvedBy = currentUser;
            
            // Update leave balance for the employee who applied
            const employeeBalance = this.userLeaveBalances[request.employee];
            if (employeeBalance) {
                const leaveTypeForBalance = request.originalType || request.type; // Use original type for balance consumption

                if (['sick', 'casual', 'vacation', 'academic', 'wfh', 'comp-off'].includes(leaveTypeForBalance)) {
                    const durationDays = parseFloat(request.duration.split(' ')[0]);
                    if (employeeBalance[leaveTypeForBalance]) {
                        const available = employeeBalance[leaveTypeForBalance].total - employeeBalance[leaveTypeForBalance].used;
                        if (durationDays > available) {
                            // If it's being approved and was initially LOP, or becomes LOP now
                            const lopDays = durationDays - available;
                            employeeBalance[leaveTypeForBalance].used = employeeBalance[leaveTypeForBalance].total; // Consume all available
                            employeeBalance.lop.used += lopDays; // Add to LOP for this request
                            employeeBalance.lop.annualUsed += lopDays; // Add to annual LOP
                            showNotification(`Approved ${request.id}. ${lopDays} day(s) will be treated as LOP for ${request.employee}.`, 'warning');
                        } else {
                            employeeBalance[leaveTypeForBalance].used += durationDays;
                        }
                    }
                }
            }
            localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
            localStorage.setItem('userLeaveBalances', JSON.stringify(this.userLeaveBalances));

            this.loadPendingRequests();
            this.updateDashboard();
            showNotification(`Leave request ${requestId} approved successfully!`, 'success');
            this.sendEmailNotification(request, 'approved');
        }
    }

    rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            const request = this.leaveRequests.find(r => r.id === requestId);
            if (request) {
                request.status = 'rejected';
                request.approvedBy = currentUser;
                request.rejectionReason = reason;
                
                localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
                this.loadPendingRequests();
                showNotification(`Leave request ${requestId} rejected.`, 'warning');
                this.sendEmailNotification(request, 'rejected');
            }
        }
    }

    // Calendar Functions
    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('current-month-year');
        
        if (!calendarGrid || !monthYear) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        monthYear.textContent = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today for comparison

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const currentDateInLoop = new Date(year, month, day);
            const currentDateStr = currentDateInLoop.toISOString().split('T')[0];
            
            // Check if it's today
            if (currentDateInLoop.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Check if it's a holiday
            const holiday = this.holidays.find(h => h.date === currentDateStr);
            if (holiday) {
                dayElement.classList.add('holiday');
                dayElement.title = holiday.name;
            }

            // Check for approved leaves on this day for the current user (if employee) or all (if manager/admin)
            const approvedLeavesOnThisDay = this.leaveRequests.filter(req => {
                if (req.status === 'approved' || req.status === 'lop' || req.type === 'wfh' || req.type === 'comp-off') {
                    if (currentRole === 'employee' && req.employee !== currentUser) return false; // Filter by current user
                    const reqStart = new Date(req.startDate);
                    const reqEnd = new Date(req.endDate);
                    reqStart.setHours(0,0,0,0);
                    reqEnd.setHours(0,0,0,0);
                    return currentDateInLoop >= reqStart && currentDateInLoop <= reqEnd;
                }
                return false;
            });

            if (approvedLeavesOnThisDay.length > 0) {
                let leaveTooltip = approvedLeavesOnThisDay.map(l => `${this.formatLeaveType(l.originalType || l.type)} by ${l.employee}`).join('\n');
                dayElement.title = dayElement.title ? `${dayElement.title}\n${leaveTooltip}` : leaveTooltip;
                dayElement.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; // Light blue for leaves
            }


            calendarGrid.appendChild(dayElement);
        }
    }

    renderAdminCalendar() {
        const calendarGrid = document.getElementById('admin-calendar-grid');
        const monthYear = document.getElementById('admin-current-month-year');
        
        if (!calendarGrid || !monthYear) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        monthYear.textContent = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today for comparison

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const currentDateInLoop = new Date(year, month, day);
            const currentDateStr = currentDateInLoop.toISOString().split('T')[0];
            
            // Check if it's today
            if (currentDateInLoop.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Check if it's a holiday
            const holiday = this.holidays.find(h => h.date === currentDateStr);
            if (holiday) {
                dayElement.classList.add('holiday');
                dayElement.title = holiday.name;
            }

            // Check for all approved leaves on this day for admin calendar
            const approvedLeavesOnThisDay = this.leaveRequests.filter(req => {
                if (req.status === 'approved' || req.status === 'lop' || req.type === 'wfh' || req.type === 'comp-off') {
                    const reqStart = new Date(req.startDate);
                    const reqEnd = new Date(req.endDate);
                    reqStart.setHours(0,0,0,0);
                    reqEnd.setHours(0,0,0,0);
                    return currentDateInLoop >= reqStart && currentDateInLoop <= reqEnd;
                }
                return false;
            });

            if (approvedLeavesOnThisDay.length > 0) {
                let leaveTooltip = approvedLeavesOnThisDay.map(l => `${this.formatLeaveType(l.originalType || l.type)} by ${l.employee}`).join('\n');
                dayElement.title = dayElement.title ? `${dayElement.title}\n${leaveTooltip}` : leaveTooltip;
                dayElement.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; // Light blue for leaves
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    changeAdminMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderAdminCalendar();
    }

    addHoliday() {
        const date = document.getElementById('holiday-date').value;
        const name = document.getElementById('holiday-name').value;

        if (date && name) {
            // Check if holiday already exists
            const existingHoliday = this.holidays.find(h => h.date === date);
            if (existingHoliday) {
                showNotification('Holiday already exists for this date!', 'warning');
                return;
            }

            this.holidays.push({ date, name });
            this.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
            localStorage.setItem('holidays', JSON.stringify(this.holidays)); // Save holidays
            
            document.getElementById('holiday-form').reset();
            this.renderAdminCalendar();
            this.renderHolidayList();
            showNotification(`Holiday "${name}" added successfully!`, 'success');
        } else {
            showNotification('Please provide both date and name for the holiday.', 'error');
        }
    }

    renderHolidayList() {
        const container = document.getElementById('holiday-list-container');
        if (!container) return;

        // Sort holidays by date
        const sortedHolidays = [...this.holidays].sort((a, b) => new Date(a.date) - new Date(b.date));

        container.innerHTML = sortedHolidays.map(holiday => `
            <div class="holiday-item">
                <span class="holiday-date">${this.formatDate(holiday.date)}</span>
                <span class="holiday-name">${holiday.name}</span>
            </div>
        `).join('');

        if (sortedHolidays.length === 0) {
            container.innerHTML = '<p class="text-center">No holidays found.</p>';
        }
    }

    // Quota Management
    loadQuotaManagement() {
        const tbody = document.getElementById('quota-tbody');
        if (!tbody) return;

        // Get all users from the predefined 'users' object
        const allUsers = Object.keys(users).map(email => users[email]);

        tbody.innerHTML = allUsers.map(user => {
            const userName = user.name;
            const userRole = user.role;
            const userType = user.type;

            const userBalance = this.userLeaveBalances[userName] || {}; // Get existing balance or empty object

            // Default values if not set, these should be managed by accrual/admin changes
            const sickTotal = userBalance.sick ? userBalance.sick.total : 0;
            const casualTotal = userBalance.casual ? userBalance.casual.total : 0;
            const vacationTotal = userBalance.vacation ? userBalance.vacation.total : 0;
            const academicTotal = userBalance.academic ? userBalance.academic.total : 0;
            const wfhTotal = userBalance.wfh ? userBalance.wfh.total : 0;
            const compOffTotal = userBalance['comp-off'] ? userBalance['comp-off'].total : 0;
            const lopMax = this.maxLopDaysPerYear; // Global for now, could be per user

            return `
                <tr>
                    <td>${userName}</td>
                    <td>${userRole} (${userType})</td>
                    <td><input type="number" class="quota-input" value="${sickTotal}" min="0" data-employee="${userName}" data-type="sick"></td>
                    <td><input type="number" class="quota-input" value="${casualTotal}" min="0" data-employee="${userName}" data-type="casual"></td>
                    <td><input type="number" class="quota-input" value="${vacationTotal}" min="0" data-employee="${userName}" data-type="vacation"></td>
                    <td><input type="number" class="quota-input" value="${academicTotal}" min="0" data-employee="${userName}" data-type="academic"></td>
                    <td><input type="number" class="quota-input" value="${wfhTotal}" min="0" data-employee="${userName}" data-type="wfh"></td>
                    <td><input type="number" class="quota-input" value="${compOffTotal}" min="0" data-employee="${userName}" data-type="comp-off"></td>
                    <td><input type="number" class="quota-input" value="${lopMax}" min="0" data-employee="${userName}" data-type="max-lop"></td>
                    <td>
                        <button class="action-btn btn-edit" onclick="leaveSystem.updateQuota('${userName}')">Update</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners for input changes to dynamically update values (though not persisted until 'Update' clicked)
        document.querySelectorAll('.quota-input').forEach(input => {
            input.addEventListener('change', (e) => {
                // This 'change' listener can trigger a validation or temporary state update if needed.
                // The actual persistence happens when the 'Update' button is clicked for that row.
            });
        });
    }

    updateQuota(employeeName) {
        const row = document.querySelector(`#quota-tbody tr td[data-employee="${employeeName}"]`)?.closest('tr');
        if (!row) return;

        const inputs = row.querySelectorAll('.quota-input');
        const newQuotas = {};
        inputs.forEach(input => {
            const type = input.dataset.type;
            let value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                value = 0; // Default to 0 if invalid
                input.value = 0; // Correct input display
            }
            newQuotas[type] = value;
        });

        // Update the user's leave balances
        if (this.userLeaveBalances[employeeName]) {
            const balance = this.userLeaveBalances[employeeName];
            if (newQuotas.sick !== undefined) balance.sick.total = newQuotas.sick;
            if (newQuotas.casual !== undefined) balance.casual.total = newQuotas.casual;
            if (newQuotas.vacation !== undefined) balance.vacation.total = newQuotas.vacation;
            if (newQuotas.academic !== undefined) balance.academic.total = newQuotas.academic;
            if (newQuotas.wfh !== undefined) balance.wfh.total = newQuotas.wfh;
            if (newQuotas['comp-off'] !== undefined) balance['comp-off'].total = newQuotas['comp-off'];
            // If we make max LOP per user, update here
            // if (newQuotas['max-lop'] !== undefined) this.maxLopDaysPerYear = newQuotas['max-lop']; 
        }

        localStorage.setItem('userLeaveBalances', JSON.stringify(this.userLeaveBalances));
        showNotification(`Leave quotas updated for ${employeeName}!`, 'success');
        this.updateDashboard(); // Update dashboard if current user's quotas changed
    }

    // Utility Functions
    formatLeaveType(type) {
        const typeMap = {
            sick: 'Sick Leave',
            casual: 'Casual Leave',
            vacation: 'Vacation',
            academic: 'Academic Leave',
            wfh: 'Work From Home',
            'comp-off': 'Comp Off',
            lop: 'Loss of Pay' // Added LOP
        };
        return typeMap[type] || type;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Validation Functions
    validateOverlappingLeaves(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        // Filter requests by current user if employee, otherwise all users for admin/manager
        const relevantRequests = currentRole === 'employee' 
            ? this.leaveRequests.filter(req => req.employee === currentUser) 
            : this.leaveRequests;

        return relevantRequests.some(request => {
            // Only check against approved or pending leaves
            if (request.status === 'rejected' || request.status === 'cancelled') return false;
            
            const reqStart = new Date(request.startDate);
            const reqEnd = new Date(request.endDate);
            reqStart.setHours(0,0,0,0);
            reqEnd.setHours(0,0,0,0);
            
            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            return (start <= reqEnd && end >= reqStart);
        });
    }

    validateHolidayWeekend(startDate, endDate) {
        // Check if leave includes holidays/weekends
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        
        let includesWeekend = false;
        let includesHoliday = false;

        let currentDate = new Date(start);
        currentDate.setHours(0,0,0,0);
        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                includesWeekend = true;
            }

            const dateString = currentDate.toISOString().split('T')[0];
            if (this.holidays.some(holiday => holiday.date === dateString)) {
                includesHoliday = true;
            }

            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0,0,0,0);
        }

        return { includesWeekend, includesHoliday };
    }

    sendEmailNotification(request, action) {
        // Placeholder for sending email notifications
        const hrEmail = 'leaves@domain.com';
        let subject = '';
        let body = '';

        if (action === 'applied') {
            subject = `New Leave Request from ${request.employee}: ${this.formatLeaveType(request.originalType || request.type)}`;
            body = `A new leave request has been submitted by ${request.employee}.\n\n` +
                   `Details:\n` +
                   `  Type: ${this.formatLeaveType(request.originalType || request.type)}\n` +
                   `  Dates: ${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)}\n` +
                   `  Duration: ${request.duration}\n` +
                   `  Reason: ${request.reason}\n` +
                   `  Status: Pending\n\n` +
                   `Please log in to the HRMS portal to review and approve/reject: [HRMS Portal URL]`;
        } else if (action === 'approved') {
            subject = `Your Leave Request ${request.id} has been Approved`;
            body = `Dear ${request.employee},\n\nYour leave request (${request.id}) for ${this.formatLeaveType(request.originalType || request.type)} from ${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)} has been approved by ${request.approvedBy}.\n\n` +
                   `Status: Approved\n\n` +
                   `Thank you.`;
        } else if (action === 'rejected') {
            subject = `Your Leave Request ${request.id} has been Rejected`;
            body = `Dear ${request.employee},\n\nYour leave request (${request.id}) for ${this.formatLeaveType(request.originalType || request.type)} from ${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)} has been rejected by ${request.approvedBy}.\n\n` +
                   `Status: Rejected\n` +
                   `Reason: ${request.rejectionReason || 'No reason provided.'}\n\n` +
                   `Please contact your manager for more details.`;
        } else if (action === 'cancelled') {
            subject = `Leave Request ${request.id} has been Cancelled`;
            body = `Dear ${request.employee},\n\nYour leave request (${request.id}) for ${this.formatLeaveType(request.originalType || request.type)} from ${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)} has been successfully cancelled.\n\n` +
                   `Status: Cancelled\n\n` +
                   `Thank you.`;
        }
        
        // In a real application, you would use a backend service (e.g., Node.js with Nodemailer, Python with SMTP library)
        // to send actual emails. This is a client-side simulation.
        console.log(`--- Email Notification ---`);
        console.log(`To: ${request.managerEmail || hrEmail}`); // Send to manager or HR
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${body}`);
        console.log(`--------------------------`);
        // Example: You might use an API call here:
        // fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to: hrEmail, subject, body }) });
    }
}

// Notification function
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    // Add click to dismiss
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date for date inputs to today
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput) startDateInput.min = today;
    if (endDateInput) endDateInput.min = today;
    
    // Show login page initially
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').classList.remove('active');
});

// Export for potential module usage (if this was a module)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LeaveManagementSystem, showNotification, users };
}