import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet, Decoration } from 'prosemirror-view';
import config from './config';

// 创建行号插件
export const lineNumbersPlugin = new Plugin({
  key: new PluginKey('lineNumbers'),
  
  props: {
    // 添加装饰器
    decorations(state) {
      if (!config.lineNumbersEnabled()) {
        return null;
      }
      
      const { doc } = state;
      const decorations: Decoration[] = [];
      
      // 为每个块级节点添加行号
      let lineNumber = 1;
      
      doc.forEach((node, pos) => {
        // 只为块级节点添加行号
        if (node.isBlock) {
          const dom = document.createElement('div');
          dom.className = 'prosemirror-line-number';
          dom.textContent = String(lineNumber++);
          
          // 创建行号装饰器
          const decoration = Decoration.widget(pos, dom, {
            key: `line-${pos}`,
            side: -1 // 在节点左侧显示
          });
          
          decorations.push(decoration);
        }
      });
      
      return DecorationSet.create(doc, decorations);
    }
  }
});

// 创建行号容器插件
export const lineNumbersContainerPlugin = new Plugin({
  key: new PluginKey('lineNumbersContainer'),
  
  view(editorView) {
    // 创建行号容器
    const lineNumbersContainer = document.createElement('div');
    lineNumbersContainer.className = 'prosemirror-line-numbers-container';
    
    // 将行号容器添加到编辑器容器
    const editorContainer = editorView.dom.parentNode as HTMLElement;
    if (editorContainer) {
      editorContainer.classList.add('prosemirror-editor-with-line-numbers');
      editorContainer.insertBefore(lineNumbersContainer, editorView.dom);
    }
    
    return {
      update() {
        // 更新行号容器的可见性
        if (config.lineNumbersEnabled()) {
          lineNumbersContainer.style.display = 'block';
          editorContainer?.classList.add('prosemirror-editor-with-line-numbers');
        } else {
          lineNumbersContainer.style.display = 'none';
          editorContainer?.classList.remove('prosemirror-editor-with-line-numbers');
        }
      },
      
      destroy() {
        // 移除行号容器
        if (lineNumbersContainer.parentNode) {
          lineNumbersContainer.parentNode.removeChild(lineNumbersContainer);
        }
        editorContainer?.classList.remove('prosemirror-editor-with-line-numbers');
      }
    };
  }
});
