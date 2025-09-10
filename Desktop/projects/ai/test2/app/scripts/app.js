/**
 * Epic Todo List - 应用程序入口
 * 作者: 乔帅
 * 功能: 应用初始化、模块整合、全局状态管理
 */

import taskManager from './taskModel.js';
import TaskView from './taskView.js';
import storageManager from './storage.js';

/**
 * 应用程序主类
 */
class EpicTodoApp {
  constructor() {
    this.version = '1.0.0';
    this.taskManager = taskManager;
    this.storageManager = storageManager;
    this.view = null;
    this.settings = {};
    this.isInitialized = false;
  }

  /**
   * 应用程序初始化
   */
  async init() {
    try {
      console.log(`Epic Todo List v${this.version} - 初始化开始`);
      
      // 检查浏览器兼容性
      this.checkBrowserCompatibility();
      
      // 加载设置
      await this.loadSettings();
      
      // 等待DOM加载完成
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // 初始化视图
      this.initView();
      
      // 设置全局事件监听器
      this.setupGlobalEventListeners();
      
      // 应用设置
      this.applySettings();
      
      // 显示欢迎消息
      this.showWelcomeMessage();
      
      this.isInitialized = true;
      console.log('Epic Todo List 初始化完成');
      
    } catch (error) {
      console.error('应用程序初始化失败:', error);
      this.showError('应用程序初始化失败', error.message);
    }
  }

  /**
   * 检查浏览器兼容性
   */
  checkBrowserCompatibility() {
    const requiredFeatures = [
      'localStorage',
      'Promise',
      'fetch',
      'CustomEvent',
      'EventTarget'
    ];
    
    const missingFeatures = requiredFeatures.filter(feature => {
      switch (feature) {
        case 'localStorage':
          return typeof Storage === 'undefined';
        case 'Promise':
          return typeof Promise === 'undefined';
        case 'fetch':
          return typeof fetch === 'undefined';
        case 'CustomEvent':
          return typeof CustomEvent === 'undefined';
        case 'EventTarget':
          return typeof EventTarget === 'undefined';
        default:
          return typeof window[feature] === 'undefined';
      }
    });
    
    if (missingFeatures.length > 0) {
      throw new Error(`浏览器不支持以下功能: ${missingFeatures.join(', ')}`);
    }
    
    // 检查ES6模块支持
    if (!window.HTMLScriptElement || !('noModule' in HTMLScriptElement.prototype)) {
      console.warn('浏览器对ES6模块支持有限，可能会影响功能');
    }
  }

  /**
   * 加载应用设置
   */
  async loadSettings() {
    try {
      this.settings = this.storageManager.loadSettings();
      console.log('应用设置加载成功:', this.settings);
    } catch (error) {
      console.warn('设置加载失败，使用默认设置:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * 获取默认设置
   */
  getDefaultSettings() {
    return {
      theme: 'light',
      autoSave: true,
      showCompletedTasks: true,
      taskAnimation: true,
      soundEffects: false,
      lastFilter: 'all',
      language: 'zh-CN',
      dateFormat: 'locale'
    };
  }

  /**
   * 初始化视图
   */
  initView() {
    this.view = new TaskView(this.taskManager);
    
    // 恢复上次的过滤器状态
    if (this.settings.lastFilter) {
      this.taskManager.setFilter(this.settings.lastFilter);
    }
  }

  /**
   * 设置全局事件监听器
   */
  setupGlobalEventListeners() {
    // 监听任务管理器事件
    this.taskManager.addEventListener('tasksChanged', () => {
      if (this.settings.autoSave) {
        this.taskManager.saveTasks();
      }
    });
    
    this.taskManager.addEventListener('filterChanged', (e) => {
      // 保存过滤器状态
      this.settings.lastFilter = e.detail.filter;
      this.saveSettings();
    });
    
    // 监听窗口事件
    window.addEventListener('beforeunload', (e) => {
      this.handleBeforeUnload(e);
    });
    
    window.addEventListener('online', () => {
      this.view.toast.show('网络连接已恢复', 'success', 2000);
    });
    
    window.addEventListener('offline', () => {
      this.view.toast.show('网络连接已断开，应用将继续在离线模式下工作', 'warning', 3000);
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handlePageVisible();
      } else {
        this.handlePageHidden();
      }
    });
    
    // 监听错误事件
    window.addEventListener('error', (e) => {
      console.error('全局错误:', e.error);
      this.handleGlobalError(e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      console.error('未处理的Promise错误:', e.reason);
      this.handleGlobalError(e.reason);
    });
  }

  /**
   * 应用设置
   */
  applySettings() {
    // 应用主题
    this.applyTheme(this.settings.theme);
    
    // 应用动画设置
    document.body.classList.toggle('no-animations', !this.settings.taskAnimation);
    
    // 应用其他设置...
  }

  /**
   * 应用主题
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    console.log(`应用主题: ${theme}`);
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      this.storageManager.saveSettings(this.settings);
    } catch (error) {
      console.warn('设置保存失败:', error);
    }
  }

  /**
   * 处理页面卸载前事件
   */
  handleBeforeUnload(e) {
    // 如果有未保存的更改，提醒用户
    if (this.settings.autoSave) {
      this.taskManager.saveTasks();
      this.saveSettings();
    } else {
      const hasUnsavedChanges = this.checkUnsavedChanges();
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    }
  }

  /**
   * 检查未保存的更改
   */
  checkUnsavedChanges() {
    // 这里可以实现更复杂的检查逻辑
    return false;
  }

  /**
   * 处理页面可见
   */
  handlePageVisible() {
    console.log('页面变为可见');
    // 可以在这里刷新数据或检查更新
  }

  /**
   * 处理页面隐藏
   */
  handlePageHidden() {
    console.log('页面变为隐藏');
    // 保存当前状态
    if (this.settings.autoSave) {
      this.taskManager.saveTasks();
      this.saveSettings();
    }
  }

  /**
   * 处理全局错误
   */
  handleGlobalError(error) {
    if (this.view && this.view.toast) {
      this.view.toast.show(
        '应用程序遇到了一个错误，但仍会继续运行',
        'error',
        5000
      );
    }
    
    // 可以在这里添加错误报告逻辑
    this.reportError(error);
  }

  /**
   * 错误报告（可选功能）
   */
  reportError(error) {
    // 这里可以实现错误报告功能
    console.log('错误报告:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * 显示欢迎消息
   */
  showWelcomeMessage() {
    const stats = this.taskManager.getStats();
    const isFirstTime = stats.total === 0;
    
    if (isFirstTime) {
      setTimeout(() => {
        this.view.toast.show(
          '欢迎使用 Epic Todo List！开始添加您的第一个任务吧。',
          'info',
          4000
        );
      }, 1000);
    } else {
      setTimeout(() => {
        this.view.toast.show(
          `欢迎回来！您有 ${stats.active} 个待办任务。`,
          'info',
          3000
        );
      }, 500);
    }
  }

  /**
   * 显示错误消息
   */
  showError(title, message) {
    // 创建简单的错误显示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      padding: 16px 24px;
      max-width: 500px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 8px 0; color: #c33;">${title}</h3>
      <p style="margin: 0; color: #666;">${message}</p>
      <button onclick="this.parentElement.remove()" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
      ">&times;</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 5秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.parentElement.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * 获取应用信息
   */
  getAppInfo() {
    return {
      name: 'Epic Todo List',
      version: this.version,
      author: '乔帅',
      description: '现代化的待办事项管理应用',
      buildDate: '2024-01-01',
      repository: 'https://github.com/qiaoshuai/epic-todo-list',
      license: 'MIT',
      dependencies: {
        'native-html': '现代HTML5',
        'native-css': 'CSS3 + 自定义属性',
        'native-js': 'ES6+ 模块化'
      },
      features: [
        '响应式设计',
        '离线功能',
        '数据导入导出',
        '键盘快捷键',
        '无障碍访问',
        '多语言支持',
        '主题切换'
      ]
    };
  }

  /**
   * 显示应用信息
   */
  showAbout() {
    const info = this.getAppInfo();
    const aboutHtml = `
      <div class="about-content">
        <h3>${info.name} v${info.version}</h3>
        <p><strong>作者:</strong> ${info.author}</p>
        <p><strong>描述:</strong> ${info.description}</p>
        <p><strong>构建日期:</strong> ${info.buildDate}</p>
        
        <h4>技术栈:</h4>
        <ul>
          ${Object.entries(info.dependencies).map(([key, value]) => 
            `<li><strong>${key}:</strong> ${value}</li>`
          ).join('')}
        </ul>
        
        <h4>功能特性:</h4>
        <ul>
          ${info.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
        
        <p><small>
          <a href="${info.repository}" target="_blank">GitHub 仓库</a> | 
          许可证: ${info.license}
        </small></p>
      </div>
    `;
    
    this.view.modal.show({
      title: '关于应用',
      body: aboutHtml,
      buttons: [
        {
          text: '关闭',
          primary: true,
          action: () => this.view.modal.close()
        }
      ]
    });
  }

  /**
   * 重启应用
   */
  restart() {
    console.log('重启应用程序...');
    window.location.reload();
  }

  /**
   * 重置应用数据
   */
  async resetApp() {
    const confirmed = await this.view.modal.confirm(
      '这将删除所有任务和设置数据，确定要继续吗？\n\n此操作无法撤销！',
      '重置应用数据'
    );
    
    if (confirmed) {
      try {
        this.storageManager.clearAllData();
        this.taskManager.reset();
        this.settings = this.getDefaultSettings();
        this.applySettings();
        
        this.view.toast.show('应用数据已重置', 'success', 3000);
        
        setTimeout(() => {
          this.showWelcomeMessage();
        }, 1000);
        
      } catch (error) {
        this.view.toast.show(`重置失败: ${error.message}`, 'error');
      }
    }
  }
}

/**
 * 应用程序入口点
 */
async function main() {
  try {
    // 创建应用实例
    const app = new EpicTodoApp();
    
    // 将应用实例挂载到全局对象（用于调试）
    window.epicTodoApp = app;
    
    // 初始化应用
    await app.init();
    
    // 开发模式下的额外功能
    if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      console.log('开发模式已启用');
      console.log('可用的全局对象:', {
        epicTodoApp: app,
        taskManager: app.taskManager,
        storageManager: app.storageManager
      });
    }
    
  } catch (error) {
    console.error('应用程序启动失败:', error);
    
    // 显示启动失败页面
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        text-align: center;
        background: #f8f9fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      ">
        <h1 style="color: #dc3545; margin-bottom: 20px;">应用启动失败</h1>
        <p style="color: #6c757d; margin-bottom: 20px; max-width: 500px;">
          Epic Todo List 无法正常启动。请检查您的浏览器是否支持现代JavaScript功能。
        </p>
        <details style="margin-bottom: 20px; max-width: 500px;">
          <summary style="cursor: pointer; color: #007bff;">查看错误详情</summary>
          <pre style="
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            text-align: left;
            overflow: auto;
            font-size: 12px;
          ">${error.stack || error.message}</pre>
        </details>
        <button onclick="window.location.reload()" style="
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 16px;
        ">重新加载页面</button>
      </div>
    `;
  }
}

// 启动应用
main();

// 导出应用类（用于测试或扩展）
export default EpicTodoApp;