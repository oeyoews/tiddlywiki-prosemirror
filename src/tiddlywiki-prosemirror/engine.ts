import { Schema } from 'prosemirror-model';
import config from './config';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { inputRules } from 'prosemirror-inputrules';
import { IWidget, TW_Element } from './types';

// 扩展基本schema，添加列表节点
const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks
});

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

    this.parentNode.insertBefore(this.domNode, this.nextSibling);
    this.widget.domNodes.push(this.domNode);

    this.domNode.className = this.widget.editClass ? this.widget.editClass : '';
    this.domNode.style.display = 'inline-block';

    // 初始化ProseMirror状态
    const plugins = [keymap(baseKeymap), inputRules({ rules: [] })];

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
      doc: schema.nodeFromJSON(
        options.value
          ? {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: options.value }]
                }
              ]
            }
          : { type: 'doc', content: [{ type: 'paragraph' }] }
      ),
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
        keyboardWidgets.push(widget);
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
      const doc = schema.nodeFromJSON({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: text }] }
        ]
      });
      transaction.replaceWith(0, this.editor.state.doc.content.size, doc);
      this.editor.dispatch(transaction);
    } catch (e) {
      console.warn('Error updating ProseMirror content:', e);
    }
  }

  /** @description Get the text of the engine */
  getText() {
    let text = '';
    this.editor.state.doc.descendants((node) => {
      if (node.isText) {
        text += node.text;
      }
      if (
        node.type.name === 'paragraph' &&
        text.length > 0 &&
        !text.endsWith('\n')
      ) {
        text += '\n';
      }
      return true;
    });
    return text;
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
