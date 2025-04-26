import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import {
  MenuItem,
  Dropdown,
  DropdownSubmenu,
  MenuElement,
  icons,
  menuBar
} from 'prosemirror-menu';
import { wrapItem, blockTypeItem } from 'prosemirror-menu';
import schema from './schema';
import config from './config';

// 创建图标对象
const customIcons = (() => {
  // 检查是否在浏览器环境中
  if (
    typeof $tw !== 'undefined' &&
    !$tw.node &&
    typeof document !== 'undefined'
  ) {
    return {
      // 使用基本图标
      ...icons,
      // 添加自定义图标
      strikethrough: {
        dom: (() => {
          const span = document.createElement('span');
          span.textContent = 'S';
          span.style.textDecoration = 'line-through';
          return span;
        })(),
        css: 'font-weight: bold'
      },
      heading1: {
        dom: (() => {
          const span = document.createElement('span');
          span.textContent = 'H1';
          span.style.fontWeight = 'bold';
          return span;
        })()
      },
      heading2: {
        dom: (() => {
          const span = document.createElement('span');
          span.textContent = 'H2';
          span.style.fontWeight = 'bold';
          return span;
        })()
      },
      heading3: {
        dom: (() => {
          const span = document.createElement('span');
          span.textContent = 'H3';
          span.style.fontWeight = 'bold';
          return span;
        })()
      },
      taskList: {
        dom: (() => {
          const span = document.createElement('span');
          span.textContent = '☐';
          return span;
        })()
      },
      // 确保所有需要的图标都存在
      bulletList: icons.bulletList,
      orderedList: icons.orderedList,
      blockquote: icons.blockquote,
      strong: icons.strong,
      em: icons.em,
      code: icons.code
    };
  } else {
    // 在 Node 环境中返回基本图标
    return { ...icons };
  }
})();

// 创建文本格式菜单项
function buildTextFormattingMenu() {
  const markItems: MenuElement[] = [];

  // 加粗
  markItems.push(
    new MenuItem({
      title: '加粗',
      icon: customIcons.strong,
      active: (state) => {
        return state.doc.rangeHasMark(
          state.selection.from,
          state.selection.to,
          schema.marks.strong
        );
      },
      run: toggleMark(schema.marks.strong)
    })
  );

  // 斜体
  markItems.push(
    new MenuItem({
      title: '斜体',
      icon: customIcons.em,
      active: (state) => {
        return state.doc.rangeHasMark(
          state.selection.from,
          state.selection.to,
          schema.marks.em
        );
      },
      run: toggleMark(schema.marks.em)
    })
  );

  // 删除线
  markItems.push(
    new MenuItem({
      title: '删除线',
      icon: customIcons.strikethrough,
      active: (state) => {
        return state.doc.rangeHasMark(
          state.selection.from,
          state.selection.to,
          schema.marks.strikethrough
        );
      },
      run: toggleMark(schema.marks.strikethrough)
    })
  );

  // 代码
  markItems.push(
    new MenuItem({
      title: '代码',
      icon: customIcons.code,
      active: (state) => {
        return state.doc.rangeHasMark(
          state.selection.from,
          state.selection.to,
          schema.marks.code
        );
      },
      run: toggleMark(schema.marks.code)
    })
  );

  return markItems;
}

// 创建块级格式菜单项
function buildBlockFormattingMenu() {
  const blockItems: MenuElement[] = [];

  // 段落
  blockItems.push(
    blockTypeItem(schema.nodes.paragraph, {
      title: '段落',
      label: '段落'
    })
  );

  // 标题下拉菜单
  const headingItems: MenuElement[] = [];

  // 一级标题
  headingItems.push(
    blockTypeItem(schema.nodes.heading, {
      title: '一级标题',
      label: 'H1',
      attrs: { level: 1 },
      icon: customIcons.heading1
    })
  );

  // 二级标题
  headingItems.push(
    blockTypeItem(schema.nodes.heading, {
      title: '二级标题',
      label: 'H2',
      attrs: { level: 2 },
      icon: customIcons.heading2
    })
  );

  // 三级标题
  headingItems.push(
    blockTypeItem(schema.nodes.heading, {
      title: '三级标题',
      label: 'H3',
      attrs: { level: 3 },
      icon: customIcons.heading3
    })
  );

  // 添加标题下拉菜单
  blockItems.push(new Dropdown(headingItems, { label: '标题' }));

  // 引用
  blockItems.push(
    wrapItem(schema.nodes.blockquote, {
      title: '引用',
      icon: customIcons.blockquote
    })
  );

  // 代码块
  blockItems.push(
    blockTypeItem(schema.nodes.code_block, {
      title: '代码块',
      label: '代码',
      icon: customIcons.code
    })
  );

  return blockItems;
}

// 创建列表菜单项
function buildListMenu() {
  const listItems: MenuElement[] = [];

  // 无序列表
  listItems.push(
    wrapItem(schema.nodes.bullet_list, {
      title: '无序列表',
      icon: customIcons.bulletList
    })
  );

  // 有序列表
  listItems.push(
    wrapItem(schema.nodes.ordered_list, {
      title: '有序列表',
      icon: customIcons.orderedList
    })
  );

  // 任务列表
  listItems.push(
    new MenuItem({
      title: '任务列表',
      icon: customIcons.taskList,
      run: (state, dispatch) => {
        const { $from } = state.selection;
        const taskItemType = schema.nodes.task_item;

        // 创建任务列表项
        if (dispatch) {
          const tr = state.tr;
          const range = $from.blockRange($from);
          if (!range) return false;

          // 获取当前段落内容
          const content = range.parent.content;

          // 创建任务列表项节点
          const taskItem = taskItemType.create({ checked: false }, content);

          // 替换当前段落为任务列表项
          tr.replaceWith(range.start, range.end, taskItem);
          dispatch(tr);
        }
        return true;
      },
      select: (state) => {
        const { $from } = state.selection;
        return $from.parent.type !== schema.nodes.task_item;
      }
    })
  );

  return listItems;
}

// 创建插入菜单项
function buildInsertMenu() {
  const insertItems: MenuElement[] = [];

  // 水平分隔线
  insertItems.push(
    new MenuItem({
      title: '分隔线',
      label: '分隔线',
      icon: { text: '—', css: 'font-weight: bold' },
      run: (state, dispatch) => {
        if (dispatch) {
          const { $from } = state.selection;
          const tr = state.tr.replaceWith(
            $from.pos,
            $from.pos,
            schema.nodes.horizontal_rule.create()
          );
          dispatch(tr);
        }
        return true;
      }
    })
  );

  return insertItems;
}

// 创建历史菜单项
function buildHistoryMenu() {
  const historyItems: MenuElement[] = [];

  // 撤销
  historyItems.push(
    new MenuItem({
      title: '撤销',
      icon: icons.undo,
      run: (state, dispatch) => {
        // 导入 undo 函数
        const { undo } = require('prosemirror-history');
        return undo(state, dispatch);
      },
      enable: (state) => {
        // 检查是否可以撤销
        const { undoDepth } = require('prosemirror-history');
        return undoDepth(state) > 0;
      }
    })
  );

  // 重做
  historyItems.push(
    new MenuItem({
      title: '重做',
      icon: icons.redo,
      run: (state, dispatch) => {
        // 导入 redo 函数
        const { redo } = require('prosemirror-history');
        return redo(state, dispatch);
      },
      enable: (state) => {
        // 检查是否可以重做
        const { redoDepth } = require('prosemirror-history');
        return redoDepth(state) > 0;
      }
    })
  );

  return historyItems;
}

// 构建完整菜单
function buildMenu() {
  return [
    buildHistoryMenu(),
    buildTextFormattingMenu(),
    buildBlockFormattingMenu(),
    buildListMenu(),
    buildInsertMenu()
  ];
}

// 创建菜单栏插件
export const menuPlugin = () => {
  // 检查是否在浏览器环境中
  if (
    typeof $tw !== 'undefined' &&
    !$tw.node &&
    typeof document !== 'undefined'
  ) {
    // 创建菜单栏
    return menuBar({
      floating: false,
      content: buildMenu()
    });
  }
  // 在 Node 环境中返回空插件
  return new Plugin({
    key: new PluginKey('empty-menu')
  });
};

// 加载 prosemirror-menu 样式
export function loadMenuStyles() {
  // 使用 $tw.node 判断是否在 Node 环境中
  if (
    typeof $tw !== 'undefined' &&
    !$tw.node &&
    typeof document !== 'undefined'
  ) {
    // 检查是否已经加载了样式
    if (!document.getElementById('prosemirror-menu-styles')) {
      // 创建样式元素
      const style = document.createElement('style');
      style.id = 'prosemirror-menu-styles';

      // 添加 prosemirror-menu 样式
      style.textContent = `
        .ProseMirror-menubar {
          position: relative;
          min-height: 1em;
          color: #666;
          padding: 4px 6px;
          top: 0;
          left: 0;
          right: 0;
          border-bottom: 1px solid #ddd;
          background: #f5f5f5;
          z-index: 10;
          -moz-box-sizing: border-box;
          box-sizing: border-box;
          overflow: visible;
          display: flex;
          flex-wrap: wrap;
        }

        .ProseMirror-menubar-wrapper {
          position: relative;
        }

        .ProseMirror-menubar .ProseMirror-menu {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }

        .ProseMirror-menu-dropdown, .ProseMirror-menu-dropdown-menu {
          font-size: 90%;
          white-space: nowrap;
        }

        .ProseMirror-menu-dropdown {
          vertical-align: 1px;
          cursor: pointer;
          position: relative;
          padding: 4px 15px 4px 8px;
          margin: 2px 4px;
        }

        .ProseMirror-menu-dropdown-wrap {
          padding: 1px 0 1px 4px;
          display: inline-block;
          position: relative;
        }

        .ProseMirror-menu-dropdown:after {
          content: "";
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid currentColor;
          opacity: .6;
          position: absolute;
          right: 4px;
          top: calc(50% - 2px);
        }

        .ProseMirror-menu-dropdown-menu, .ProseMirror-menu-submenu {
          position: absolute;
          background: white;
          color: #666;
          border: 1px solid #aaa;
          border-radius: 4px;
          padding: 4px;
          z-index: 15;
          min-width: 8em;
          margin-top: 2px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .ProseMirror-menu-dropdown-menu {
          left: -2px;
        }

        .ProseMirror-menu-dropdown-item {
          cursor: pointer;
          padding: 6px 8px;
          margin: 2px 0;
          display: block;
          width: 100%;
        }

        .ProseMirror-menu-dropdown-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .ProseMirror-menu-submenu-wrap {
          position: relative;
          margin-right: -4px;
        }

        .ProseMirror-menu-submenu-label:after {
          content: "";
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          border-left: 4px solid currentColor;
          opacity: .6;
          position: absolute;
          right: 4px;
          top: calc(50% - 4px);
        }

        .ProseMirror-menu-submenu {
          display: none;
          min-width: 4em;
          left: 100%;
          top: -3px;
        }

        .ProseMirror-menu-active {
          background: #eee;
          border-radius: 4px;
        }

        .ProseMirror-menu-disabled {
          opacity: .3;
        }

        .ProseMirror-menu-submenu-wrap:hover .ProseMirror-menu-submenu, .ProseMirror-menu-submenu-wrap-active .ProseMirror-menu-submenu {
          display: block;
        }

        .ProseMirror-menubar-wrapper .ProseMirror {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }

        .ProseMirror-menuitem {
          margin: 2px 4px;
          padding: 4px 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
          min-width: 30px;
          height: 30px;
        }

        .ProseMirror-menuitem:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .ProseMirror-menuitem.ProseMirror-menu-active {
          color: #0366d6;
          background-color: rgba(3, 102, 214, 0.1);
        }

        .ProseMirror-icon {
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
          padding: 2px 4px;
          cursor: pointer;
        }

        /* 修复菜单组之间的间距 */
        .ProseMirror-menu > div {
          margin-right: 8px;
          display: flex;
          flex-wrap: wrap;
        }

        /* 修复下拉菜单项的样式 */
        .ProseMirror-menu-dropdown-menu {
          width: auto;
          min-width: 120px;
        }

        /* 修复编辑器与工具栏的连接 */
        .ProseMirror-menubar + .ProseMirror {
          border-top: none;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }

        /* 图标样式 */
        .ProseMirror-icon span {
          font-size: 14px;
        }
      `;

      // 添加到文档头部
      document.head.appendChild(style);
    }
  }
}
