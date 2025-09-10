/**
 * Epic Todo List - 存储管理模块
 * 作者: 乔帅
 * 功能: 本地存储管理、数据持久化、导入导出
 */

class StorageManager {
  constructor() {
    this.storageKey = 'epic-todo-list-data';
    this.settingsKey = 'epic-todo-list-settings';
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  /**
   * 检查本地存储可用性
   */
  checkLocalStorageAvailability() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage不可用，使用内存存储');
      return false;
    }
  }

  /**
   * 保存任务数据
   * @param {Array} tasks - 任务数组
   */
  saveTasks(tasks) {
    try {
      const data = {
        tasks: tasks,
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        timestamp: Date.now()
      };

      if (this.isLocalStorageAvailable) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } else {
        // 如果localStorage不可用，存储在内存中
        this._memoryStorage = data;
      }
      
      console.log(`已保存 ${tasks.length} 个任务到本地存储`);
      return true;
    } catch (error) {
      console.error('保存任务失败:', error);
      return false;
    }
  }

  /**
   * 加载任务数据
   * @returns {Array} 任务数组
   */
  loadTasks() {
    try {
      let data = null;
      
      if (this.isLocalStorageAvailable) {
        const stored = localStorage.getItem(this.storageKey);
        data = stored ? JSON.parse(stored) : null;
      } else {
        data = this._memoryStorage || null;
      }

      if (data && data.tasks && Array.isArray(data.tasks)) {
        console.log(`从本地存储加载了 ${data.tasks.length} 个任务`);
        return data.tasks;
      }
      
      console.log('未找到本地存储数据，返回空数组');
      return [];
    } catch (error) {
      console.error('加载任务失败:', error);
      return [];
    }
  }

  /**
   * 保存应用设置
   * @param {Object} settings - 设置对象
   */
  saveSettings(settings) {
    try {
      const data = {
        ...settings,
        lastModified: new Date().toISOString()
      };

      if (this.isLocalStorageAvailable) {
        localStorage.setItem(this.settingsKey, JSON.stringify(data));
      } else {
        this._memorySettings = data;
      }
      
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  }

  /**
   * 加载应用设置
   * @returns {Object} 设置对象
   */
  loadSettings() {
    try {
      let data = null;
      
      if (this.isLocalStorageAvailable) {
        const stored = localStorage.getItem(this.settingsKey);
        data = stored ? JSON.parse(stored) : null;
      } else {
        data = this._memorySettings || null;
      }

      // 默认设置
      const defaultSettings = {
        theme: 'light',
        autoSave: true,
        showCompletedTasks: true,
        taskAnimation: true,
        soundEffects: false,
        lastFilter: 'all'
      };

      return data ? { ...defaultSettings, ...data } : defaultSettings;
    } catch (error) {
      console.error('加载设置失败:', error);
      return {};
    }
  }

  /**
   * 导出数据为JSON文件
   * @param {Array} tasks - 任务数组
   * @param {Object} settings - 设置对象
   */
  exportData(tasks, settings = {}) {
    try {
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        appName: 'Epic Todo List',
        author: '乔帅',
        data: {
          tasks: tasks,
          settings: settings,
          metadata: {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(task => task.completed).length,
            activeTasks: tasks.filter(task => !task.completed).length
          }
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `epic-todo-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      URL.revokeObjectURL(url);
      
      console.log('数据导出成功');
      return true;
    } catch (error) {
      console.error('导出数据失败:', error);
      return false;
    }
  }

  /**
   * 从文件导入数据
   * @param {File} file - 文件对象
   * @returns {Promise} 导入结果
   */
  importData(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('请选择要导入的文件'));
        return;
      }

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        reject(new Error('请选择有效的JSON文件'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          // 验证数据结构
          if (!this.validateImportData(importData)) {
            reject(new Error('文件格式无效或数据结构不正确'));
            return;
          }

          const result = {
            tasks: importData.data.tasks || [],
            settings: importData.data.settings || {},
            metadata: importData.data.metadata || {}
          };

          console.log(`导入数据成功: ${result.tasks.length} 个任务`);
          resolve(result);
        } catch (error) {
          reject(new Error('文件内容解析失败: ' + error.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 验证导入数据格式
   * @param {Object} data - 导入的数据
   * @returns {boolean} 验证结果
   */
  validateImportData(data) {
    try {
      // 检查基本结构
      if (!data || typeof data !== 'object') return false;
      if (!data.data || typeof data.data !== 'object') return false;
      if (!Array.isArray(data.data.tasks)) return false;

      // 检查任务数据结构
      const tasks = data.data.tasks;
      for (const task of tasks) {
        if (!task.id || typeof task.text !== 'string') {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('数据验证失败:', error);
      return false;
    }
  }

  /**
   * 清除所有数据
   */
  clearAllData() {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.settingsKey);
      } else {
        delete this._memoryStorage;
        delete this._memorySettings;
      }
      
      console.log('已清除所有本地数据');
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储信息
   */
  getStorageInfo() {
    const info = {
      isAvailable: this.isLocalStorageAvailable,
      type: this.isLocalStorageAvailable ? 'localStorage' : 'memory'
    };

    if (this.isLocalStorageAvailable) {
      try {
        const tasksData = localStorage.getItem(this.storageKey);
        const settingsData = localStorage.getItem(this.settingsKey);
        
        info.tasksSize = tasksData ? new Blob([tasksData]).size : 0;
        info.settingsSize = settingsData ? new Blob([settingsData]).size : 0;
        info.totalSize = info.tasksSize + info.settingsSize;
        
        // 估算localStorage总使用量
        let totalUsed = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            totalUsed += localStorage[key].length;
          }
        }
        info.totalLocalStorageUsed = totalUsed;
        
        // localStorage大概限制（因浏览器而异，通常是5-10MB）
        info.estimatedLimit = 5 * 1024 * 1024; // 5MB
        info.usagePercentage = ((info.totalLocalStorageUsed / info.estimatedLimit) * 100).toFixed(2);
      } catch (error) {
        console.error('获取存储信息失败:', error);
      }
    }

    return info;
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的大小字符串
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 创建全局存储管理器实例
const storageManager = new StorageManager();

// 导出模块
export default storageManager;