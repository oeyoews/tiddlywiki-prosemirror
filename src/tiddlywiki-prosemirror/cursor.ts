import { Plugin, PluginKey } from 'prosemirror-state';
import config from './config';

// 创建光标样式插件
export const cursorStylePlugin = new Plugin({
  key: new PluginKey('cursorStyle'),
  
  view(editorView) {
    // 创建样式元素
    const styleElement = document.createElement('style');
    styleElement.id = 'prosemirror-cursor-style';
    document.head.appendChild(styleElement);
    
    // 更新光标样式
    const updateCursorStyle = () => {
      if (config.boldCursorEnabled()) {
        const cursorColor = config.getCursorColor();
        styleElement.textContent = `
          .ProseMirror .ProseMirror-cursor {
            border-left: 2px solid ${cursorColor} !important;
          }
          
          @keyframes cursor-blink {
            from, to {
              border-left-color: ${cursorColor};
            }
            50% {
              border-left-color: transparent;
            }
          }
        `;
      } else {
        styleElement.textContent = '';
      }
    };
    
    // 初始化光标样式
    updateCursorStyle();
    
    return {
      update() {
        // 更新光标样式
        updateCursorStyle();
      },
      
      destroy() {
        // 移除样式元素
        if (styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
        }
      }
    };
  }
});
