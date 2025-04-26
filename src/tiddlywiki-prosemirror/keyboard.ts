import { keymap } from 'prosemirror-keymap';
import {
  wrapIn,
  setBlockType,
  chainCommands,
  toggleMark,
  exitCode,
  joinUp,
  joinDown,
  lift,
  selectParentNode,
  createParagraphNear
} from 'prosemirror-commands';
import {
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem
} from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import schema from './schema';

// 创建基本的编辑快捷键
const basicKeymap: { [key: string]: any } = {
  // 历史操作
  'Mod-z': undo,
  'Shift-Mod-z': redo,
  'Mod-y': redo,

  // 格式化
  'Mod-b': toggleMark(schema.marks.strong),
  'Mod-i': toggleMark(schema.marks.em),
  'Mod-`': toggleMark(schema.marks.code),
  'Mod-k': (state, dispatch) => {
    // 创建链接
    if (!schema.marks.link) return false;

    const { from, to } = state.selection;
    const attrs = { href: '' };

    // 如果已经有链接，则不做任何操作
    if (state.doc.rangeHasMark(from, to, schema.marks.link)) {
      return false;
    }

    if (dispatch) {
      dispatch(state.tr.addMark(from, to, schema.marks.link.create(attrs)));
    }

    return true;
  },

  // 块级操作
  'Shift-Ctrl-1': setBlockType(schema.nodes.heading, { level: 1 }),
  'Shift-Ctrl-2': setBlockType(schema.nodes.heading, { level: 2 }),
  'Shift-Ctrl-3': setBlockType(schema.nodes.heading, { level: 3 }),
  'Shift-Ctrl-4': setBlockType(schema.nodes.heading, { level: 4 }),
  'Shift-Ctrl-5': setBlockType(schema.nodes.heading, { level: 5 }),
  'Shift-Ctrl-6': setBlockType(schema.nodes.heading, { level: 6 }),
  'Shift-Ctrl-0': setBlockType(schema.nodes.paragraph),
  'Shift-Ctrl-\\\\': setBlockType(schema.nodes.code_block),
  'Shift-Ctrl-]': wrapIn(schema.nodes.blockquote),

  // 列表操作
  'Shift-Ctrl-8': wrapInList(schema.nodes.bullet_list),
  'Shift-Ctrl-9': wrapInList(schema.nodes.ordered_list),
  'Shift-Ctrl-t': (state, dispatch) => {
    // 创建任务列表项
    if (!schema.nodes.task_item) return false;

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
  },
  // 列表操作
  Enter: splitListItem(schema.nodes.list_item),
  'Mod-[': liftListItem(schema.nodes.list_item),
  'Mod-]': sinkListItem(schema.nodes.list_item),

  // 其他操作
  Backspace: chainCommands(joinUp, lift),
  'Alt-ArrowUp': joinUp,
  'Alt-ArrowDown': joinDown,
  Escape: selectParentNode,
  'Ctrl-Enter': exitCode,

  // 从代码块跳出
  Tab: (state, dispatch, _view) => {
    // 检查当前是否在代码块中
    const { $from } = state.selection;
    const node = $from.node();
    const inCodeBlock =
      node.type === schema.nodes.code_block ||
      $from.parent.type === schema.nodes.code_block;

    if (!inCodeBlock) return false;

    // 如果在代码块中，按Tab键跳出代码块
    if (dispatch) {
      // 创建一个新的段落节点
      const paragraph = schema.nodes.paragraph.create();

      // 获取代码块的位置
      let depth = $from.depth;

      // 找到代码块的结束位置
      while (depth > 0 && $from.node(depth).type !== schema.nodes.code_block) {
        depth--;
      }

      if (depth > 0) {
        const nodeEndPos = $from.end(depth);

        // 在代码块后插入新段落
        const tr = state.tr.insert(nodeEndPos, paragraph);

        // 将光标移动到新段落
        tr.setSelection(
          state.selection.constructor.near(tr.doc.resolve(nodeEndPos + 1))
        );

        dispatch(tr);
        return true;
      }
    }

    return false;
  },

  // 另一种跳出方式：Shift+Enter
  'Shift-Enter': (state, dispatch, _view) => {
    // 检查当前是否在代码块中
    const { $from } = state.selection;
    const node = $from.node();
    const inCodeBlock =
      node.type === schema.nodes.code_block ||
      $from.parent.type === schema.nodes.code_block;

    if (!inCodeBlock) return false;

    // 如果在代码块中，按Shift+Enter跳出代码块
    if (dispatch) {
      // 创建一个新的段落节点
      const paragraph = schema.nodes.paragraph.create();

      // 获取代码块的位置
      let depth = $from.depth;

      // 找到代码块的结束位置
      while (depth > 0 && $from.node(depth).type !== schema.nodes.code_block) {
        depth--;
      }

      if (depth > 0) {
        const nodeEndPos = $from.end(depth);

        // 在代码块后插入新段落
        const tr = state.tr.insert(nodeEndPos, paragraph);

        // 将光标移动到新段落
        tr.setSelection(
          state.selection.constructor.near(tr.doc.resolve(nodeEndPos + 1))
        );

        dispatch(tr);
        return true;
      }
    }

    return false;
  }
};

// 创建并导出快捷键映射
export const editorKeymap = keymap(basicKeymap);
