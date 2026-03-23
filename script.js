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
    const modalOverlay = document.getElementById('modal-overlay');
    const taskForm = document.getElementById('task-form');
    const form = document.getElementById('form');
    const cancelBtn = document.getElementById('cancel-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const upcomingTasks = document.getElementById('upcoming-tasks');
    const allTasks = document.getElementById('all-tasks');
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

    const recurrenceSelect = document.getElementById('recurrence');
    const dateInputGroup = document.getElementById('date-input-group');
    const timeInputGroup = document.getElementById('time-input-group');
    const dueDateInput = document.getElementById('due-date');
    const dueTimeInput = document.getElementById('due-time');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let editingId = null;
    let selectedTaskIds = new Set();
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
                } else if (task.recurrence === 'weekly') {
                    const diffTime = Math.abs(now - completedDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    shouldReset = diffDays >= 7;
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
        // Sort tasks by due date or time
        tasks.sort((a, b) => {
            if (a.recurrence === 'none' && b.recurrence === 'none') {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.recurrence !== 'none' && b.recurrence !== 'none') {
                return (a.dueTime || '') > (b.dueTime || '') ? 1 : -1;
            }
            return a.recurrence === 'none' ? -1 : 1;
        });

        const upcoming = tasks.filter(task => !task.completed);
        const history = tasks.filter(task => task.completed);

        const filteredUpcoming = filterTasks(upcoming, currentFilter);

        renderTaskList(upcomingTasks, filteredUpcoming);
        renderTaskList(allTasks, tasks, { showCheckbox: true, showComplete: false });
        renderTaskList(historyTasks, history);
        updateBulkActionsBar();
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

    function extractLinks(text) {
        const regex = /(https?:\/\/[^\s]+)/g;
        return text.match(regex) || [];
    }

    function renderTaskList(container, taskList, options = {}) {
        const { showCheckbox = false, showComplete = true } = options;
        container.innerHTML = '';
        taskList.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task ${task.completed ? 'completed' : ''}`;
            const description = task.description || '';
            const linkedDescription = description.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

            const checkboxHtml = showCheckbox ? `
                <div class="task-checkbox-container">
                    <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${selectedTaskIds.has(task.id) ? 'checked' : ''}>
                </div>
            ` : '';

            const completeBtnHtml = showComplete ? `
                <button class="complete-btn">${task.completed ? '↩️' : '✅'}</button>
            ` : '';

            const links = extractLinks(description);
            let linkActionHtml = '';

            if (links.length === 1) {
                linkActionHtml = `<button class="link-btn" title="Open Link">🔗</button>`;
            } else if (links.length > 1) {
                linkActionHtml = `
                    <div class="link-dropdown">
                        <button class="link-dropdown-btn" title="Multiple Links">🔗 <i class="fas fa-chevron-down" style="font-size: 10px; margin-left: 4px;"></i></button>
                        <div class="link-dropdown-content">
                            ${links.map((link, index) => `
                                <a href="${link}" target="_blank" class="link-dropdown-item" title="${link}">
                                    <i class="fas fa-external-link-alt"></i> Link ${index + 1}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            taskEl.innerHTML = `
                ${checkboxHtml}
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${linkedDescription}</div>
                    <div class="task-details">
                        ${task.recurrence === 'none' ? 'Due: ' + new Date(task.dueDate).toLocaleDateString() : ''}
                        ${task.recurrence === 'daily' ? 'Time: ' + (task.dueTime || 'N/A') : ''}
                        ${(task.recurrence === 'weekly' || task.recurrence === 'monthly') ? 'Starting: ' + new Date(task.dueDate).toLocaleDateString() + ' at ' + (task.dueTime || 'N/A') : ''}
                        | Recurrence: ${task.recurrence}
                    </div>
                </div>
                <div class="task-actions">
                    ${completeBtnHtml}
                    ${linkActionHtml}
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;

            if (showComplete) {
                taskEl.querySelector('.complete-btn').addEventListener('click', () => toggleComplete(task.id));
            }
            if (showCheckbox) {
                taskEl.querySelector('.task-checkbox').addEventListener('change', (e) => toggleSelectTask(task.id, e.target.checked));
            }

            taskEl.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
            taskEl.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

            if (links.length === 1) {
                taskEl.querySelector('.link-btn').addEventListener('click', () => window.open(links[0], '_blank'));
            } else if (links.length > 1) {
                const dropBtn = taskEl.querySelector('.link-dropdown-btn');
                dropBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dropdown = dropBtn.nextElementSibling;
                    document.querySelectorAll('.link-dropdown-content').forEach(d => {
                        if (d !== dropdown) d.classList.remove('show');
                    });
                    dropdown.classList.toggle('show');
                });
            }

            container.appendChild(taskEl);
        });
    }


    function toggleSelectTask(id, selected) {
        if (selected) {
            selectedTaskIds.add(id);
        } else {
            selectedTaskIds.delete(id);
        }
        updateBulkActionsBar();
    }

    function updateBulkActionsBar() {
        const bar = document.getElementById('bulk-actions-bar');
        const countSpan = document.getElementById('selected-count');
        const selectAllCheckbox = document.getElementById('select-all');

        if (selectedTaskIds.size > 0) {
            bar.classList.remove('hidden');
            countSpan.textContent = `${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''} selected`;
        } else {
            bar.classList.add('hidden');
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedTaskIds.size === tasks.length && tasks.length > 0;
        }
    }

    function addTask(title, description, dueDate, dueTime, recurrence) {
        const task = {
            id: Date.now().toString(),
            title,
            description,
            dueDate: (recurrence === 'none' || recurrence === 'weekly' || recurrence === 'monthly') ? dueDate : null,
            dueTime: recurrence !== 'none' ? dueTime : null,
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

        recurrenceSelect.value = task.recurrence;
        updateFormVisibility(task.recurrence);

        if (task.dueDate) dueDateInput.value = task.dueDate;
        if (task.dueTime) dueTimeInput.value = task.dueTime;

        formTitle.textContent = 'Edit Task';
        modalOverlay.classList.remove('hidden');
        switchTab('all');
    }

    function updateTask(id, title, description, dueDate, dueTime, recurrence) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.title = title;
        task.description = description;
        task.dueDate = (recurrence === 'none' || recurrence === 'weekly' || recurrence === 'monthly') ? dueDate : null;
        task.dueTime = recurrence !== 'none' ? dueTime : null;
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
        if (tab !== 'all') {
            selectedTaskIds.clear();
            updateBulkActionsBar();
        }
    }

    // Event listeners
    addBtn.addEventListener('click', () => {
        editingId = null;
        form.reset();
        formTitle.textContent = 'Add Task';
        modalOverlay.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        form.reset();
    });

    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        form.reset();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.add('hidden');
            form.reset();
        }
    });

    // Bulk selection listeners
    document.getElementById('select-all').addEventListener('change', (e) => {
        if (e.target.checked) {
            tasks.forEach(task => selectedTaskIds.add(task.id));
        } else {
            selectedTaskIds.clear();
        }
        renderTasks();
    });

    document.getElementById('close-bulk-actions').addEventListener('click', () => {
        selectedTaskIds.clear();
        renderTasks();
    });

    document.getElementById('bulk-delete-btn').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${selectedTaskIds.size} tasks?`)) {
            tasks = tasks.filter(task => !selectedTaskIds.has(task.id));
            selectedTaskIds.clear();
            saveTasks();
            renderTasks();
        }
    });

    document.getElementById('bulk-edit-btn').addEventListener('click', () => {
        if (selectedTaskIds.size === 0) return;
        editingId = Array.from(selectedTaskIds)[0]; // Use first selected as template
        const task = tasks.find(t => t.id === editingId);

        // Prepare form for bulk edit (using logic of first task)
        document.getElementById('title').value = "MULTIPLE TASKS";
        document.getElementById('description').value = "Updating multiple items...";

        recurrenceSelect.value = task.recurrence;
        updateFormVisibility(task.recurrence);

        if (task.dueDate) dueDateInput.value = task.dueDate;
        if (task.dueTime) dueTimeInput.value = task.dueTime;

        formTitle.textContent = `Bulk Edit ${selectedTaskIds.size} Tasks`;
        modalOverlay.classList.remove('hidden');

        // Change form submit behavior for bulk
        const originalSubmit = form.onsubmit;
        form.onsubmit = (e) => {
            e.preventDefault();
            const dueDate = dueDateInput.value;
            const dueTime = dueTimeInput.value;
            const recurrence = recurrenceSelect.value;

            tasks.forEach(t => {
                if (selectedTaskIds.has(t.id)) {
                    t.dueDate = (recurrence === 'none' || recurrence === 'weekly' || recurrence === 'monthly') ? dueDate : null;
                    t.dueTime = recurrence !== 'none' ? dueTime : null;
                    t.recurrence = recurrence;
                }
            });

            saveTasks();
            selectedTaskIds.clear();
            modalOverlay.classList.add('hidden');
            form.reset();
            updateFormVisibility('none');
            renderTasks();
            form.onsubmit = null; // Reset to default handler for next time
        };
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const dueDate = dueDateInput.value;
        const dueTime = dueTimeInput.value;
        const recurrence = recurrenceSelect.value;
        if (editingId) {
            updateTask(editingId, title, description, dueDate, dueTime, recurrence);
        } else {
            addTask(title, description, dueDate, dueTime, recurrence);
        }
        modalOverlay.classList.add('hidden');
        form.reset();
        updateFormVisibility('none');
    });

    function updateFormVisibility(recurrence) {
        if (recurrence === 'none') {
            dateInputGroup.classList.remove('hidden');
            timeInputGroup.classList.add('hidden');
            dueDateInput.required = true;
            dueTimeInput.required = false;
        } else if (recurrence === 'daily') {
            dateInputGroup.classList.add('hidden');
            timeInputGroup.classList.remove('hidden');
            dueDateInput.required = false;
            dueTimeInput.required = true;
        } else {
            // weekly or monthly
            dateInputGroup.classList.remove('hidden');
            timeInputGroup.classList.remove('hidden');
            dueDateInput.required = true;
            dueTimeInput.required = true;
        }
    }

    recurrenceSelect.addEventListener('change', () => {
        updateFormVisibility(recurrenceSelect.value);
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

    // Close dropdowns when clicking outside
    window.addEventListener('click', () => {
        document.querySelectorAll('.link-dropdown-content').forEach(d => d.classList.remove('show'));
    });

    // Initial load
    loadTasks();
});