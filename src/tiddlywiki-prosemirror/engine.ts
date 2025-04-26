import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { IWidget, TW_Element } from './types';
import config from './config';
import schema from './schema';
import { textToDoc, docToText, extractPlainText } from './markdown';
import { markdownInputRules } from './input-rules';
import { slashCommandsPlugin } from './slash-commands';
import { editorKeymap } from './keyboard';
import { taskListPlugin } from './task-list';
import { placeholderPlugin } from './placeholder';
import { lineNumbersPlugin, lineNumbersContainerPlugin } from './line-numbers';
import { cursorStylePlugin } from './cursor';

interface IOptions {
  widget: IWidget;
  parentNode: Node;
  nextSibling: Node;
  value?: string;
  type?: string;
}

class ProseMirrorEngine {
  domNode: TW_Element;
  parentNode: Node;
  nextSibling: Node;

  private widget: IWidget;
  private editor: EditorView;
  private state: EditorState;
  private dragCancel: boolean = false;

  constructor(options = {} as IOptions) {
    this.widget = options.widget;
    this.parentNode = options.parentNode;
    this.nextSibling = options.nextSibling;

    this.domNode = this.widget.document.createElement('div');
    this.domNode.style.overflow = 'auto';
    this.domNode.className = 'prosemirror-editor-container';
    this.domNode.style.minHeight = '200px'; // 设置最小高度
    this.domNode.style.height = 'auto'; // 允许自动增长

    this.parentNode.insertBefore(this.domNode, this.nextSibling);
    this.widget.domNodes.push(this.domNode);

    if (this.widget.editClass) {
      this.domNode.className += ' ' + this.widget.editClass;
    }
    this.domNode.style.display = 'block'; // 改为块级显示，占据整行

    // 添加控制台输出和导出方法
    if (typeof window !== 'undefined') {
      // 获取内容方法
      (window as any).getProseMirrorContent = () => {
        console.log('Markdown 内容:', this.getText());
        console.log('纯文本内容:', this.getPlainText());
        return {
          markdown: this.getText()
          // plainText: this.getPlainText()
        };
      };

      // 导出内容方法
      (window as any).exportProseMirrorContent = async (
        format: 'markdown' | 'plaintext' = 'markdown'
      ) => {
        return await this.exportContent(format);
      };

      // 保存内容到文件方法
      (window as any).saveProseMirrorContent = (
        format: 'markdown' | 'plaintext' = 'markdown',
        filename?: string
      ) => {
        return this.saveContentToFile(format, filename);
      };

      console.log('ProseMirror 编辑器已初始化。可以使用以下方法：');
      console.log('- getProseMirrorContent(): 获取编辑器内容');
      console.log('- exportProseMirrorContent(format): 导出并复制编辑器内容');
      console.log(
        '- saveProseMirrorContent(format, filename): 保存编辑器内容到文件'
      );
    }

    // 初始化ProseMirror状态
    const plugins = [keymap(baseKeymap)];

    // 添加快捷键支持
    if (config.keyboardShortcutsEnabled()) {
      plugins.push(editorKeymap);
    }

    // 添加Markdown输入规则
    if (config.markdownEnabled()) {
      plugins.push(markdownInputRules);
    }

    // 添加斜杠命令支持
    if (config.slashCommandsEnabled()) {
      plugins.push(slashCommandsPlugin);
    }

    // 添加任务列表支持
    plugins.push(taskListPlugin);

    // 添加占位符支持
    if (config.placeholderEnabled()) {
      plugins.push(placeholderPlugin);
    }

    // 添加行号支持
    if (config.lineNumbersEnabled()) {
      plugins.push(lineNumbersPlugin);
      plugins.push(lineNumbersContainerPlugin);
    }

    // 添加光标样式支持
    if (config.boldCursorEnabled()) {
      plugins.push(cursorStylePlugin);
    }

    // 根据配置添加插件
    if (config.historyEnabled()) {
      plugins.push(history());
    }

    if (config.dropCursorEnabled()) {
      plugins.push(dropCursor());
    }

    if (config.gapCursorEnabled()) {
      plugins.push(gapCursor());
    }

    this.state = EditorState.create({
      schema,
      // 使用markdown模块处理初始文本
      doc: options.value
        ? textToDoc(options.value)
        : schema.nodeFromJSON({
            type: 'doc',
            content: [{ type: 'paragraph' }]
          }),
      plugins: plugins
    });

    // 创建ProseMirror编辑器实例
    this.editor = new EditorView(this.domNode, {
      state: this.state,
      dispatchTransaction: (transaction) => {
        const newState = this.editor.state.apply(transaction);
        this.editor.updateState(newState);
        // 如果内容发生变化，根据配置决定是否自动保存
        if (transaction.docChanged && config.autoSave()) {
          this.widget.saveChanges && this.widget.saveChanges();
        }
      }
    });

    // 存储实例在DOM元素上
    this.domNode.prosemirror = this.editor;
  }

  handleDropEvent(event: DragEvent) {
    if (!this.widget.isFileDropEnabled) {
      event.stopPropagation();
      return false;
    }
    if (
      $tw.utils.dragEventContainsFiles(event) ||
      event.dataTransfer?.files.length
    ) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  handleDragEnterEvent() {
    return false;
  }

  handleKeydownEvent(e: KeyboardEvent) {
    if ($tw.keyboardManager.handleKeydownEvent(e, { onlyPriority: true })) {
      this.dragCancel = false;
      return true;
    }

    // 处理特殊键盘快捷键
    if (e.ctrlKey && e.key === 's') {
      e.stopPropagation();
      return false;
    }

    let widget = this.widget;
    const keyboardWidgets = [];
    while (widget) {
      if (widget.parseTreeNode.type === 'keyboard') {
        (keyboardWidgets as IWidget[]).push(widget);
      }
      widget = widget.parentWidget as IWidget;
    }
    if (keyboardWidgets.length > 0) {
      let handled = undefined;
      for (let i = 0; i < keyboardWidgets.length; i++) {
        const keyboardWidget = keyboardWidgets[i];
        const keyInfoArray = keyboardWidget.keyInfoArray || [];
        if ($tw.keyboardManager.checkKeyDescriptors(e, keyInfoArray)) {
          if (
            this.dragCancel &&
            $tw.keyboardManager
              .getPrintableShortcuts(keyInfoArray)
              .indexOf('Escape') !== -1
          ) {
            handled = false;
          } else {
            handled = true;
          }
        }
      }
      if (handled) {
        this.dragCancel = false;
        return true;
      } else if (handled === false) {
        e.stopPropagation();
        this.dragCancel = false;
        return true;
      }
    }
    this.dragCancel = false;
    return this.widget.handleKeydownEvent.call(this.widget, e);
  }

  /** @description Set the text of the engine if it doesn't currently have focus */
  setText(text: string) {
    if (!this.editor.hasFocus) {
      this.updateDomNodeText(text);
    }
  }

  /** @description Update the DomNode with the new text */
  updateDomNodeText(text: string) {
    try {
      const transaction = this.editor.state.tr;
      // 使用markdown模块处理文本
      const doc = textToDoc(text);
      transaction.replaceWith(0, this.editor.state.doc.content.size, doc);
      this.editor.dispatch(transaction);
    } catch (e) {
      console.warn('Error updating ProseMirror content:', e);
    }
  }

  /** @description Get the text of the engine */
  getText() {
    // 使用markdown模块处理文档
    return docToText(this.editor.state.doc);
  }

  /** @description Get the plain text content of the editor */
  getPlainText() {
    // 提取纯文本内容
    return extractPlainText(this.editor.state.doc);
  }

  /** @description Export the editor content in different formats */
  async exportContent(format: 'markdown' | 'plaintext' = 'markdown') {
    const content =
      format === 'markdown' ? this.getText() : this.getPlainText();

    // 使用现代的Clipboard API复制到剪贴板
    try {
      await navigator.clipboard.writeText(content);
      console.log('内容已复制到剪贴板');
    } catch (err) {
      console.error('无法复制到剪贴板:', err);

      // 回退到旧方法
      try {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        // 使用废弃的API作为后备方案
        const success = document.execCommand('copy');
        if (success) {
          console.log('使用旧方法复制成功');
        } else {
          console.warn('复制失败');
        }

        document.body.removeChild(textarea);
      } catch (e) {
        console.error('复制失败:', e);
      }
    }

    // 返回内容
    return content;
  }

  /** @description Save the editor content to a file */
  saveContentToFile(
    format: 'markdown' | 'plaintext' = 'markdown',
    filename?: string
  ) {
    const content =
      format === 'markdown' ? this.getText() : this.getPlainText();
    const defaultFilename =
      format === 'markdown' ? 'content.md' : 'content.txt';
    const file = filename || defaultFilename;

    // 创建一个Blob对象
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    // 创建一个下载链接
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file;

    // 触发点击事件下载文件
    document.body.appendChild(a);
    a.click();

    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    return content;
  }

  /** @description Fix the height of textarea to fit content */
  fixHeight() {
    // ProseMirror会自动调整高度
  }

  /* Focus the engine node */
  focus() {
    this.editor.focus();
  }

  /** @description Create a blank structure representing a text operation */
  createTextOperation(_type: string) {
    const { from, to } = this.editor.state.selection;
    const text = this.getText();

    return {
      text: text,
      selStart: from,
      selEnd: to,
      cutStart: null,
      cutEnd: null,
      replacement: null,
      newSelStart: null,
      newSelEnd: null,
      selection: text.substring(from, to)
    };
  }

  /* Execute a text operation */
  executeTextOperation(operations: any) {
    if (operations.type && operations.type === 'undo') {
      undo(this.editor.state, this.editor.dispatch);
    } else if (operations.type && operations.type === 'redo') {
      redo(this.editor.state, this.editor.dispatch);
    } else if (operations.type && operations.type === 'search') {
      // ProseMirror没有内置的搜索面板，需要自定义实现
    } else if (
      operations.type !== 'focus-editor' &&
      operations &&
      operations.cutStart &&
      operations.cutEnd &&
      operations.newSelStart &&
      operations.newSelEnd &&
      operations.replacement
    ) {
      const transaction = this.editor.state.tr;
      transaction.replaceWith(
        operations.cutStart,
        operations.cutEnd,
        schema.text(operations.replacement)
      );

      // 使用TextSelection创建有效的选择
      const { TextSelection } = require('prosemirror-state');
      transaction.setSelection(
        TextSelection.create(
          transaction.doc,
          operations.newSelStart,
          operations.newSelEnd
        )
      );
      this.editor.dispatch(transaction);
    }
    this.editor.focus();
    return this.getText();
  }
}

// 在浏览器环境中使用ProseMirrorEngine，否则使用SimpleEngine
// 注意：这里不能使用import语法，因为TiddlyWiki的模块系统需要使用require
const { SimpleEngine } = require('$:/core/modules/editor/engines/simple.js');

exports.ProseMirrorEngine = $tw.browser ? ProseMirrorEngine : SimpleEngine;
