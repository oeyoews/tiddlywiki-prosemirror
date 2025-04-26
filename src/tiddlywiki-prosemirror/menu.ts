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
const customIcons = {
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
  }
};

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
      label: '一级标题',
      attrs: { level: 1 },
      icon: customIcons.heading1
    })
  );

  // 二级标题
  headingItems.push(
    blockTypeItem(schema.nodes.heading, {
      title: '二级标题',
      label: '二级标题',
      attrs: { level: 2 },
      icon: customIcons.heading2
    })
  );

  // 三级标题
  headingItems.push(
    blockTypeItem(schema.nodes.heading, {
      title: '三级标题',
      label: '三级标题',
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
      label: '代码块'
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

          // 将当前块替换为任务列表项
          tr.setBlockType(range.start, range.end, taskItemType, {
            checked: false
          });
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
  // 创建菜单栏
  return menuBar({
    floating: false,
    content: buildMenu()
  });
};

// 加载 prosemirror-menu 样式
export function loadMenuStyles() {
  if (typeof document !== 'undefined') {
    // 检查是否已经加载了样式
    if (!document.getElementById('prosemirror-menu-styles')) {
      // 创建样式元素
      const style = document.createElement('style');
      style.id = 'prosemirror-menu-styles';

      // 添加 prosemirror-menu 样式
      style.textContent = `
        .ProseMirror-menubar {
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
          position: relative;
          min-height: 1em;
          color: #666;
          padding: 1px 6px;
          top: 0;
          left: 0;
          right: 0;
          border-bottom: 1px solid silver;
          background: #f5f5f5;
          z-index: 10;
          -moz-box-sizing: border-box;
          box-sizing: border-box;
          overflow: visible;
        }

        .ProseMirror-menubar-wrapper {
          position: relative;
        }

        .ProseMirror-menubar .ProseMirror-menu {
          display: flex;
          flex-wrap: wrap;
        }

        .ProseMirror-menu-dropdown, .ProseMirror-menu-dropdown-menu {
          font-size: 90%;
          white-space: nowrap;
        }

        .ProseMirror-menu-dropdown {
          vertical-align: 1px;
          cursor: pointer;
          position: relative;
          padding-right: 15px;
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
          padding: 2px;
          z-index: 15;
          min-width: 6em;
          margin-top: 2px;
        }

        .ProseMirror-menu-dropdown-menu {
          left: -2px;
        }

        .ProseMirror-menu-dropdown-item {
          cursor: pointer;
          padding: 2px 8px 2px 4px;
        }

        .ProseMirror-menu-dropdown-item:hover {
          background: #f2f2f2;
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
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
        }

        .ProseMirror-menuitem:hover {
          background-color: #e0e0e0;
        }

        .ProseMirror-menuitem.ProseMirror-menu-active {
          background-color: #e6f2ff;
          color: #0366d6;
        }

        .ProseMirror-icon {
          display: inline-block;
          line-height: .8;
          vertical-align: -2px;
          padding: 2px 8px;
          cursor: pointer;
        }
      `;

      // 添加到文档头部
      document.head.appendChild(style);
    }
  }
}
