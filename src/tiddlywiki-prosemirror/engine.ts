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
import 'prosemirror-view/style/prosemirror.css';

interface IOptions {
  widget: IWidget;
  parentNode: Node;
  nextSibling: Node;
  value?: string;
  type?: string;
  onChange?: (content: { markdown: string; plainText: string }) => void;
}

// 定义事件类型
type EditorEventType = 'change' | 'focus' | 'blur' | 'keydown' | 'keyup';

// 定义事件监听器类型
type EditorEventListener = (data: any) => void;

class ProseMirrorEngine {
  domNode: TW_Element;
  parentNode: Node;
  nextSibling: Node;

  private widget: IWidget;
  private editor: EditorView;
  private state: EditorState;
  private dragCancel: boolean = false;
  private eventListeners: Map<EditorEventType, Set<EditorEventListener>> =
    new Map();
  private onChange:
    | ((content: { markdown: string; plainText: string }) => void)
    | undefined;

  constructor(options = {} as IOptions) {
    this.widget = options.widget;
    this.parentNode = options.parentNode;
    this.nextSibling = options.nextSibling;
    this.onChange = options.onChange;

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

    // 初始化ProseMirror状态
    const plugins = [keymap(baseKeymap)];

    // 添加快捷键支持
    if (config.keyboardShortcutsEnabled()) {
      plugins.push(editorKeymap);
    }

    // 添加Markdown输入规则 - 始终启用以确保 ## 等语法正常工作
    plugins.push(markdownInputRules);

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
        const oldState = this.editor.state;
        const newState = oldState.apply(transaction);
        this.editor.updateState(newState);

        // 如果内容发生变化
        if (transaction.docChanged) {
          // 获取 Markdown 文本内容
          const markdownContent = docToText(newState.doc);

          // 调用 saveChanges 并传递 Markdown 文本
          if (this.widget.saveChanges) {
            this.widget.saveChanges(markdownContent);
            // console.log('保存的 Markdown 内容:', markdownContent);
          }

          // 根据配置决定是否自动保存
          if (config.autoSave() && this.widget.saveChanges) {
            this.widget.saveChanges(markdownContent);
          }
        } else {
          // console.log('文档内容未更改，可能是选择或其他非内容变更');
        }
      },
      // 处理焦点事件
      handleDOMEvents: {}
    });

    // 存储实例在DOM元素上
    // this.domNode.prosemirror = this.editor;
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
    const keyboardWidgets: IWidget[] = [];
    while (widget) {
      if (widget.parseTreeNode.type === 'keyboard') {
        keyboardWidgets.push(widget);
      }
      widget = widget.parentWidget as IWidget;
    }
    if (keyboardWidgets.length > 0) {
      let handled: boolean | undefined = undefined;
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

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  addEventListener(eventType: EditorEventType, listener: EditorEventListener) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  removeEventListener(
    eventType: EditorEventType,
    listener: EditorEventListener
  ) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }
}

// 在浏览器环境中使用ProseMirrorEngine，否则使用SimpleEngine
// 注意：这里不能使用import语法，因为TiddlyWiki的模块系统需要使用require
const { SimpleEngine } = require('$:/core/modules/editor/engines/simple.js');

exports.ProseMirrorEngine = $tw.browser ? ProseMirrorEngine : SimpleEngine;
