/**
 * Epic Todo List - 视图渲染模块
 * 作者: 乔帅
 * 功能: DOM操作、UI渲染、交互反馈
 */

/**
 * Toast通知管理器
 */
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
    this.toasts = new Map();
    this.maxToasts = 5;
  }

  /**
   * 显示Toast通知
   * @param {string} message - 消息内容
   * @param {string} type - 类型 success/warning/error/info
   * @param {number} duration - 显示时长(毫秒)
   */
  show(message, type = 'info', duration = 3000) {
    const id = 'toast-' + Date.now();
    const toast = this.createToast(id, message, type);
    
    // 如果Toast过多，移除最老的
    if (this.toasts.size >= this.maxToasts) {
      const oldestId = this.toasts.keys().next().value;
      this.remove(oldestId);
    }
    
    this.container.appendChild(toast);
    this.toasts.set(id, toast);
    
    // 触发动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // 自动移除
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
    
    return id;
  }

  /**
   * 创建Toast元素
   */
  createToast(id, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = id;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${icons[type] || icons.info}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="关闭通知">&times;</button>
    `;
    
    // 添加关闭事件
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(id));
    
    return toast;
  }

  /**
   * 移除Toast
   */
  remove(id) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.toasts.delete(id);
      }, 300);
    }
  }

  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * 模态框管理器
 */
class ModalManager {
  constructor() {
    this.overlay = document.getElementById('modalOverlay');
    this.modal = this.overlay.querySelector('.modal');
    this.title = this.overlay.querySelector('#modal-title');
    this.body = this.overlay.querySelector('#modalBody');
    this.footer = this.overlay.querySelector('#modalFooter');
    this.closeBtn = this.overlay.querySelector('.modal-close');
    
    this.setupEvents();
  }

  /**
   * 设置事件监听
   */
  setupEvents() {
    // 点击关闭按钮
    this.closeBtn.addEventListener('click', () => this.close());
    
    // 点击遮罩层关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.close();
      }
    });
  }

  /**
   * 显示模态框
   * @param {Object} options - 配置选项
   */
  show(options = {}) {
    const {
      title = '提示',
      body = '',
      buttons = [{ text: '确定', primary: true, action: () => this.close() }],
      closable = true
    } = options;
    
    this.title.textContent = title;
    this.body.innerHTML = body;
    this.renderButtons(buttons);
    
    this.closeBtn.style.display = closable ? 'flex' : 'none';
    
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到第一个按钮
    const firstButton = this.footer.querySelector('button');
    if (firstButton) {
      setTimeout(() => firstButton.focus(), 100);
    }
  }

  /**
   * 关闭模态框
   */
  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * 检查是否可见
   */
  isVisible() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  /**
   * 渲染按钮
   */
  renderButtons(buttons) {
    this.footer.innerHTML = '';
    
    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.textContent = button.text;
      btn.className = `footer-btn ${button.primary ? 'primary' : ''}`;
      
      if (button.action) {
        btn.addEventListener('click', button.action);
      }
      
      this.footer.appendChild(btn);
    });
  }

  /**
   * 显示确认对话框
   */
  confirm(message, title = '确认') {
    return new Promise((resolve) => {
      this.show({
        title,
        body: `<p>${this.escapeHtml(message)}</p>`,
        buttons: [
          {
            text: '取消',
            action: () => {
              this.close();
              resolve(false);
            }
          },
          {
            text: '确定',
            primary: true,
            action: () => {
              this.close();
              resolve(true);
            }
          }
        ]
      });
    });
  }

  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * 任务视图管理器
 */
class TaskView {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.toast = new ToastManager();
    this.modal = new ModalManager();
    
    // DOM元素缓存
    this.elements = this.cacheElements();
    
    // 选中的任务
    this.selectedTasks = new Set();
    
    // 初始化
    this.init();
  }

  /**
   * 缓存DOM元素
   */
  cacheElements() {
    return {
      taskList: document.getElementById('taskList'),
      emptyState: document.getElementById('emptyState'),
      taskForm: document.getElementById('taskForm'),
      taskInput: document.getElementById('taskInput'),
      searchInput: document.getElementById('searchInput'),
      filterTabs: document.querySelectorAll('.filter-tab'),
      bulkActions: document.getElementById('bulkActions'),
      bulkSelectors: {
        complete: document.getElementById('completeSelected'),
        delete: document.getElementById('deleteSelected'),
        clear: document.getElementById('clearSelection')
      },
      stats: {
        total: document.getElementById('totalTasks'),
        completed: document.getElementById('completedTasks'),
        remaining: document.getElementById('remainingTasks')
      },
      footerButtons: {
        clearCompleted: document.getElementById('clearCompleted'),
        exportData: document.getElementById('exportData'),
        importData: document.getElementById('importData')
      }
    };
  }

  /**
   * 初始化视图
   */
  init() {
    this.setupEventListeners();
    this.render();
    this.updateStats();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 表单提交
    this.elements.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // 搜索输入
    this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e));
    
    // 过滤标签
    this.elements.filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => this.handleFilterChange(e));
    });
    
    // 批量操作
    this.elements.bulkSelectors.complete.addEventListener('click', () => this.handleBulkComplete());
    this.elements.bulkSelectors.delete.addEventListener('click', () => this.handleBulkDelete());
    this.elements.bulkSelectors.clear.addEventListener('click', () => this.clearSelection());
    
    // 底部按钮
    this.elements.footerButtons.clearCompleted.addEventListener('click', () => this.handleClearCompleted());
    this.elements.footerButtons.exportData.addEventListener('click', () => this.handleExportData());
    this.elements.footerButtons.importData.addEventListener('click', () => this.handleImportData());
    
    // 任务管理器事件
    this.taskManager.addEventListener('tasksChanged', () => {
      this.render();
      this.updateStats();
    });
    
    this.taskManager.addEventListener('filterChanged', () => this.render());
    this.taskManager.addEventListener('searchChanged', () => this.render());
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /**
   * 处理表单提交
   */
  handleFormSubmit(e) {
    e.preventDefault();
    const text = this.elements.taskInput.value.trim();
    
    if (!text) {
      this.toast.show('请输入任务内容', 'warning');
      return;
    }
    
    try {
      this.taskManager.addTask(text);
      this.elements.taskInput.value = '';
      this.toast.show('任务添加成功', 'success', 2000);
    } catch (error) {
      this.toast.show(`添加失败: ${error.message}`, 'error');
    }
  }

  /**
   * 处理搜索
   */
  handleSearch(e) {
    const query = e.target.value;
    this.taskManager.setSearchQuery(query);
  }

  /**
   * 处理过滤器变更
   */
  handleFilterChange(e) {
    e.preventDefault();
    const filter = e.target.dataset.filter;
    
    // 更新UI状态
    this.elements.filterTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    e.target.classList.add('active');
    e.target.setAttribute('aria-selected', 'true');
    
    // 更新数据过滤器
    this.taskManager.setFilter(filter);
  }

  /**
   * 处理键盘快捷键
   */
  handleKeyboard(e) {
    // Ctrl/Cmd + A: 全选
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      this.selectAll();
    }
    
    // Delete: 删除选中
    if (e.key === 'Delete' && this.selectedTasks.size > 0 && !e.target.matches('input, textarea')) {
      e.preventDefault();
      this.handleBulkDelete();
    }
    
    // Escape: 清除选择
    if (e.key === 'Escape') {
      this.clearSelection();
    }
  }

  /**
   * 渲染任务列表
   */
  render() {
    const tasks = this.taskManager.getFilteredTasks();
    
    if (tasks.length === 0) {
      this.showEmptyState();
      return;
    }
    
    this.hideEmptyState();
    this.renderTaskList(tasks);
    this.updateBulkActions();
  }

  /**
   * 渲染任务列表
   */
  renderTaskList(tasks) {
    this.elements.taskList.innerHTML = '';
    
    tasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      this.elements.taskList.appendChild(taskElement);
    });
  }

  /**
   * 创建任务元素
   */
  createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('data-task-id', task.id);
    li.setAttribute('role', 'listitem');
    
    const isSelected = this.selectedTasks.has(task.id);
    
    li.innerHTML = `
      <input 
        type="checkbox" 
        class="task-checkbox" 
        ${isSelected ? 'checked' : ''}
        aria-label="选择任务"
      >
      <div class="task-content">
        <span class="task-text">${this.escapeHtml(task.text)}</span>
        <div class="task-meta">
          <span class="task-date">创建于 ${this.formatDate(task.createdAt)}</span>
          ${task.completedAt ? `<span class="completion-date">完成于 ${this.formatDate(task.completedAt)}</span>` : ''}
          ${task.priority !== 'normal' ? `<span class="priority priority-${task.priority}">${this.getPriorityText(task.priority)}</span>` : ''}
          ${task.tags.length > 0 ? `<span class="tags">${task.tags.map(tag => `#${tag}`).join(' ')}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit" aria-label="编辑任务" title="编辑">
          ✏️
        </button>
        <button class="task-action-btn delete" aria-label="删除任务" title="删除">
          🗑️
        </button>
      </div>
    `;
    
    // 添加事件监听器
    this.attachTaskEvents(li, task);
    
    return li;
  }

  /**
   * 为任务元素添加事件监听器
   */
  attachTaskEvents(element, task) {
    const checkbox = element.querySelector('.task-checkbox');
    const editBtn = element.querySelector('.edit');
    const deleteBtn = element.querySelector('.delete');
    const taskText = element.querySelector('.task-text');
    
    // 选择框事件
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) {
        this.selectedTasks.add(task.id);
      } else {
        this.selectedTasks.delete(task.id);
      }
      this.updateBulkActions();
    });
    
    // 点击任务文本切换完成状态
    taskText.addEventListener('click', () => {
      try {
        this.taskManager.toggleTask(task.id);
        const action = task.completed ? '取消完成' : '完成';
        this.toast.show(`任务${action}成功`, 'success', 1500);
      } catch (error) {
        this.toast.show(`操作失败: ${error.message}`, 'error');
      }
    });
    
    // 编辑按钮
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editTask(task);
    });
    
    // 删除按钮
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await this.modal.confirm(
        `确定要删除任务"${task.text}"吗？`,
        '删除任务'
      );
      
      if (confirmed) {
        try {
          this.taskManager.removeTask(task.id);
          this.selectedTasks.delete(task.id);
          this.toast.show('任务删除成功', 'success', 1500);
        } catch (error) {
          this.toast.show(`删除失败: ${error.message}`, 'error');
        }
      }
    });
  }

  /**
   * 编辑任务
   */
  editTask(task) {
    const form = `
      <form id="editTaskForm">
        <div class="form-group">
          <label for="editTaskText">任务内容:</label>
          <input 
            type="text" 
            id="editTaskText" 
            value="${this.escapeHtml(task.text)}" 
            maxlength="200"
            required
          >
        </div>
        <div class="form-group">
          <label for="editTaskPriority">优先级:</label>
          <select id="editTaskPriority">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
            <option value="normal" ${task.priority === 'normal' ? 'selected' : ''}>普通</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editTaskDescription">描述 (可选):</label>
          <textarea 
            id="editTaskDescription" 
            maxlength="500"
            rows="3"
          >${this.escapeHtml(task.description)}</textarea>
        </div>
      </form>
    `;
    
    this.modal.show({
      title: '编辑任务',
      body: form,
      buttons: [
        {
          text: '取消',
          action: () => this.modal.close()
        },
        {
          text: '保存',
          primary: true,
          action: () => {
            const form = document.getElementById('editTaskForm');
            const formData = new FormData(form);
            const text = document.getElementById('editTaskText').value.trim();
            const priority = document.getElementById('editTaskPriority').value;
            const description = document.getElementById('editTaskDescription').value.trim();
            
            if (!text) {
              this.toast.show('请输入任务内容', 'warning');
              return;
            }
            
            try {
              this.taskManager.updateTask(task.id, {
                text,
                priority,
                description
              });
              this.modal.close();
              this.toast.show('任务更新成功', 'success', 1500);
            } catch (error) {
              this.toast.show(`更新失败: ${error.message}`, 'error');
            }
          }
        }
      ]
    });
    
    // 聚焦到输入框
    setTimeout(() => {
      const input = document.getElementById('editTaskText');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  /**
   * 批量操作处理
   */
  async handleBulkComplete() {
    if (this.selectedTasks.size === 0) return;
    
    try {
      const updatedTasks = this.taskManager.bulkComplete([...this.selectedTasks]);
      this.clearSelection();
      this.toast.show(`成功完成 ${updatedTasks.length} 个任务`, 'success');
    } catch (error) {
      this.toast.show(`批量操作失败: ${error.message}`, 'error');
    }
  }

  async handleBulkDelete() {
    if (this.selectedTasks.size === 0) return;
    
    const confirmed = await this.modal.confirm(
      `确定要删除选中的 ${this.selectedTasks.size} 个任务吗？`,
      '批量删除'
    );
    
    if (confirmed) {
      try {
        const deletedTasks = this.taskManager.bulkDelete([...this.selectedTasks]);
        this.clearSelection();
        this.toast.show(`成功删除 ${deletedTasks.length} 个任务`, 'success');
      } catch (error) {
        this.toast.show(`批量删除失败: ${error.message}`, 'error');
      }
    }
  }

  /**
   * 清除完成的任务
   */
  async handleClearCompleted() {
    const stats = this.taskManager.getStats();
    if (stats.completed === 0) {
      this.toast.show('没有已完成的任务', 'info');
      return;
    }
    
    const confirmed = await this.modal.confirm(
      `确定要清除所有 ${stats.completed} 个已完成的任务吗？`,
      '清除已完成任务'
    );
    
    if (confirmed) {
      try {
        const clearedTasks = this.taskManager.clearCompleted();
        this.toast.show(`成功清除 ${clearedTasks.length} 个已完成任务`, 'success');
      } catch (error) {
        this.toast.show(`清除失败: ${error.message}`, 'error');
      }
    }
  }

  /**
   * 导出数据
   */
  async handleExportData() {
    try {
      const tasks = this.taskManager.getAllTasks();
      const settings = {}; // 可以从设置管理器获取
      
      // 使用storageManager导出
      const success = await import('./storage.js').then(module => 
        module.default.exportData(tasks.map(t => t.toJSON()), settings)
      );
      
      if (success) {
        this.toast.show('数据导出成功', 'success');
      } else {
        throw new Error('导出失败');
      }
    } catch (error) {
      this.toast.show(`导出失败: ${error.message}`, 'error');
    }
  }

  /**
   * 导入数据
   */
  handleImportData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const storageModule = await import('./storage.js');
        const result = await storageModule.default.importData(file);
        
        const merge = await this.modal.confirm(
          '是否合并导入数据？\n\n选择"确定"将合并数据，选择"取消"将替换所有现有数据。',
          '导入选项'
        );
        
        await this.taskManager.importTasks(result.tasks, merge);
        this.toast.show(`成功导入 ${result.tasks.length} 个任务`, 'success');
      } catch (error) {
        this.toast.show(`导入失败: ${error.message}`, 'error');
      }
    };
    
    input.click();
  }

  /**
   * 选择操作
   */
  selectAll() {
    const tasks = this.taskManager.getFilteredTasks();
    tasks.forEach(task => this.selectedTasks.add(task.id));
    this.updateTaskSelection();
    this.updateBulkActions();
  }

  clearSelection() {
    this.selectedTasks.clear();
    this.updateTaskSelection();
    this.updateBulkActions();
  }

  updateTaskSelection() {
    const checkboxes = this.elements.taskList.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
      const taskId = checkbox.closest('.task-item').dataset.taskId;
      checkbox.checked = this.selectedTasks.has(taskId);
    });
  }

  updateBulkActions() {
    const hasSelection = this.selectedTasks.size > 0;
    this.elements.bulkActions.style.display = hasSelection ? 'flex' : 'none';
    
    if (hasSelection) {
      const selectedCount = this.selectedTasks.size;
      this.elements.bulkSelectors.complete.textContent = `✓ 完成选中 (${selectedCount})`;
      this.elements.bulkSelectors.delete.textContent = `🗑 删除选中 (${selectedCount})`;
    }
  }

  /**
   * 显示/隐藏空状态
   */
  showEmptyState() {
    this.elements.taskList.style.display = 'none';
    this.elements.emptyState.style.display = 'flex';
  }

  hideEmptyState() {
    this.elements.taskList.style.display = 'block';
    this.elements.emptyState.style.display = 'none';
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    const stats = this.taskManager.getStats();
    
    this.elements.stats.total.textContent = stats.total;
    this.elements.stats.completed.textContent = stats.completed;
    this.elements.stats.remaining.textContent = stats.active;
    
    // 更新清除按钮状态
    this.elements.footerButtons.clearCompleted.disabled = stats.completed === 0;
  }

  /**
   * 工具方法
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '今天';
    } else if (diffDays === 2) {
      return '昨天';
    } else if (diffDays <= 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  getPriorityText(priority) {
    const priorities = {
      low: '低优先级',
      normal: '普通',
      high: '高优先级'
    };
    return priorities[priority] || '普通';
  }
}

export { TaskView, ToastManager, ModalManager };
export default TaskView;