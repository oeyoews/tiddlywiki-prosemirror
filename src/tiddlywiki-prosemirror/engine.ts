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

    // 添加控制台输出和导出方法
    if (typeof window !== 'undefined') {
      // 获取内容方法
      (window as any).getProseMirrorContent = () => {
        console.log('Markdown 内容:', this.getText());
        console.log('纯文本内容:', this.getPlainText());
        return {
          markdown: this.getText(),
          plainText: this.getPlainText()
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

      // 添加文档变化分析工具
      (window as any).analyzeProseMirrorChanges = () => {
        // 初始化分析状态
        console.log('初始文档内容:', docToText(this.editor.state.doc));

        // 添加变化监听器
        this.addEventListener('change', (data) => {
          const { transaction, oldState, newState } = data;

          console.group('ProseMirror 文档变化分析');

          // 输出基本信息
          console.log(
            '变化类型:',
            transaction.docChanged ? '内容变化' : '非内容变化'
          );
          console.log('步骤数量:', transaction.steps.length);

          // 分析步骤
          if (transaction.steps.length > 0) {
            transaction.steps.forEach((step, index) => {
              console.group(`步骤 ${index + 1} (${step.constructor.name})`);

              try {
                const stepJSON = step.toJSON();
                console.log('步骤数据:', stepJSON);

                // 根据步骤类型提供更详细的信息
                if (step.constructor.name === 'ReplaceStep') {
                  console.log('替换操作:');
                  console.log('- 从位置:', stepJSON.from);
                  console.log('- 到位置:', stepJSON.to);
                  if (stepJSON.slice) {
                    console.log('- 插入内容:', stepJSON.slice);
                  }
                } else if (step.constructor.name === 'AddMarkStep') {
                  console.log('添加标记操作:');
                  console.log('- 从位置:', stepJSON.from);
                  console.log('- 到位置:', stepJSON.to);
                  console.log('- 标记类型:', stepJSON.mark);
                } else if (step.constructor.name === 'RemoveMarkStep') {
                  console.log('移除标记操作:');
                  console.log('- 从位置:', stepJSON.from);
                  console.log('- 到位置:', stepJSON.to);
                  console.log('- 标记类型:', stepJSON.mark);
                }

                // 获取映射信息
                const map = step.getMap();
                console.log('位置映射:', map);
              } catch (e) {
                console.error('分析步骤时出错:', e);
              }

              console.groupEnd();
            });
          }

          // 比较文档差异
          console.group('文档差异');
          console.log('旧文档:', docToText(oldState.doc));
          console.log('新文档:', docToText(newState.doc));
          console.groupEnd();

          // 文档状态已更新

          console.groupEnd();
        });

        console.log('ProseMirror 文档变化分析工具已启用');
        console.log('所有文档变化将在控制台中显示详细信息');

        return '文档变化分析工具已启用';
      };

      // 添加事件监听方法
      (window as any).addProseMirrorEventListener = (
        eventType: EditorEventType,
        listener: EditorEventListener
      ) => {
        this.addEventListener(eventType, listener);
      };

      // 移除事件监听方法
      (window as any).removeProseMirrorEventListener = (
        eventType: EditorEventType,
        listener: EditorEventListener
      ) => {
        this.removeEventListener(eventType, listener);
      };

      console.group('ProseMirror 编辑器已初始化');
      console.log('可以使用以下方法：');
      console.log('- getProseMirrorContent(): 获取编辑器内容');
      console.log('- exportProseMirrorContent(format): 导出并复制编辑器内容');
      console.log(
        '- saveProseMirrorContent(format, filename): 保存编辑器内容到文件'
      );
      console.log(
        '- addProseMirrorEventListener(eventType, listener): 添加事件监听器'
      );
      console.log(
        '- removeProseMirrorEventListener(eventType, listener): 移除事件监听器'
      );
      console.log('- analyzeProseMirrorChanges(): 启用文档变化分析工具');

      console.log('\n文档变化分析:');
      console.log(
        '在控制台中运行 analyzeProseMirrorChanges() 可以启用详细的文档变化分析'
      );
      console.log('这将显示每次编辑操作的详细信息，包括:');
      console.log('- 变化类型（内容变化或非内容变化）');
      console.log('- 步骤数量和类型');
      console.log('- 每个步骤的详细信息');
      console.log('- 变化前后的文档内容');

      console.log('\n示例:');
      console.log('1. 在控制台中运行: analyzeProseMirrorChanges()');
      console.log('2. 在编辑器中进行一些编辑操作');
      console.log('3. 查看控制台中的详细日志');
      console.groupEnd();
    }

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

    console.log(options.value, 'vanilla text');
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

        // 输出 docChanged 相关日志
        console.group('ProseMirror Transaction');
        console.log('Transaction:', transaction);
        console.log('docChanged:', transaction.docChanged);

        // 如果有步骤，输出步骤信息
        if (transaction.steps.length > 0) {
          console.log('Steps:', transaction.steps);
          console.log('Steps Count:', transaction.steps.length);

          // 输出每个步骤的详细信息
          transaction.steps.forEach((step, index) => {
            console.group(`Step ${index + 1}`);
            console.log('Step Type:', step.constructor.name);
            console.log('Step JSON:', step.toJSON());
            console.log('Step Map:', step.getMap());
            console.groupEnd();
          });
        }

        // 尝试获取事务的元数据（如果可能）
        try {
          // 使用 Object.keys 检查事务对象上的属性
          const transactionKeys = Object.keys(transaction);
          if (
            transactionKeys.includes('meta') ||
            transactionKeys.includes('_meta')
          ) {
            console.log('Transaction 可能包含元数据');
          }
        } catch (e) {
          console.log('无法访问事务元数据');
        }

        console.groupEnd();

        // 如果内容发生变化
        if (transaction.docChanged) {
          console.log('文档内容已更改!');
          console.log(this.widget);

          // 获取变更前后的内容
          const oldContent = docToText(oldState.doc);
          const newContent = docToText(newState.doc);

          // 输出变更前后的内容
          console.group('文档内容变更');
          console.log('变更前 (Markdown):', oldContent);
          console.log('变更后 (Markdown):', newContent);
          console.log('变更前 (纯文本):', extractPlainText(oldState.doc));
          console.log('变更后 (纯文本):', extractPlainText(newState.doc));
          console.groupEnd();

          // 触发change事件
          this.triggerEvent('change', {
            transaction,
            oldState,
            newState,
            content: {
              markdown: newContent,
              plainText: extractPlainText(newState.doc)
            }
          });

          // 获取 Markdown 文本内容
          const markdownContent = docToText(newState.doc);

          // 调用 saveChanges 并传递 Markdown 文本
          if (this.widget.saveChanges) {
            this.widget.saveChanges(markdownContent);
            console.log('保存的 Markdown 内容:', markdownContent);
          }

          // 根据配置决定是否自动保存
          if (config.autoSave() && this.widget.saveChanges) {
            this.widget.saveChanges(markdownContent);
          }
        } else {
          console.log('文档内容未更改，可能是选择或其他非内容变更');
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
        // 我们知道这个API已经废弃，但它仍然是一个有用的后备方案
        // eslint-disable-next-line deprecation/deprecation
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

  /**
   * 触发事件
   * @param eventType 事件类型
   * @param data 事件数据
   */
  private triggerEvent(eventType: EditorEventType, data: any) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error(`Error in ${eventType} event listener:`, e);
        }
      });
    }

    // 如果是内容变化事件，同时调用onChange回调
    if (eventType === 'change' && this.onChange) {
      try {
        this.onChange({
          markdown: this.getText(),
          plainText: this.getPlainText()
        });
      } catch (e) {
        console.error('Error in onChange callback:', e);
      }
    }
  }
}

// 在浏览器环境中使用ProseMirrorEngine，否则使用SimpleEngine
// 注意：这里不能使用import语法，因为TiddlyWiki的模块系统需要使用require
const { SimpleEngine } = require('$:/core/modules/editor/engines/simple.js');

exports.ProseMirrorEngine = $tw.browser ? ProseMirrorEngine : SimpleEngine;
