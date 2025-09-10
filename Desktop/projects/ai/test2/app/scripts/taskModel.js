/**
 * Epic Todo List - 任务数据模型
 * 作者: 乔帅
 * 功能: 任务CRUD操作、数据验证、状态管理
 */

import storageManager from './storage.js';

/**
 * 任务类 - 表示单个任务
 */
class Task {
  constructor(text, options = {}) {
    this.id = options.id || this.generateId();
    this.text = text.trim();
    this.completed = options.completed || false;
    this.createdAt = options.createdAt || new Date().toISOString();
    this.completedAt = options.completedAt || null;
    this.updatedAt = options.updatedAt || new Date().toISOString();
    this.priority = options.priority || 'normal'; // low, normal, high
    this.category = options.category || 'default';
    this.tags = options.tags || [];
    this.dueDate = options.dueDate || null;
    this.description = options.description || '';
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 切换完成状态
   */
  toggle() {
    this.completed = !this.completed;
    this.completedAt = this.completed ? new Date().toISOString() : null;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * 更新任务文本
   */
  updateText(newText) {
    if (typeof newText === 'string' && newText.trim()) {
      this.text = newText.trim();
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 设置优先级
   */
  setPriority(priority) {
    const validPriorities = ['low', 'normal', 'high'];
    if (validPriorities.includes(priority)) {
      this.priority = priority;
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    const tagStr = tag.trim().toLowerCase();
    if (tagStr && !this.tags.includes(tagStr)) {
      this.tags.push(tagStr);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 移除标签
   */
  removeTag(tag) {
    const tagStr = tag.trim().toLowerCase();
    const index = this.tags.indexOf(tagStr);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 设置到期时间
   */
  setDueDate(date) {
    if (date instanceof Date || (typeof date === 'string' && date)) {
      this.dueDate = date instanceof Date ? date.toISOString() : date;
      this.updatedAt = new Date().toISOString();
      return true;
    } else if (date === null) {
      this.dueDate = null;
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 检查任务是否过期
   */
  isOverdue() {
    if (!this.dueDate || this.completed) return false;
    return new Date(this.dueDate) < new Date();
  }

  /**
   * 获取任务年龄（创建后经过的天数）
   */
  getAge() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 转换为普通对象
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      updatedAt: this.updatedAt,
      priority: this.priority,
      category: this.category,
      tags: [...this.tags],
      dueDate: this.dueDate,
      description: this.description
    };
  }

  /**
   * 从普通对象创建Task实例
   */
  static fromJSON(data) {
    return new Task(data.text, {
      id: data.id,
      completed: data.completed,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      updatedAt: data.updatedAt,
      priority: data.priority,
      category: data.category,
      tags: data.tags,
      dueDate: data.dueDate,
      description: data.description
    });
  }
}

/**
 * 任务管理器类 - 管理任务集合
 */
class TaskManager extends EventTarget {
  constructor() {
    super();
    this.tasks = [];
    this.nextId = 1;
    this.filter = 'all'; // all, active, completed
    this.searchQuery = '';
    this.sortBy = 'createdAt'; // createdAt, updatedAt, priority, text
    this.sortOrder = 'desc'; // asc, desc
    
    // 加载数据
    this.loadTasks();
  }

  /**
   * 添加新任务
   */
  addTask(text, options = {}) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('任务内容不能为空');
    }

    const task = new Task(text, options);
    this.tasks.unshift(task); // 新任务添加到顶部
    
    this.saveTasks();
    this.dispatchEvent(new CustomEvent('taskAdded', { detail: { task } }));
    this.dispatchEvent(new CustomEvent('tasksChanged'));
    
    return task;
  }

  /**
   * 删除任务
   */
  removeTask(taskId) {
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index === -1) {
      throw new Error('任务不存在');
    }

    const task = this.tasks[index];
    this.tasks.splice(index, 1);
    
    this.saveTasks();
    this.dispatchEvent(new CustomEvent('taskRemoved', { detail: { task } }));
    this.dispatchEvent(new CustomEvent('tasksChanged'));
    
    return task;
  }

  /**
   * 更新任务
   */
  updateTask(taskId, updates) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const oldTask = { ...task };
    
    // 更新属性
    Object.keys(updates).forEach(key => {
      if (key === 'text' && updates[key]) {
        task.updateText(updates[key]);
      } else if (key === 'priority') {
        task.setPriority(updates[key]);
      } else if (key === 'dueDate') {
        task.setDueDate(updates[key]);
      } else if (key === 'completed') {
        if (updates[key] !== task.completed) {
          task.toggle();
        }
      } else if (task.hasOwnProperty(key)) {
        task[key] = updates[key];
        task.updatedAt = new Date().toISOString();
      }
    });

    this.saveTasks();
    this.dispatchEvent(new CustomEvent('taskUpdated', { 
      detail: { task, oldTask } 
    }));
    this.dispatchEvent(new CustomEvent('tasksChanged'));
    
    return task;
  }

  /**
   * 切换任务完成状态
   */
  toggleTask(taskId) {
    return this.updateTask(taskId, { 
      completed: !this.getTask(taskId).completed 
    });
  }

  /**
   * 获取单个任务
   */
  getTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    return task;
  }

  /**
   * 获取所有任务
   */
  getAllTasks() {
    return [...this.tasks];
  }

  /**
   * 获取过滤后的任务
   */
  getFilteredTasks() {
    let filtered = [...this.tasks];

    // 应用状态过滤
    switch (this.filter) {
      case 'active':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      default:
        // 'all' - 不过滤
        break;
    }

    // 应用搜索过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.text.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.includes(query))
      );
    }

    // 应用排序
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          aVal = priorityOrder[a.priority] || 2;
          bVal = priorityOrder[b.priority] || 2;
          break;
        case 'text':
          aVal = a.text.toLowerCase();
          bVal = b.text.toLowerCase();
          break;
        case 'updatedAt':
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (typeof aVal === 'string') {
        return this.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }

  /**
   * 设置过滤器
   */
  setFilter(filter) {
    const validFilters = ['all', 'active', 'completed'];
    if (validFilters.includes(filter)) {
      this.filter = filter;
      this.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter } }));
      return true;
    }
    return false;
  }

  /**
   * 设置搜索查询
   */
  setSearchQuery(query) {
    this.searchQuery = query.trim();
    this.dispatchEvent(new CustomEvent('searchChanged', { detail: { query: this.searchQuery } }));
  }

  /**
   * 设置排序方式
   */
  setSorting(sortBy, sortOrder = 'desc') {
    const validSortBy = ['createdAt', 'updatedAt', 'priority', 'text'];
    const validSortOrder = ['asc', 'desc'];
    
    if (validSortBy.includes(sortBy)) {
      this.sortBy = sortBy;
    }
    
    if (validSortOrder.includes(sortOrder)) {
      this.sortOrder = sortOrder;
    }
    
    this.dispatchEvent(new CustomEvent('sortingChanged', { 
      detail: { sortBy: this.sortBy, sortOrder: this.sortOrder } 
    }));
  }

  /**
   * 批量操作
   */
  bulkComplete(taskIds) {
    const updatedTasks = [];
    taskIds.forEach(taskId => {
      try {
        const task = this.getTask(taskId);
        if (!task.completed) {
          this.toggleTask(taskId);
          updatedTasks.push(task);
        }
      } catch (error) {
        console.warn(`批量完成任务失败: ${taskId}`, error);
      }
    });
    return updatedTasks;
  }

  bulkDelete(taskIds) {
    const deletedTasks = [];
    taskIds.forEach(taskId => {
      try {
        const task = this.removeTask(taskId);
        deletedTasks.push(task);
      } catch (error) {
        console.warn(`批量删除任务失败: ${taskId}`, error);
      }
    });
    return deletedTasks;
  }

  /**
   * 清除已完成的任务
   */
  clearCompleted() {
    const completedTasks = this.tasks.filter(task => task.completed);
    this.tasks = this.tasks.filter(task => !task.completed);
    
    this.saveTasks();
    this.dispatchEvent(new CustomEvent('completedCleared', { 
      detail: { count: completedTasks.length } 
    }));
    this.dispatchEvent(new CustomEvent('tasksChanged'));
    
    return completedTasks;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(task => task.completed).length;
    const active = total - completed;
    const overdue = this.tasks.filter(task => task.isOverdue()).length;
    
    return {
      total,
      completed,
      active,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * 保存任务到存储
   */
  saveTasks() {
    const taskData = this.tasks.map(task => task.toJSON());
    storageManager.saveTasks(taskData);
  }

  /**
   * 从存储加载任务
   */
  loadTasks() {
    try {
      const taskData = storageManager.loadTasks();
      this.tasks = taskData.map(data => Task.fromJSON(data));
      this.dispatchEvent(new CustomEvent('tasksLoaded', { 
        detail: { count: this.tasks.length } 
      }));
      this.dispatchEvent(new CustomEvent('tasksChanged'));
    } catch (error) {
      console.error('加载任务失败:', error);
      this.tasks = [];
    }
  }

  /**
   * 重置所有数据
   */
  reset() {
    this.tasks = [];
    this.filter = 'all';
    this.searchQuery = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    
    this.saveTasks();
    this.dispatchEvent(new CustomEvent('tasksReset'));
    this.dispatchEvent(new CustomEvent('tasksChanged'));
  }

  /**
   * 导入任务数据
   */
  importTasks(tasksData, merge = false) {
    try {
      if (!Array.isArray(tasksData)) {
        throw new Error('导入数据格式错误');
      }

      const importedTasks = tasksData.map(data => Task.fromJSON(data));
      
      if (merge) {
        // 合并模式：避免重复ID
        const existingIds = new Set(this.tasks.map(t => t.id));
        const newTasks = importedTasks.filter(t => !existingIds.has(t.id));
        this.tasks = [...this.tasks, ...newTasks];
      } else {
        // 替换模式：完全替换现有任务
        this.tasks = importedTasks;
      }

      this.saveTasks();
      this.dispatchEvent(new CustomEvent('tasksImported', { 
        detail: { 
          count: importedTasks.length, 
          merge,
          total: this.tasks.length 
        } 
      }));
      this.dispatchEvent(new CustomEvent('tasksChanged'));
      
      return true;
    } catch (error) {
      console.error('导入任务失败:', error);
      throw error;
    }
  }
}

// 创建全局任务管理器实例
const taskManager = new TaskManager();

// 导出类和实例
export { Task, TaskManager };
export default taskManager;