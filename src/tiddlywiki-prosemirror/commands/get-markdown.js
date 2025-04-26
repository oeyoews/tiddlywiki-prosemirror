/*\
title: $:/plugins/oeyoews/tiddlywiki-prosemirror/commands/get-markdown
type: application/javascript
module-type: command

命令：获取当前编辑器的Markdown内容

\*/
(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.info = {
  name: "get-markdown",
  synchronous: true
};

var Command = function(params, commander, callback) {
  this.params = params;
  this.commander = commander;
  this.callback = callback;
};

Command.prototype.execute = function() {
  if (this.params.length < 1) {
    return "请指定要获取Markdown内容的条目标题";
  }
  
  var title = this.params[0],
      tiddler = this.commander.wiki.getTiddler(title);
  
  if (!tiddler) {
    return "条目 '" + title + "' 不存在";
  }
  
  // 获取条目的文本内容
  var text = this.commander.wiki.getTiddlerText(title);
  
  // 如果在浏览器环境中，尝试从编辑器获取内容
  if ($tw.browser) {
    // 查找当前打开的编辑器
    var editors = document.querySelectorAll(".tc-tiddler-edit-frame[data-tiddler-title='" + title.replace(/'/g, "\\'") + "'] .prosemirror-editor-container");
    
    if (editors.length > 0) {
      var editor = editors[0].prosemirror;
      if (editor) {
        // 使用ProseMirror的docToText方法获取Markdown文本
        var markdownText = editor.state.doc.content.size > 0 ? 
          $tw.modules.execute('$:/plugins/oeyoews/tiddlywiki-prosemirror/engine.js').ProseMirrorEngine.prototype.getText.call({ editor: editor }) : 
          "";
        
        // 输出Markdown文本
        return markdownText;
      }
    }
  }
  
  // 如果无法从编辑器获取，则返回原始文本
  return text;
};

exports.Command = Command;

})();
