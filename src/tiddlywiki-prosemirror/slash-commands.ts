import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import schema from './schema';

// 定义斜杠命令接口
interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon?: string;
  execute: (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView
  ) => boolean;
}

// 创建斜杠命令列表
const slashCommands: SlashCommand[] = [
  {
    id: 'heading1',
    title: '一级标题',
    description: '插入一级标题',
    icon: 'H1',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        const tr = state.tr.setBlockType(
          range.start,
          range.end,
          schema.nodes.heading,
          { level: 1 }
        );
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'heading2',
    title: '二级标题',
    description: '插入二级标题',
    icon: 'H2',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        const tr = state.tr.setBlockType(
          range.start,
          range.end,
          schema.nodes.heading,
          { level: 2 }
        );
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'heading3',
    title: '三级标题',
    description: '插入三级标题',
    icon: 'H3',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        const tr = state.tr.setBlockType(
          range.start,
          range.end,
          schema.nodes.heading,
          { level: 3 }
        );
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'bulletList',
    title: '无序列表',
    description: '插入无序列表',
    icon: '•',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        // 创建列表项
        const listItem = schema.nodes.list_item.create(
          null,
          schema.nodes.paragraph.create()
        );

        // 创建无序列表
        const bulletList = schema.nodes.bullet_list.create(null, [listItem]);

        // 替换当前块
        const tr = state.tr.replaceWith(range.start, range.end, bulletList);
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'orderedList',
    title: '有序列表',
    description: '插入有序列表',
    icon: '1.',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        // 创建列表项
        const listItem = schema.nodes.list_item.create(
          null,
          schema.nodes.paragraph.create()
        );

        // 创建有序列表
        const orderedList = schema.nodes.ordered_list.create(null, [listItem]);

        // 替换当前块
        const tr = state.tr.replaceWith(range.start, range.end, orderedList);
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'taskList',
    title: '任务列表',
    description: '插入任务列表',
    icon: '☐',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        // 创建任务列表项
        const taskItem = schema.nodes.task_item.create(
          { checked: false },
          schema.nodes.paragraph.create()
        );

        // 替换当前块
        const tr = state.tr.replaceWith(range.start, range.end, taskItem);
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'blockquote',
    title: '引用',
    description: '插入引用块',
    icon: '❝',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        // 创建引用块内容
        const paragraph = schema.nodes.paragraph.create();

        // 创建引用块
        const blockquote = schema.nodes.blockquote.create(null, paragraph);

        // 替换当前块
        const tr = state.tr.replaceWith(range.start, range.end, blockquote);
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'codeBlock',
    title: '代码块',
    description: '插入代码块',
    icon: '</>',
    execute: (state, dispatch) => {
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return false;

      if (dispatch) {
        const tr = state.tr.setBlockType(
          range.start,
          range.end,
          schema.nodes.code_block
        );
        dispatch(tr);
      }
      return true;
    }
  },
  {
    id: 'horizontalRule',
    title: '分隔线',
    description: '插入水平分隔线',
    icon: '—',
    execute: (state, dispatch) => {
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
  }
];

// 创建斜杠命令菜单DOM元素
function createSlashMenu(view: EditorView, commands: SlashCommand[]) {
  const menu = document.createElement('div');
  menu.className = 'prosemirror-slash-menu';
  menu.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
    max-height: 300px;
    overflow-y: auto;
    display: none;
  `;

  commands.forEach((command) => {
    const item = document.createElement('div');
    item.className = 'prosemirror-slash-menu-item';
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
    `;
    item.dataset.id = command.id;

    const icon = document.createElement('span');
    icon.className = 'prosemirror-slash-menu-item-icon';
    icon.style.cssText = `
      margin-right: 8px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    `;
    icon.textContent = command.icon || '';

    const content = document.createElement('div');
    content.style.cssText = `flex: 1;`;

    const title = document.createElement('div');
    title.className = 'prosemirror-slash-menu-item-title';
    title.style.cssText = `font-weight: 500;`;
    title.textContent = command.title;
    title.dataset.original = command.title; // 存储原始标题文本

    const description = document.createElement('div');
    description.className = 'prosemirror-slash-menu-item-description';
    description.style.cssText = `font-size: 12px; color: #666;`;
    description.textContent = command.description;
    description.dataset.original = command.description; // 存储原始描述文本

    content.appendChild(title);
    content.appendChild(description);

    item.appendChild(icon);
    item.appendChild(content);

    item.addEventListener('click', () => {
      const { state, dispatch } = view;
      // 删除斜杠命令文本
      const { $cursor } = state.selection as any;
      if ($cursor) {
        const start = $cursor.pos - ($cursor.nodeBefore?.text?.length || 0);
        const tr = state.tr.delete(start, $cursor.pos);
        dispatch(tr);
      }

      // 执行命令
      command.execute(view.state, view.dispatch, view);

      // 隐藏菜单
      menu.style.display = 'none';
      view.focus();
    });

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f0f0f0';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  return menu;
}

// 创建斜杠命令插件
export const slashCommandsPlugin = new Plugin({
  key: new PluginKey('slashCommands'),

  view(editorView) {
    const menu = createSlashMenu(editorView, slashCommands);

    return {
      update(view, _prevState) {
        const { state } = view;
        const { selection } = state;
        const { $cursor } = selection as any;

        // 检查是否有光标，并且前面的文本是否以/开头
        if ($cursor && $cursor.nodeBefore && $cursor.nodeBefore.isText) {
          const text = $cursor.nodeBefore.text || '';
          const lastWord = text.split(/\s/).pop() || '';

          if (lastWord.startsWith('/')) {
            const query = lastWord.slice(1).toLowerCase();

            // 改进的过滤逻辑
            const filteredCommands = slashCommands.filter((cmd) => {
              // 检查ID是否匹配（优先级最高）
              if (cmd.id.toLowerCase().includes(query)) return true;

              // 检查标题是否匹配
              if (cmd.title.toLowerCase().includes(query)) return true;

              // 检查描述是否匹配
              if (cmd.description.toLowerCase().includes(query)) return true;

              return false;
            });

            // 对结果进行排序，使最匹配的结果排在前面
            filteredCommands.sort((a, b) => {
              // ID匹配的优先级最高
              const aIdMatch = a.id.toLowerCase().includes(query);
              const bIdMatch = b.id.toLowerCase().includes(query);
              if (aIdMatch && !bIdMatch) return -1;
              if (!aIdMatch && bIdMatch) return 1;

              // 标题匹配的优先级次之
              const aTitleMatch = a.title.toLowerCase().includes(query);
              const bTitleMatch = b.title.toLowerCase().includes(query);
              if (aTitleMatch && !bTitleMatch) return -1;
              if (!aTitleMatch && bTitleMatch) return 1;

              // 最后按照原始顺序排序
              return 0;
            });

            if (filteredCommands.length > 0) {
              // 显示菜单
              const coords = view.coordsAtPos($cursor.pos);
              menu.style.display = 'block';
              menu.style.top = `${coords.bottom}px`;
              menu.style.left = `${coords.left}px`;

              // 更新菜单项并高亮匹配文本
              Array.from(menu.children).forEach((element) => {
                const item = element as HTMLElement;
                const id = item.dataset.id;
                const command = slashCommands.find((cmd) => cmd.id === id);
                const visible = filteredCommands.some((cmd) => cmd.id === id);

                // 设置可见性
                item.style.display = visible ? 'flex' : 'none';

                if (visible && command && query) {
                  // 高亮匹配的文本
                  const titleElement = item.querySelector(
                    '.prosemirror-slash-menu-item-title'
                  ) as HTMLElement;
                  const descElement = item.querySelector(
                    '.prosemirror-slash-menu-item-description'
                  ) as HTMLElement;

                  if (titleElement && titleElement.dataset.original) {
                    const originalTitle = titleElement.dataset.original;
                    const titleLower = originalTitle.toLowerCase();
                    const queryIndex = titleLower.indexOf(query.toLowerCase());

                    if (queryIndex >= 0) {
                      // 高亮标题中匹配的部分
                      const before = originalTitle.substring(0, queryIndex);
                      const match = originalTitle.substring(
                        queryIndex,
                        queryIndex + query.length
                      );
                      const after = originalTitle.substring(
                        queryIndex + query.length
                      );
                      titleElement.innerHTML = `${before}<strong style="color: #0366d6;">${match}</strong>${after}`;
                    } else {
                      // 恢复原始文本
                      titleElement.textContent = originalTitle;
                    }
                  }

                  if (descElement && descElement.dataset.original) {
                    const originalDesc = descElement.dataset.original;
                    const descLower = originalDesc.toLowerCase();
                    const queryIndex = descLower.indexOf(query.toLowerCase());

                    if (queryIndex >= 0) {
                      // 高亮描述中匹配的部分
                      const before = originalDesc.substring(0, queryIndex);
                      const match = originalDesc.substring(
                        queryIndex,
                        queryIndex + query.length
                      );
                      const after = originalDesc.substring(
                        queryIndex + query.length
                      );
                      descElement.innerHTML = `${before}<strong style="color: #0366d6;">${match}</strong>${after}`;
                    } else {
                      // 恢复原始文本
                      descElement.textContent = originalDesc;
                    }
                  }
                }
              });

              return;
            }
          }
        }

        // 隐藏菜单
        menu.style.display = 'none';

        // 恢复所有菜单项的原始文本
        Array.from(menu.children).forEach((element) => {
          const item = element as HTMLElement;
          const titleElement = item.querySelector(
            '.prosemirror-slash-menu-item-title'
          ) as HTMLElement;
          const descElement = item.querySelector(
            '.prosemirror-slash-menu-item-description'
          ) as HTMLElement;

          if (titleElement && titleElement.dataset.original) {
            titleElement.textContent = titleElement.dataset.original;
          }

          if (descElement && descElement.dataset.original) {
            descElement.textContent = descElement.dataset.original;
          }
        });
      },

      destroy() {
        menu.remove();
      }
    };
  }
});
