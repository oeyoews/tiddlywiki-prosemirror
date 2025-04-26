/*\
title: $:/plugins/oeyoews/tiddlywiki-prosemirror/edit-prosemirror.js
type: application/javascript
module-type: widget

Edit-prosemirror widget

\*/
(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  const engineTiddler = '$:/plugins/oeyoews/tiddlywiki-prosemirror/engine.js';
  const {
    editTextWidgetFactory
  } = require('$:/core/modules/editor/factory.js');
  const { ProseMirrorEngine } = require(engineTiddler);

  // 工厂函数用法
  exports['edit-prosemirror'] = editTextWidgetFactory(
    ProseMirrorEngine,
    ProseMirrorEngine
  );
})();
