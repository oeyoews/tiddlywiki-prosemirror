import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet, Decoration } from 'prosemirror-view';
import config from './config';

// 创建占位符插件
export const placeholderPlugin = new Plugin({
  key: new PluginKey('placeholder'),
  
  props: {
    // 添加装饰器
    decorations(state) {
      const { doc } = state;
      
      // 检查文档是否为空
      const isEmpty = doc.childCount === 1 && 
                      doc.firstChild?.childCount === 0 || 
                      (doc.firstChild?.childCount === 1 && 
                       doc.firstChild.firstChild?.text === '');
      
      if (isEmpty) {
        // 获取占位符文本
        const placeholderText = config.getPlaceholder();
        
        // 创建装饰器
        const decoration = Decoration.widget(1, () => {
          // 创建占位符元素
          const placeholder = document.createElement('span');
          placeholder.className = 'prosemirror-placeholder';
          placeholder.textContent = placeholderText;
          placeholder.style.cssText = `
            position: absolute;
            color: #aaa;
            pointer-events: none;
            user-select: none;
          `;
          return placeholder;
        }, { key: 'placeholder' });
        
        return DecorationSet.create(doc, [decoration]);
      }
      
      return DecorationSet.empty;
    }
  }
});
