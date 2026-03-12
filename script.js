/**
 * TaskFlow - Smart To-Do Manager
 * A modern task management app with localStorage persistence
 */

// ============================================
// Configuration & Constants
// ============================================

const STORAGE_KEY = 'taskflow_tasks';
const THEME_KEY = 'taskflow_theme';

// Status options
const STATUSES = {
    PENDING: 'pending',
    STARTED: 'started',
    ALMOST: 'almost',
    COMPLETED: 'completed'
};

// Status display names
const STATUS_LABELS = {
    [STATUSES.PENDING]: 'Pending',
    [STATUSES.STARTED]: 'Started',
    [STATUSES.ALMOST]: 'Almost Done',
    [STATUSES.COMPLETED]: 'Completed'
};

// Status icons
const STATUS_ICONS = {
    [STATUSES.PENDING]: 'ph-clock',
    [STATUSES.STARTED]: 'ph-play',
    [STATUSES.ALMOST]: 'ph-spinner',
    [STATUSES.COMPLETED]: 'ph-check-circle'
};

// ============================================
// State Management
// ============================================

// Initialize tasks array from localStorage or empty array
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Current filter state
let currentDateFilter = null;
let currentSearchQuery = '';

// ============================================
// DOM Elements
// ============================================

// Form elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskTypeRadios = document.getElementsByName('taskType');

// Date picker
const datePicker = document.getElementById('datePicker');
const clearDateBtn = document.getElementById('clearDate');

// Search
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');

// Task containers
const datedTasks = document.getElementById('datedTasks');
const generalTasks = document.getElementById('generalTasks');
const datedEmptyState = document.getElementById('datedEmptyState');
const generalEmptyState = document.getElementById('generalEmptyState');

// Task counts
const datedTaskCount = document.getElementById('datedTaskCount');
const generalTaskCount = document.getElementById('generalTaskCount');

// Stats
const pendingCount = document.getElementById('pendingCount');
const startedCount = document.getElementById('startedCount');
const almostCount = document.getElementById('almostCount');
const completedCount = document.getElementById('completedCount');

// Theme toggle
const themeToggle = document.getElementById('themeToggle');

// Edit modal
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskInput = document.getElementById('editTaskInput');
const editDateInput = document.getElementById('editDateInput');
const editDateGroup = document.getElementById('editDateGroup');
const editStatusRadios = document.getElementsByName('editStatus');
const closeModalBtn = document.getElementById('closeModal');
const cancelEditBtn = document.getElementById('cancelEdit');

// Delete modal
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');

let taskToDelete = null;

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a unique ID for tasks
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date for input (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Save tasks to localStorage
 */
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Get tasks filtered by current search and date
 */
function getFilteredTasks(taskList) {
    let filtered = taskList;
    
    // Filter by search query
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(query)
        );
    }
    
    // Filter by date if set
    if (currentDateFilter) {
        filtered = filtered.filter(task => 
            task.date === currentDateFilter
        );
    }
    
    return filtered;
}

// ============================================
// Task Management Functions
// ============================================

/**
 * Add a new task
 */
function addTask(title, type, date = null) {
    const task = {
        id: generateId(),
        title: title.trim(),
        type: type, // 'dated' or 'general'
        date: type === 'dated' ? date : null,
        status: STATUSES.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    updateStats();
}

/**
 * Update an existing task
 */
function updateTask(id, updates) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        saveTasks();
        renderTasks();
        updateStats();
    }
}

/**
 * Delete a task
 */
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
}

/**
 * Update task status
 */
function updateTaskStatus(id, status) {
    updateTask(id, { status });
}

// ============================================
// Render Functions
// ============================================

/**
 * Create a task card element
 */
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card status-${task.status}`;
    card.dataset.taskId = task.id;
    
    const dateDisplay = task.date ? formatDate(task.date) : '';
    const isDated = task.type === 'dated';
    
    card.innerHTML = `
        <div class="task-header">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" title="Edit task" data-id="${task.id}">
                    <i class="ph ph-pencil"></i>
                </button>
                <button class="task-action-btn delete-btn" title="Delete task" data-id="${task.id}">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        </div>
        <div class="task-meta">
            ${isDated && task.date ? `
                <span class="task-date">
                    <i class="ph ph-calendar"></i>
                    ${dateDisplay}
                </span>
            ` : ''}
            <span class="task-type-badge ${task.type}">
                <i class="ph ${isDated ? 'ph-calendar' : 'ph-star'}"></i>
                ${isDated ? 'Date-wise' : 'General'}
            </span>
        </div>
        <div class="status-selector-inline">
            ${Object.values(STATUSES).map(status => `
                <button class="status-btn-inline ${task.status === status ? 'active ' + status : ''}" 
                        data-task-id="${task.id}" 
                        data-status="${status}">
                    <i class="ph ${STATUS_ICONS[status]}"></i>
                    ${STATUS_LABELS[status]}
                </button>
            `).join('')}
        </div>
    `;
    
    return card;
}

/**
 * Render all tasks
 */
function renderTasks() {
    // Get dated tasks
    const datedTaskList = tasks.filter(t => t.type === 'dated');
    const filteredDated = getFilteredTasks(datedTaskList);
    
    // Get general tasks
    const generalTaskList = tasks.filter(t => t.type === 'general');
    // Don't apply date filter to general tasks (they don't have dates)
    const filteredGeneral = generalTaskList.filter(task => 
        !currentSearchQuery || task.title.toLowerCase().includes(currentSearchQuery.toLowerCase())
    );
    
    // Render dated tasks
    datedTasks.innerHTML = '';
    if (filteredDated.length > 0) {
        filteredDated.forEach(task => {
            datedTasks.appendChild(createTaskCard(task));
        });
        datedEmptyState.classList.add('hidden');
    } else {
        datedEmptyState.classList.remove('hidden');
    }
    datedTaskCount.textContent = filteredDated.length;
    
    // Render general tasks
    generalTasks.innerHTML = '';
    if (filteredGeneral.length > 0) {
        filteredGeneral.forEach(task => {
            generalTasks.appendChild(createTaskCard(task));
        });
        generalEmptyState.classList.add('hidden');
    } else {
        generalEmptyState.classList.remove('hidden');
    }
    generalTaskCount.textContent = filteredGeneral.length;
    
    // Add event listeners to task cards
    attachTaskEventListeners();
}

/**
 * Update statistics
 */
function updateStats() {
    const counts = {
        [STATUSES.PENDING]: 0,
        [STATUSES.STARTED]: 0,
        [STATUSES.ALMOST]: 0,
        [STATUSES.COMPLETED]: 0
    };
    
    tasks.forEach(task => {
        counts[task.status]++;
    });
    
    pendingCount.textContent = counts[STATUSES.PENDING];
    startedCount.textContent = counts[STATUSES.STARTED];
    almostCount.textContent = counts[STATUSES.ALMOST];
    completedCount.textContent = counts[STATUSES.COMPLETED];
}

// ============================================
// Event Listeners
// ============================================

/**
 * Attach event listeners to task cards
 */
function attachTaskEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            openEditModal(taskId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            openDeleteModal(taskId);
        });
    });
    
    // Status buttons
    document.querySelectorAll('.status-btn-inline').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            const status = e.currentTarget.dataset.status;
            updateTaskStatus(taskId, status);
            renderTasks();
        });
    });
}

/**
 * Handle form submission for adding tasks
 */
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = taskInput.value.trim();
    if (!title) return;
    
    // Get selected task type
    let type = 'dated';
    for (const radio of taskTypeRadios) {
        if (radio.checked) {
            type = radio.value;
            break;
        }
    }
    
    // Get date for dated tasks
    const date = type === 'dated' ? datePicker.value : null;
    
    if (type === 'dated' && !date) {
        alert('Please select a date for date-wise tasks');
        return;
    }
    
    addTask(title, type, date);
    taskInput.value = '';
});

/**
 * Handle date picker change
 */
datePicker.addEventListener('change', (e) => {
    currentDateFilter = e.target.value || null;
    renderTasks();
});

/**
 * Clear date filter
 */
clearDateBtn.addEventListener('click', () => {
    datePicker.value = '';
    currentDateFilter = null;
    renderTasks();
});

/**
 * Handle search input
 */
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', !currentSearchQuery);
    renderTasks();
});

/**
 * Clear search
 */
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderTasks();
});

// ============================================
// Modal Functions
// ============================================

/**
 * Open edit modal
 */
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editTaskId.value = task.id;
    editTaskInput.value = task.title;
    editDateInput.value = task.date || '';
    
    // Show/hide date field based on task type
    editDateGroup.style.display = task.type === 'dated' ? 'flex' : 'none';
    
    // Set current status
    for (const radio of editStatusRadios) {
        radio.checked = radio.value === task.status;
    }
    
    editModal.classList.add('active');
}

/**
 * Close edit modal
 */
function closeEditModal() {
    editModal.classList.remove('active');
    editForm.reset();
}

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

/**
 * Handle edit form submission
 */
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = editTaskId.value;
    const title = editTaskInput.value.trim();
    const date = editDateInput.value || null;
    
    if (!title) return;
    
    updateTask(id, { title, date });
    closeEditModal();
});

/**
 * Open delete modal
 */
function openDeleteModal(taskId) {
    taskToDelete = taskId;
    deleteModal.classList.add('active');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    taskToDelete = null;
}

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

/**
 * Confirm delete
 */
confirmDeleteBtn.addEventListener('click', () => {
    if (taskToDelete) {
        const taskIdToDelete = taskToDelete;
        deleteTask(taskIdToDelete);
        // Force close modal with slight delay to ensure DOM updates
        setTimeout(() => {
            deleteModal.classList.remove('active');
            taskToDelete = null;
        }, 50);
    }
});

// Close modals when clicking outside
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        closeDeleteModal();
    }
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteModal();
    }
});

// ============================================
// Theme Management
// ============================================

/**
 * Apply theme
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggle theme
 */
themeToggle.addEventListener('click', () => {
    const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
});

// ============================================
// Initialization
// ============================================

/**
 * Initialize the app
 */
function init() {
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    
    // Set default date to today
    const today = formatDateForInput(new Date());
    datePicker.value = today;
    currentDateFilter = today;
    
    // Render initial state
    renderTasks();
    updateStats();
}

// Start the app
init();
