// Modern Todo App Script

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// PWA Install
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

// Always show install button on supported browsers
if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
    installBtn.style.display = 'block';
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

installBtn.addEventListener('click', () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    } else {
        alert('To install the app, look for the install icon in your browser\'s address bar or use the "Add to Home Screen" option in your browser menu.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-btn');
    const taskForm = document.getElementById('task-form');
    const form = document.getElementById('form');
    const cancelBtn = document.getElementById('cancel-btn');
    const upcomingTasks = document.getElementById('upcoming-tasks');
    const historyTasks = document.getElementById('history-tasks');
    const formTitle = document.getElementById('form-title');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const themeToggle = document.getElementById('theme-toggle');

    const filterSelect = document.getElementById('filter-select');
    const fromLabel = document.getElementById('from-label');
    const fromDateInput = document.getElementById('from-date');
    const toLabel = document.getElementById('to-label');
    const toDateInput = document.getElementById('to-date');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let editingId = null;
    let currentTab = 'upcoming';
    let currentFilter = 'all';

    // Load theme
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = 'Switch to Light Mode';
    } else {
        themeToggle.textContent = 'Switch to Dark Mode';
    }

    // Load and render tasks
    function loadTasks() {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        updateRecurringTasks();
        renderTasks();
    }

    function updateRecurringTasks() {
        const now = new Date();
        tasks.forEach(task => {
            if (task.completed && task.recurrence !== 'none') {
                const completedDate = new Date(task.completedDate);
                let shouldReset = false;
                if (task.recurrence === 'daily') {
                    shouldReset = completedDate.toDateString() !== now.toDateString();
                } else if (task.recurrence === 'monthly') {
                    shouldReset = completedDate.getMonth() !== now.getMonth() || completedDate.getFullYear() !== now.getFullYear();
                }
                if (shouldReset) {
                    task.completed = false;
                    task.completedDate = null;
                }
            }
        });
        saveTasks();
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        // Sort tasks by due date
        tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const upcoming = tasks.filter(task => !task.completed);
        const history = tasks.filter(task => task.completed);

        const filteredUpcoming = filterTasks(upcoming, currentFilter);

        renderTaskList(upcomingTasks, filteredUpcoming);
        renderTaskList(historyTasks, history);
    }

    function filterTasks(taskList, filter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (filter) {
            case 'today':
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate.toDateString() === today.toDateString();
                });
            case 'yesterday':
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate.toDateString() === yesterday.toDateString();
                });
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= weekStart && dueDate <= weekEnd;
                });
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= monthStart && dueDate <= monthEnd;
                });
            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const yearEnd = new Date(now.getFullYear(), 11, 31);
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= yearStart && dueDate <= yearEnd;
                });
            case 'custom':
                const fromDate = new Date(fromDateInput.value);
                const toDate = new Date(toDateInput.value);
                if (!fromDateInput.value || !toDateInput.value) return taskList;
                return taskList.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= fromDate && dueDate <= toDate;
                });
            default:
                return taskList;
        }
    }

    function renderTaskList(container, taskList) {
        container.innerHTML = '';
        taskList.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task ${task.completed ? 'completed' : ''}`;
            const description = task.description || '';
            const linkedDescription = description.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            taskEl.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${linkedDescription}</div>
                    <div class="task-details">Due: ${new Date(task.dueDate).toLocaleDateString()} | Recurrence: ${task.recurrence}</div>
                </div>
                <div class="task-actions">
                    <button class="complete-btn">${task.completed ? '↩️' : '✅'}</button>
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;
            taskEl.querySelector('.complete-btn').addEventListener('click', () => toggleComplete(task.id));
            taskEl.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
            taskEl.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
            container.appendChild(taskEl);
        });
    }

    function addTask(title, description, dueDate, recurrence) {
        const task = {
            id: Date.now().toString(),
            title,
            description,
            dueDate,
            recurrence,
            completed: false,
            completedDate: null
        };
        tasks.push(task);
        saveTasks();
        renderTasks();
    }

    function editTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        editingId = id;
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('due-date').value = task.dueDate;
        document.getElementById('recurrence').value = task.recurrence;
        formTitle.textContent = 'Edit Task';
        taskForm.classList.remove('hidden');
        switchTab('upcoming');
    }

    function updateTask(id, title, description, dueDate, recurrence) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.title = title;
        task.description = description;
        task.dueDate = dueDate;
        task.recurrence = recurrence;
        saveTasks();
        renderTasks();
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }

    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        task.completedDate = task.completed ? new Date().toISOString() : null;
        saveTasks();
        renderTasks();
    }

    function switchTab(tab) {
        currentTab = tab;
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(tab).classList.add('active');
    }

    // Event listeners
    addBtn.addEventListener('click', () => {
        editingId = null;
        form.reset();
        formTitle.textContent = 'Add Task';
        taskForm.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        taskForm.classList.add('hidden');
        form.reset();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const dueDate = document.getElementById('due-date').value;
        const recurrence = document.getElementById('recurrence').value;
        if (editingId) {
            updateTask(editingId, title, description, dueDate, recurrence);
        } else {
            addTask(title, description, dueDate, recurrence);
        }
        taskForm.classList.add('hidden');
        form.reset();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks?')) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });

    filterSelect.addEventListener('change', () => {
        currentFilter = filterSelect.value;
        if (currentFilter === 'custom') {
            fromLabel.classList.remove('hidden');
            fromDateInput.classList.remove('hidden');
            toLabel.classList.remove('hidden');
            toDateInput.classList.remove('hidden');
        } else {
            fromLabel.classList.add('hidden');
            fromDateInput.classList.add('hidden');
            toLabel.classList.add('hidden');
            toDateInput.classList.add('hidden');
            fromDateInput.value = '';
            toDateInput.value = '';
        }
        renderTasks();
    });

    fromDateInput.addEventListener('change', () => {
        renderTasks();
    });

    toDateInput.addEventListener('change', () => {
        renderTasks();
    });

    // Initial load
    loadTasks();
});