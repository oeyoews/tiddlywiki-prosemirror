import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import schema from './schema';

// 创建任务列表插件
export const taskListPlugin = new Plugin({
  key: new PluginKey('taskList'),

  props: {
    // 处理DOM事件
    handleDOMEvents: {
      click: (view, event) => {
        // 检查是否点击了任务列表复选框
        const target = event.target as HTMLElement;
        if (target.className === 'task-list-item-checkbox') {
          // 获取任务列表项
          const listItem = target.closest('li.task-list-item');
          if (!listItem) return false;

          // 获取当前状态
          const checked = listItem.getAttribute('data-checked') === 'true';

          // 查找对应的节点
          const pos = view.posAtDOM(listItem, 0);
          const $pos = view.state.doc.resolve(pos);
          const node = $pos.node();

          // 确保是任务列表项节点
          if (!node || node.type !== schema.nodes.task_item) return false;

          // 创建事务，更新节点属性
          const tr = view.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            checked: !checked
          });

          // 更新视图
          view.dispatch(tr);

          // 更新DOM
          const checkbox = target as HTMLInputElement;
          checkbox.checked = !checked;
          listItem.setAttribute('data-checked', (!checked).toString());

          // 阻止事件传播
          event.preventDefault();
          return true;
        }

        return false;
      }
    }
  }
});
