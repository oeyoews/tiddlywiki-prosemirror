// ProseMirror配置
export default {
  // 获取配置项
  getConfig(name: string, defaultValue: any = '') {
    return (
      $tw.wiki.getTiddlerText(
        `$:/plugins/oeyoews/tiddlywiki-prosemirror/config/${name}`
      ) || defaultValue
    );
  },

  // 是否启用自动保存
  autoSave() {
    return this.getConfig('autoSave', 'yes') === 'yes';
  },

  // 是否启用历史记录
  historyEnabled() {
    return this.getConfig('historyEnabled', 'yes') === 'yes';
  },

  // 是否启用拖放光标
  dropCursorEnabled() {
    return this.getConfig('dropCursorEnabled', 'yes') === 'yes';
  },

  // 是否启用间隙光标
  gapCursorEnabled() {
    return this.getConfig('gapCursorEnabled', 'yes') === 'yes';
  },

  // 是否启用Markdown支持
  markdownEnabled() {
    return this.getConfig('markdownEnabled', 'yes') === 'yes';
  },

  // 是否自动检测Markdown
  autoDetectMarkdown() {
    return this.getConfig('autoDetectMarkdown', 'yes') === 'yes';
  },

  // 是否强制使用Markdown
  forceMarkdown() {
    // 默认返回 true，确保始终使用 Markdown 解析器
    return true;
    // 如果需要恢复配置控制，取消注释下面的行
    // return this.getConfig('forceMarkdown', 'yes') === 'yes';
  },

  // 是否启用斜杠命令
  slashCommandsEnabled() {
    return this.getConfig('slashCommandsEnabled', 'yes') === 'yes';
  },

  // 是否启用快捷键
  keyboardShortcutsEnabled() {
    return this.getConfig('keyboardShortcutsEnabled', 'yes') === 'yes';
  },

  // 是否启用占位符
  placeholderEnabled() {
    return this.getConfig('placeholderEnabled', 'yes') === 'yes';
  },

  // 获取占位符文本
  getPlaceholder() {
    return this.getConfig('placeholder', '在此输入内容...');
  },

  // 是否启用行号
  lineNumbersEnabled() {
    return this.getConfig('lineNumbersEnabled', 'no') === 'yes';
  },

  // 是否启用加粗光标
  boldCursorEnabled() {
    return this.getConfig('boldCursorEnabled', 'yes') === 'yes';
  },

  // 获取光标颜色
  getCursorColor() {
    return this.getConfig('cursorColor', '#000');
  },

  // 是否启用工具栏
  toolbarEnabled() {
    return this.getConfig('toolbarEnabled', 'no') === 'yes';
  },

  // 获取工具栏位置
  getToolbarPosition() {
    return this.getConfig('toolbarPosition', 'top');
  }
};
