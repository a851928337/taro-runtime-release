'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@tarojs/shared');

var incrementId = function () {
    var id = 0;
    return function () { return (id++).toString(); };
};
function isElement(node) {
    return node.nodeType === 1 /* ELEMENT_NODE */;
}
function isText(node) {
    return node.nodeType === 3 /* TEXT_NODE */;
}
function isHasExtractProp(el) {
    var res = Object.keys(el.props).find(function (prop) {
        return !(/^(class|style|id)$/.test(prop) || prop.startsWith('data-'));
    });
    return Boolean(res);
}
/**
 * 往上寻找组件树直到 root，寻找是否有祖先组件绑定了同类型的事件
 * @param node 当前组件
 * @param type 事件类型
 */
function isParentBinded(node, type) {
    var _a;
    var res = false;
    while ((node === null || node === void 0 ? void 0 : node.parentElement) && node.parentElement._path !== 'root') {
        if ((_a = node.parentElement.__handlers[type]) === null || _a === void 0 ? void 0 : _a.length) {
            res = true;
            break;
        }
        node = node.parentElement;
    }
    return res;
}

var CurrentReconciler = Object.assign({
    getLifecyle: function getLifecyle(instance, lifecyle) {
        return instance[lifecyle];
    },
    getPathIndex: function getPathIndex(indexOfNode) {
        return ("[" + indexOfNode + "]");
    },
    getEventCenter: function getEventCenter(Events) {
        return new Events();
    }
}, shared.defaultReconciler);

var TaroEventTarget = function TaroEventTarget() {
    this.__handlers = {};
};
TaroEventTarget.prototype.addEventListener = function addEventListener (type, handler, options) {
    var _a;
    (_a = CurrentReconciler.onAddEvent) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, type, handler, options);
    if (type === 'regionchange') {
        // map 组件的 regionchange 事件非常特殊，详情：https://github.com/NervJS/taro/issues/5766
        this.addEventListener('begin', handler, options);
        this.addEventListener('end', handler, options);
        return;
    }
    type = type.toLowerCase();
    var handlers = this.__handlers[type];
    var isCapture = Boolean(options);
    var isOnce = false;
    if (shared.isObject(options)) {
        isCapture = Boolean(options.capture);
        isOnce = Boolean(options.once);
    }
    if (isOnce) {
        var wrapper = function () {
            handler.apply(this, arguments); // this 指向 Element
            this.removeEventListener(type, wrapper);
        };
        this.addEventListener(type, wrapper, Object.assign(Object.assign({}, options), { once: false }));
        return;
    }
    shared.warn(isCapture, 'The event capture feature is unimplemented.');
    if (shared.isArray(handlers)) {
        handlers.push(handler);
    }
    else {
        this.__handlers[type] = [handler];
    }
};
TaroEventTarget.prototype.removeEventListener = function removeEventListener (type, handler) {
    type = type.toLowerCase();
    if (handler == null) {
        return;
    }
    var handlers = this.__handlers[type];
    if (!shared.isArray(handlers)) {
        return;
    }
    var index = handlers.indexOf(handler);
    shared.warn(index === -1, ("事件: '" + type + "' 没有注册在 DOM 中，因此不会被移除。"));
    handlers.splice(index, 1);
};
TaroEventTarget.prototype.isAnyEventBinded = function isAnyEventBinded () {
        var this$1 = this;

    var isAnyEventBinded = Object.keys(this.__handlers).find(function (key) {
        var handler = this$1.__handlers[key];
        return handler.length;
    });
    return isAnyEventBinded;
};

var eventSource = new Map();
var TaroEvent = function TaroEvent(type, opts, event) {
    this._stop = false;
    this._end = false;
    this.defaultPrevented = false;
    // timestamp can either be hi-res ( relative to page load) or low-res (relative to UNIX epoch)
    // here use hi-res timestamp
    this.timeStamp = Date.now();
    this.type = type.toLowerCase();
    this.mpEvent = event;
    this.bubbles = Boolean(opts && opts.bubbles);
    this.cancelable = Boolean(opts && opts.cancelable);
};

var prototypeAccessors$1 = { target: { configurable: true },currentTarget: { configurable: true } };
TaroEvent.prototype.stopPropagation = function stopPropagation () {
    this._stop = true;
};
TaroEvent.prototype.stopImmediatePropagation = function stopImmediatePropagation () {
    this._end = this._stop = true;
};
TaroEvent.prototype.preventDefault = function preventDefault () {
    this.defaultPrevented = true;
};
prototypeAccessors$1.target.get = function () {
    var _a, _b, _c;
    var element = document$1.getElementById((_a = this.mpEvent) === null || _a === void 0 ? void 0 : _a.target.id);
    return Object.assign(Object.assign(Object.assign({}, (_b = this.mpEvent) === null || _b === void 0 ? void 0 : _b.target), (_c = this.mpEvent) === null || _c === void 0 ? void 0 : _c.detail), { dataset: element !== null ? element.dataset : shared.EMPTY_OBJ });
};
prototypeAccessors$1.currentTarget.get = function () {
    var _a, _b, _c;
    var element = document$1.getElementById((_a = this.mpEvent) === null || _a === void 0 ? void 0 : _a.currentTarget.id);
    if (element === null) {
        return this.target;
    }
    return Object.assign(Object.assign(Object.assign({}, (_b = this.mpEvent) === null || _b === void 0 ? void 0 : _b.currentTarget), (_c = this.mpEvent) === null || _c === void 0 ? void 0 : _c.detail), { dataset: element.dataset });
};

Object.defineProperties( TaroEvent.prototype, prototypeAccessors$1 );
function createEvent(event, _) {
    if (typeof event === 'string') {
        return new TaroEvent(event, { bubbles: true, cancelable: true });
    }
    var domEv = new TaroEvent(event.type, { bubbles: true, cancelable: true }, event);
    for (var key in event) {
        if (key === 'currentTarget' || key === 'target' || key === 'type' || key === 'timeStamp') {
            continue;
        }
        else {
            domEv[key] = event[key];
        }
    }
    return domEv;
}
var eventsBatch = {};
function eventHandler(event) {
    var _a;
    (_a = CurrentReconciler.modifyEventType) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, event);
    if (event.currentTarget == null) {
        event.currentTarget = event.target;
    }
    var node = document$1.getElementById(event.currentTarget.id);
    if (node != null) {
        var dispatch = function () {
            node.dispatchEvent(createEvent(event));
        };
        if (typeof CurrentReconciler.batchedEventUpdates === 'function') {
            var type = event.type;
            // change事件不会冒泡，无法委托给上层组件
            if (!isParentBinded(node, type) || (type === 'touchmove' && !!node.props.catchMove) || type === 'change') {
                // 最上层组件统一 batchUpdate
                CurrentReconciler.batchedEventUpdates(function () {
                    if (eventsBatch[type]) {
                        eventsBatch[type].forEach(function (fn) { return fn(); });
                        delete eventsBatch[type];
                    }
                    dispatch();
                });
            }
            else {
                // 如果上层组件也有绑定同类型的组件，委托给上层组件调用事件回调
                (eventsBatch[type] || (eventsBatch[type] = [])).push(dispatch);
            }
        }
        else {
            dispatch();
        }
    }
}

var PROPERTY_THRESHOLD = 2046;
var SET_DATA = '小程序 setData';
var PAGE_INIT = '页面初始化';
var SPECIAL_NODES = ['view', 'text', 'image'];

/**
 * React also has a fancy function's name for this: `hydrate()`.
 * You may have been heard `hydrate` as a SSR-related function,
 * actually, `hydrate` basicly do the `render()` thing, but ignore some properties,
 * it's a vnode traverser and modifier: that's exactly what Taro's doing in here.
 */
function hydrate(node) {
    var obj;

    var nodeName = node.nodeName;
    if (isText(node)) {
        return ( obj = {}, obj["v" /* Text */] = node.nodeValue, obj["nn" /* NodeName */] = nodeName, obj );
    }
    var data = {};
    data["nn" /* NodeName */] = nodeName;
    data.uid = node.uid;
    var props = node.props;
    var childNodes = node.childNodes;
    if (!node.isAnyEventBinded() && SPECIAL_NODES.indexOf(nodeName) > -1) {
        data["nn" /* NodeName */] = "static-" + nodeName;
        if (nodeName === 'view' && !isHasExtractProp(node)) {
            data["nn" /* NodeName */] = 'pure-view';
        }
    }
    for (var prop in props) {
        var propInCamelCase = shared.toCamelCase(prop);
        if (!prop.startsWith('data-') && // 在 node.dataset 的数据
            prop !== 'class' &&
            prop !== 'style' &&
            prop !== 'id' &&
            propInCamelCase !== 'catchMove') {
            data[propInCamelCase] = props[prop];
        }
        if (nodeName === 'view' && propInCamelCase === 'catchMove' && props[prop] !== 'false') {
            data["nn" /* NodeName */] = 'catch-view';
        }
    }
    if (childNodes.length > 0) {
        data["cn" /* Childnodes */] = childNodes.map(hydrate);
    }
    else {
        data["cn" /* Childnodes */] = [];
    }
    if (node.className !== '') {
        data["cl" /* Class */] = node.className;
    }
    if (node.cssText !== '' && nodeName !== 'swiper-item') {
        data["st" /* Style */] = node.cssText;
    }
    return data;
}

var options = {
    prerender: true,
    debug: false,
    // html 只影响 Element#innerHTML API
    html: {
        skipElements: new Set(['style', 'script']),
        voidElements: new Set([
            '!doctype', 'area', 'base', 'br', 'col', 'command',
            'embed', 'hr', 'img', 'input', 'keygen', 'link',
            'meta', 'param', 'source', 'track', 'wbr'
        ]),
        closingElements: new Set([
            'html', 'head', 'body', 'p', 'dt', 'dd', 'li', 'option',
            'thead', 'th', 'tbody', 'tr', 'td', 'tfoot', 'colgroup'
        ]),
        renderHTMLTag: false
    },
    reconciler: function reconciler(reconciler$1) {
        Object.assign(CurrentReconciler, reconciler$1);
    }
};

function initPosition() {
    return {
        index: 0,
        column: 0,
        line: 0
    };
}
function feedPosition(position, str, len) {
    var start = position.index;
    var end = position.index = start + len;
    for (var i = start; i < end; i++) {
        var char = str.charAt(i);
        if (char === '\n') {
            position.line++;
            position.column = 0;
        }
        else {
            position.column++;
        }
    }
}
function jumpPosition(position, str, end) {
    var len = end - position.index;
    return feedPosition(position, str, len);
}
function copyPosition(position) {
    return {
        index: position.index,
        line: position.line,
        column: position.column
    };
}
var whitespace = /\s/;
function isWhitespaceChar(char) {
    return whitespace.test(char);
}
var equalSign = /=/;
function isEqualSignChar(char) {
    return equalSign.test(char);
}
function shouldBeIgnore(tagName) {
    var name = tagName.toLowerCase();
    if (options.html.skipElements.has(name)) {
        return true;
    }
    return false;
}
var alphanumeric = /[A-Za-z0-9]/;
function findTextEnd(str, index) {
    while (true) {
        var textEnd = str.indexOf('<', index);
        if (textEnd === -1) {
            return textEnd;
        }
        var char = str.charAt(textEnd + 1);
        if (char === '/' || char === '!' || alphanumeric.test(char)) {
            return textEnd;
        }
        index = textEnd + 1;
    }
}
function isWordEnd(cursor, wordBegin, html) {
    if (!isWhitespaceChar(html.charAt(cursor)))
        { return false; }
    var len = html.length;
    // backwrad
    for (var i = cursor - 1; i > wordBegin; i--) {
        var char = html.charAt(i);
        if (!isWhitespaceChar(char)) {
            if (isEqualSignChar(char))
                { return false; }
            break;
        }
    }
    // forward
    for (var i$1 = cursor + 1; i$1 < len; i$1++) {
        var char$1 = html.charAt(i$1);
        if (!isWhitespaceChar(char$1)) {
            if (isEqualSignChar(char$1))
                { return false; }
            return true;
        }
    }
}
var Scaner = function Scaner(html) {
    this.tokens = [];
    this.position = initPosition();
    this.html = html;
};
Scaner.prototype.scan = function scan () {
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var len = html.length;
    while (position.index < len) {
        var start = position.index;
        this.scanText();
        if (position.index === start) {
            var isComment = html.startsWith('!--', start + 1);
            if (isComment) {
                this.scanComment();
            }
            else {
                var tagName = this.scanTag();
                if (shouldBeIgnore(tagName)) {
                    this.scanSkipTag(tagName);
                }
            }
        }
    }
    return this.tokens;
};
Scaner.prototype.scanText = function scanText () {
    var type = 'text';
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var textEnd = findTextEnd(html, position.index);
    if (textEnd === position.index) {
        return;
    }
    if (textEnd === -1) {
        textEnd = html.length;
    }
    var start = copyPosition(position);
    var content = html.slice(position.index, textEnd);
    jumpPosition(position, html, textEnd);
    var end = copyPosition(position);
    this.tokens.push({ type: type, content: content, position: { start: start, end: end } });
};
Scaner.prototype.scanComment = function scanComment () {
    var type = 'comment';
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var start = copyPosition(position);
    feedPosition(position, html, 4); // "<!--".length
    var contentEnd = html.indexOf('-->', position.index);
    var commentEnd = contentEnd + 3; // "-->".length
    if (contentEnd === -1) {
        contentEnd = commentEnd = html.length;
    }
    var content = html.slice(position.index, contentEnd);
    jumpPosition(position, html, commentEnd);
    this.tokens.push({
        type: type,
        content: content,
        position: {
            start: start,
            end: copyPosition(position)
        }
    });
};
Scaner.prototype.scanTag = function scanTag () {
    this.scanTagStart();
    var tagName = this.scanTagName();
    this.scanAttrs();
    this.scanTagEnd();
    return tagName;
};
Scaner.prototype.scanTagStart = function scanTagStart () {
    var type = 'tag-start';
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var secondChar = html.charAt(position.index + 1);
    var close = secondChar === '/';
    var start = copyPosition(position);
    feedPosition(position, html, close ? 2 : 1);
    this.tokens.push({ type: type, close: close, position: { start: start } });
};
Scaner.prototype.scanTagEnd = function scanTagEnd () {
    var type = 'tag-end';
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var firstChar = html.charAt(position.index);
    var close = firstChar === '/';
    feedPosition(position, html, close ? 2 : 1);
    var end = copyPosition(position);
    this.tokens.push({ type: type, close: close, position: { end: end } });
};
Scaner.prototype.scanTagName = function scanTagName () {
    var type = 'tag';
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var len = html.length;
    var start = position.index;
    while (start < len) {
        var char = html.charAt(start);
        var isTagChar = !(isWhitespaceChar(char) || char === '/' || char === '>');
        if (isTagChar)
            { break; }
        start++;
    }
    var end = start + 1;
    while (end < len) {
        var char$1 = html.charAt(end);
        var isTagChar$1 = !(isWhitespaceChar(char$1) || char$1 === '/' || char$1 === '>');
        if (!isTagChar$1)
            { break; }
        end++;
    }
    jumpPosition(position, html, end);
    var tagName = html.slice(start, end);
    this.tokens.push({
        type: type,
        content: tagName
    });
    return tagName;
};
Scaner.prototype.scanAttrs = function scanAttrs () {
    var ref = this;
        var html = ref.html;
        var position = ref.position;
        var tokens = ref.tokens;
    var cursor = position.index;
    var quote = null; // null, single-, or double-quote
    var wordBegin = cursor; // index of word start
    var words = []; // "key", "key=value", "key='value'", etc
    var len = html.length;
    while (cursor < len) {
        var char = html.charAt(cursor);
        if (quote) {
            var isQuoteEnd = char === quote;
            if (isQuoteEnd) {
                quote = null;
            }
            cursor++;
            continue;
        }
        var isTagEnd = char === '/' || char === '>';
        if (isTagEnd) {
            if (cursor !== wordBegin) {
                words.push(html.slice(wordBegin, cursor));
            }
            break;
        }
        if (isWordEnd(cursor, wordBegin, html)) {
            if (cursor !== wordBegin) {
                words.push(html.slice(wordBegin, cursor));
            }
            wordBegin = cursor + 1;
            cursor++;
            continue;
        }
        var isQuoteStart = char === '\'' || char === '"';
        if (isQuoteStart) {
            quote = char;
            cursor++;
            continue;
        }
        cursor++;
    }
    jumpPosition(position, html, cursor);
    var wLen = words.length;
    var type = 'attribute';
    for (var i = 0; i < wLen; i++) {
        var word = words[i];
        var isNotPair = word.includes('=');
        if (isNotPair) {
            var secondWord = words[i + 1];
            if (secondWord && secondWord.startsWith('=')) {
                if (secondWord.length > 1) {
                    var newWord = word + secondWord;
                    tokens.push({ type: type, content: newWord });
                    i += 1;
                    continue;
                }
                var thirdWord = words[i + 2];
                i += 1;
                if (thirdWord) {
                    var newWord$1 = word + '=' + thirdWord;
                    tokens.push({ type: type, content: newWord$1 });
                    i += 1;
                    continue;
                }
            }
        }
        if (word.endsWith('=')) {
            var secondWord$1 = words[i + 1];
            if (secondWord$1 && !secondWord$1.includes('=')) {
                var newWord$2 = word + secondWord$1;
                tokens.push({ type: type, content: newWord$2 });
                i += 1;
                continue;
            }
            var newWord$3 = word.slice(0, -1);
            tokens.push({ type: type, content: newWord$3 });
            continue;
        }
        tokens.push({ type: type, content: word });
    }
};
Scaner.prototype.scanSkipTag = function scanSkipTag (tagName) {
    var ref = this;
        var html = ref.html;
        var position = ref.position;
    var safeTagName = tagName.toLowerCase();
    var len = html.length;
    while (position.index < len) {
        var nextTag = html.indexOf('</', position.index);
        if (nextTag === -1) {
            this.scanText();
            break;
        }
        jumpPosition(position, html, nextTag);
        var name = this.scanTag();
        if (safeTagName === name.toLowerCase()) {
            break;
        }
    }
};

function makeMap(str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? function (val) { return !!map[val.toLowerCase()]; } : function (val) { return !!map[val]; };
}
var specialMiniElements = {
    img: 'image',
    iframe: 'web-view'
};
var internalCompsList = Object.keys(shared.internalComponents)
    .map(function (i) { return i.toLowerCase(); })
    .join(',');
// https://developers.weixin.qq.com/miniprogram/dev/component
var isMiniElements = makeMap(internalCompsList, true);
// https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
var isInlineElements = makeMap('a,i,abbr,iframe,select,acronym,slot,small,span,bdi,kbd,strong,big,map,sub,sup,br,mark,mark,meter,template,canvas,textarea,cite,object,time,code,output,u,data,picture,tt,datalist,var,dfn,del,q,em,s,embed,samp,b', true);
// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
var isBlockElements = makeMap('address,fieldset,li,article,figcaption,main,aside,figure,nav,blockquote,footer,ol,details,form,p,dialog,h1,h2,h3,h4,h5,h6,pre,dd,header,section,div,hgroup,table,dl,hr,ul,dt', true);

var LEFT_BRACKET = '{';
var RIGHT_BRACKET = '}';
var CLASS_SELECTOR = '.';
var ID_SELECTOR = '#';
var CHILD_COMBINATOR = '>';
var GENERAL_SIBLING_COMBINATOR = '~';
var ADJACENT_SIBLING_COMBINATOR = '+';
var StyleTagParser = function StyleTagParser() {
    this.styles = [];
};
StyleTagParser.prototype.extractStyle = function extractStyle (src) {
        var this$1 = this;

    var REG_STYLE = /<style\s?[^>]*>((.|\n|\s)+?)<\/style>/g;
    var html = src;
    // let html = src.replace(/\n/g, '')
    html = html.replace(REG_STYLE, function (_, $1) {
        var style = $1.trim();
        this$1.stringToSelector(style);
        return '';
    });
    return html.trim();
};
StyleTagParser.prototype.stringToSelector = function stringToSelector (style) {
        var this$1 = this;

    var lb = style.indexOf(LEFT_BRACKET);
    var loop = function () {
        var rb = style.indexOf(RIGHT_BRACKET);
        var selectors = style.slice(0, lb).trim();
        var content = style.slice(lb + 1, rb).replace(/ /g, '');
        if (!(/;$/.test(content))) {
            content += ';';
        }
        selectors.split(',').forEach(function (src) {
            var selectorList = this$1.parseSelector(src);
            this$1.styles.push({
                content: content,
                selectorList: selectorList
            });
        });
        style = style.slice(rb + 1);
        lb = style.indexOf(LEFT_BRACKET);
    };

        while (lb > -1) loop();
    // console.log('res this.styles: ', this.styles)
};
StyleTagParser.prototype.parseSelector = function parseSelector (src) {
    // todo: 属性选择器里可以带空格：[a = "b"]，这里的 split(' ') 需要作兼容
    var list = src.trim().replace(/ *([>~+]) */g, ' $1').replace(/ +/g, ' ').split(' ');
    var selectors = list.map(function (item) {
        var firstChar = item.charAt(0);
        var selector = {
            isChild: firstChar === CHILD_COMBINATOR,
            isGeneralSibling: firstChar === GENERAL_SIBLING_COMBINATOR,
            isAdjacentSibling: firstChar === ADJACENT_SIBLING_COMBINATOR,
            tag: null,
            id: null,
            class: [],
            attrs: []
        };
        item = item.replace(/^[>~+]/, '');
        // 属性选择器
        item = item.replace(/\[(.+?)\]/g, function (_, $1) {
            var ref = $1.split('=');
                var key = ref[0];
                var value = ref[1];
            var all = $1.indexOf('=') === -1;
            var attr = {
                all: all,
                key: key,
                value: all ? null : value
            };
            selector.attrs.push(attr);
            return '';
        });
        item = item.replace(/([.#][A-Za-z0-9-_]+)/g, function (_, $1) {
            if ($1[0] === ID_SELECTOR) {
                // id 选择器
                selector.id = $1.substr(1);
            }
            else if ($1[0] === CLASS_SELECTOR) {
                // class 选择器
                selector.class.push($1.substr(1));
            }
            return '';
        });
        // 标签选择器
        if (item !== '') {
            selector.tag = item;
        }
        return selector;
    });
    return selectors;
};
StyleTagParser.prototype.matchStyle = function matchStyle (tagName, el, list) {
        var this$1 = this;

    // todo: 这里应该要比较选择器权重
    var res = this.styles.reduce(function (str, ref, i) {
            var content = ref.content;
            var selectorList = ref.selectorList;

        var idx = list[i];
        var selector = selectorList[idx];
        var nextSelector = selectorList[idx + 1];
        if ((nextSelector === null || nextSelector === void 0 ? void 0 : nextSelector.isGeneralSibling) || (nextSelector === null || nextSelector === void 0 ? void 0 : nextSelector.isAdjacentSibling)) {
            selector = nextSelector;
            idx += 1;
            list[i] += 1;
        }
        var isMatch = this$1.matchCurrent(tagName, el, selector);
        if (isMatch && selector.isGeneralSibling) {
            var prev = getPreviousElement(el);
            while (prev) {
                if (prev.h5tagName && this$1.matchCurrent(prev.h5tagName, prev, selectorList[idx - 1])) {
                    isMatch = true;
                    break;
                }
                prev = getPreviousElement(prev);
                isMatch = false;
            }
        }
        if (isMatch && selector.isAdjacentSibling) {
            var prev$1 = getPreviousElement(el);
            if (!prev$1 || !prev$1.h5tagName) {
                isMatch = false;
            }
            else {
                var isSiblingMatch = this$1.matchCurrent(prev$1.h5tagName, prev$1, selectorList[idx - 1]);
                if (!isSiblingMatch) {
                    isMatch = false;
                }
            }
        }
        if (isMatch) {
            if (idx === selectorList.length - 1) {
                return str + content;
            }
            else if (idx < selectorList.length - 1) {
                list[i] += 1;
            }
        }
        else {
            // 直接子代组合器: >
            if (selector.isChild && idx > 0) {
                list[i] -= 1;
                if (this$1.matchCurrent(tagName, el, selectorList[list[i]])) {
                    list[i] += 1;
                }
            }
        }
        return str;
    }, '');
    return res;
};
StyleTagParser.prototype.matchCurrent = function matchCurrent (tagName, el, selector) {
    // 标签选择器
    if (selector.tag && selector.tag !== tagName)
        { return false; }
    // id 选择器
    if (selector.id && selector.id !== el.id)
        { return false; }
    // class 选择器
    if (selector.class.length) {
        var classList = el.className.split(' ');
        for (var i = 0; i < selector.class.length; i++) {
            var cls = selector.class[i];
            if (classList.indexOf(cls) === -1) {
                return false;
            }
        }
    }
    // 属性选择器
    if (selector.attrs.length) {
        for (var i$1 = 0; i$1 < selector.attrs.length; i$1++) {
            var ref = selector.attrs[i$1];
                var all = ref.all;
                var key = ref.key;
                var value = ref.value;
            if (all && !el.hasAttribute(key)) {
                return false;
            }
            else {
                var attr = el.getAttribute(key);
                if (attr !== unquote(value || '')) {
                    return false;
                }
            }
        }
    }
    return true;
};
function getPreviousElement(el) {
    var parent = el.parentElement;
    if (!parent)
        { return null; }
    var prev = el.previousSibling;
    if (!prev)
        { return null; }
    if (prev.nodeType === 1 /* ELEMENT_NODE */) {
        return prev;
    }
    else {
        return getPreviousElement(prev);
    }
}

var closingTagAncestorBreakers = {
    li: ['ul', 'ol', 'menu'],
    dt: ['dl'],
    dd: ['dl'],
    tbody: ['table'],
    thead: ['table'],
    tfoot: ['table'],
    tr: ['table'],
    td: ['table']
};
function hasTerminalParent(tagName, stack) {
    var tagParents = closingTagAncestorBreakers[tagName];
    if (tagParents) {
        var currentIndex = stack.length - 1;
        while (currentIndex >= 0) {
            var parentTagName = stack[currentIndex].tagName;
            if (parentTagName === tagName) {
                break;
            }
            if (tagParents && tagParents.includes(parentTagName)) {
                return true;
            }
            currentIndex--;
        }
    }
    return false;
}
function unquote(str) {
    var car = str.charAt(0);
    var end = str.length - 1;
    var isQuoteStart = car === '"' || car === "'";
    if (isQuoteStart && car === str.charAt(end)) {
        return str.slice(1, end);
    }
    return str;
}
function getTagName(tag) {
    if (options.html.renderHTMLTag) {
        return tag;
    }
    if (specialMiniElements[tag]) {
        return specialMiniElements[tag];
    }
    else if (isMiniElements(tag)) {
        return tag;
    }
    else if (isBlockElements(tag)) {
        return 'view';
    }
    else if (isInlineElements(tag)) {
        return 'text';
    }
    return 'view';
}
function splitEqual(str) {
    var sep = '=';
    var idx = str.indexOf(sep);
    if (idx === -1)
        { return [str]; }
    var key = str.slice(0, idx).trim();
    var value = str.slice(idx + sep.length).trim();
    return [key, value];
}
function format(children, styleOptions, parent) {
    return children
        .filter(function (child) {
        // 过滤注释和空文本节点
        if (child.type === 'comment') {
            return false;
        }
        else if (child.type === 'text') {
            return child.content !== '';
        }
        return true;
    })
        .map(function (child) {
        // 文本节点
        if (child.type === 'text') {
            var text = document$1.createTextNode(child.content);
            if (shared.isFunction(options.html.transformText)) {
                return options.html.transformText(text, child);
            }
            parent === null || parent === void 0 ? void 0 : parent.appendChild(text);
            return text;
        }
        var el = document$1.createElement(getTagName(child.tagName));
        el.h5tagName = child.tagName;
        parent === null || parent === void 0 ? void 0 : parent.appendChild(el);
        if (!options.html.renderHTMLTag) {
            el.className = child.tagName;
        }
        for (var i = 0; i < child.attributes.length; i++) {
            var attr = child.attributes[i];
            var ref = splitEqual(attr);
            var key = ref[0];
            var value = ref[1];
            if (key === 'class') {
                el.className += ' ' + unquote(value);
            }
            else if (key[0] === 'o' && key[1] === 'n') {
                continue;
            }
            else {
                el.setAttribute(key, value == null ? true : unquote(value));
            }
        }
        var styleTagParser = styleOptions.styleTagParser;
        var descendantList = styleOptions.descendantList;
        var list = descendantList.slice();
        var style = styleTagParser.matchStyle(child.tagName, el, list);
        el.setAttribute('style', style + el.style.cssText);
        // console.log('style, ', style)
        format(child.children, {
            styleTagParser: styleTagParser,
            descendantList: list
        }, el);
        if (shared.isFunction(options.html.transformElement)) {
            return options.html.transformElement(el, child);
        }
        return el;
    });
}
function parser(html) {
    var styleTagParser = new StyleTagParser();
    html = styleTagParser.extractStyle(html);
    var tokens = new Scaner(html).scan();
    var root = { tagName: '', children: [], type: 'element', attributes: [] };
    var state = { tokens: tokens, options: options, cursor: 0, stack: [root] };
    parse(state);
    return format(root.children, {
        styleTagParser: styleTagParser,
        descendantList: Array(styleTagParser.styles.length).fill(0)
    });
}
function parse(state) {
    var tokens = state.tokens;
    var stack = state.stack;
    var cursor = state.cursor;
    var len = tokens.length;
    var nodes = stack[stack.length - 1].children;
    while (cursor < len) {
        var token = tokens[cursor];
        if (token.type !== 'tag-start') {
            // comment or text
            nodes.push(token);
            cursor++;
            continue;
        }
        var tagToken = tokens[++cursor];
        cursor++;
        var tagName = tagToken.content.toLowerCase();
        if (token.close) {
            var index = stack.length;
            var shouldRewind = false;
            while (--index > -1) {
                if (stack[index].tagName === tagName) {
                    shouldRewind = true;
                    break;
                }
            }
            while (cursor < len) {
                var endToken = tokens[cursor];
                if (endToken.type !== 'tag-end')
                    { break; }
                cursor++;
            }
            if (shouldRewind) {
                stack.splice(index);
                break;
            }
            else {
                continue;
            }
        }
        var isClosingTag = options.html.closingElements.has(tagName);
        var shouldRewindToAutoClose = isClosingTag;
        if (shouldRewindToAutoClose) {
            shouldRewindToAutoClose = !hasTerminalParent(tagName, stack);
        }
        if (shouldRewindToAutoClose) {
            var currentIndex = stack.length - 1;
            while (currentIndex > 0) {
                if (tagName === stack[currentIndex].tagName) {
                    stack.splice(currentIndex);
                    var previousIndex = currentIndex - 1;
                    nodes = stack[previousIndex].children;
                    break;
                }
                currentIndex = currentIndex - 1;
            }
        }
        var attributes = [];
        var attrToken = (void 0);
        while (cursor < len) {
            attrToken = tokens[cursor];
            if (attrToken.type === 'tag-end')
                { break; }
            attributes.push(attrToken.content);
            cursor++;
        }
        cursor++;
        var children = [];
        var element = {
            type: 'element',
            tagName: tagToken.content,
            attributes: attributes,
            children: children
        };
        nodes.push(element);
        var hasChildren = !(attrToken.close || options.html.voidElements.has(tagName));
        if (hasChildren) {
            stack.push({ tagName: tagName, children: children });
            var innerState = { tokens: tokens, cursor: cursor, stack: stack };
            parse(innerState);
            cursor = innerState.cursor;
        }
    }
    state.cursor = cursor;
}

function setInnerHTML(element, html) {
    element.childNodes.forEach(function (node) {
        element.removeChild(node);
    });
    var children = parser(html);
    for (var i = 0; i < children.length; i++) {
        element.appendChild(children[i]);
    }
}

var nodeId = incrementId();
var TaroNode = /*@__PURE__*/(function (TaroEventTarget) {
    function TaroNode(nodeType, nodeName) {
        TaroEventTarget.call(this);
        this.parentNode = null;
        this.childNodes = [];
        this.hydrate = function (node) { return function () { return hydrate(node); }; };
        this.nodeType = nodeType;
        this.nodeName = nodeName;
        this.uid = "_n_" + (nodeId());
        eventSource.set(this.uid, this);
    }

    if ( TaroEventTarget ) TaroNode.__proto__ = TaroEventTarget;
    TaroNode.prototype = Object.create( TaroEventTarget && TaroEventTarget.prototype );
    TaroNode.prototype.constructor = TaroNode;

    var prototypeAccessors = { _path: { configurable: true },_root: { configurable: true },parentElement: { configurable: true },nextSibling: { configurable: true },previousSibling: { configurable: true },firstChild: { configurable: true },lastChild: { configurable: true },textContent: { configurable: true },innerHTML: { configurable: true } };
    prototypeAccessors._path.get = function () {
        if (this.parentNode !== null) {
            var indexOfNode = this.parentNode.childNodes.indexOf(this);
            var index = CurrentReconciler.getPathIndex(indexOfNode);
            return ((this.parentNode._path) + "." + ("cn") + "." + index);
        }
        return '';
    };
    prototypeAccessors._root.get = function () {
        if (this.parentNode !== null) {
            return this.parentNode._root;
        }
        return null;
    };
    prototypeAccessors.parentElement.get = function () {
        var parentNode = this.parentNode;
        if (parentNode != null && parentNode.nodeType === 1 /* ELEMENT_NODE */) {
            return parentNode;
        }
        return null;
    };
    prototypeAccessors.nextSibling.get = function () {
        var parentNode = this.parentNode;
        if (parentNode) {
            return parentNode.childNodes[this.findIndex(parentNode.childNodes, this) + 1] || null;
        }
        return null;
    };
    prototypeAccessors.previousSibling.get = function () {
        var parentNode = this.parentNode;
        if (parentNode) {
            return parentNode.childNodes[this.findIndex(parentNode.childNodes, this) - 1] || null;
        }
        return null;
    };
    TaroNode.prototype.insertBefore = function insertBefore (newChild, refChild, isReplace) {
        var this$1 = this;

        var _a;
        newChild.remove();
        newChild.parentNode = this;
        var payload;
        if (refChild) {
            var index = this.findIndex(this.childNodes, refChild);
            this.childNodes.splice(index, 0, newChild);
            if (isReplace === true) {
                payload = {
                    path: newChild._path,
                    value: this.hydrate(newChild)
                };
            }
            else {
                payload = {
                    path: ((this._path) + "." + ("cn")),
                    value: function () { return this$1.childNodes.map(hydrate); }
                };
            }
        }
        else {
            this.childNodes.push(newChild);
            payload = {
                path: newChild._path,
                value: this.hydrate(newChild)
            };
        }
        (_a = CurrentReconciler.insertBefore) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this, newChild, refChild);
        this.enqueueUpdate(payload);
        if (!eventSource.has(newChild.uid)) {
            eventSource.set(newChild.uid, newChild);
        }
        return newChild;
    };
    TaroNode.prototype.appendChild = function appendChild (child) {
        var _a;
        this.insertBefore(child);
        (_a = CurrentReconciler.appendChild) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this, child);
    };
    TaroNode.prototype.replaceChild = function replaceChild (newChild, oldChild) {
        var _a;
        if (oldChild.parentNode === this) {
            this.insertBefore(newChild, oldChild, true);
            oldChild.remove(true);
            return oldChild;
        }
        (_a = CurrentReconciler.removeChild) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this, newChild, oldChild);
    };
    TaroNode.prototype.removeChild = function removeChild (child, isReplace) {
        var this$1 = this;

        var index = this.findIndex(this.childNodes, child);
        this.childNodes.splice(index, 1);
        if (isReplace !== true) {
            this.enqueueUpdate({
                path: ((this._path) + "." + ("cn")),
                value: function () { return this$1.childNodes.map(hydrate); }
            });
        }
        child.parentNode = null;
        eventSource.delete(child.uid);
        // @TODO: eventSource memory overflow
        // child._empty()
        return child;
    };
    TaroNode.prototype.remove = function remove (isReplace) {
        if (this.parentNode) {
            this.parentNode.removeChild(this, isReplace);
        }
    };
    prototypeAccessors.firstChild.get = function () {
        return this.childNodes[0] || null;
    };
    prototypeAccessors.lastChild.get = function () {
        var c = this.childNodes;
        return c[c.length - 1] || null;
    };
    TaroNode.prototype.hasChildNodes = function hasChildNodes () {
        return this.childNodes.length > 0;
    };
    TaroNode.prototype.enqueueUpdate = function enqueueUpdate (payload) {
        if (this._root === null) {
            return;
        }
        this._root.enqueueUpdate(payload);
    };
    /**
     * like jQuery's $.empty()
     */
    TaroNode.prototype._empty = function _empty () {
        while (this.childNodes.length > 0) {
            var child = this.childNodes[0];
            child.parentNode = null;
            eventSource.delete(child.uid);
            this.childNodes.shift();
        }
    };
    /**
     * @textContent 目前只能置空子元素
     * @TODO 等待完整 innerHTML 实现
     */
    prototypeAccessors.textContent.set = function (text) {
        this._empty();
        if (text === '') {
            this.enqueueUpdate({
                path: ((this._path) + "." + ("cn")),
                value: function () { return []; }
            });
        }
        else {
            this.appendChild(document$1.createTextNode(text));
        }
    };
    prototypeAccessors.innerHTML.set = function (html) {
        setInnerHTML(this, html);
    };
    prototypeAccessors.innerHTML.get = function () {
        return '';
    };
    TaroNode.prototype.findIndex = function findIndex (childeNodes, refChild) {
        var index = childeNodes.indexOf(refChild);
        shared.ensure(index !== -1, 'The node to be replaced is not a child of this node.');
        return index;
    };
    TaroNode.prototype.cloneNode = function cloneNode (isDeep) {
        if ( isDeep === void 0 ) isDeep = false;

        var constructor = this.constructor;
        var newNode;
        if (this.nodeType === 1 /* ELEMENT_NODE */) {
            newNode = new constructor(this.nodeType, this.nodeName);
        }
        else if (this.nodeType === 3 /* TEXT_NODE */) {
            newNode = new constructor('');
        }
        for (var key in this) {
            var value = this[key];
            if (['props', 'dataset'].includes(key) && typeof value === 'object') {
                newNode[key] = Object.assign({}, value);
            }
            else if (key === '_value') {
                newNode[key] = value;
            }
            else if (key === 'style') {
                newNode.style._value = Object.assign({}, value._value);
                newNode.style._usedStyleProp = new Set(Array.from(value._usedStyleProp));
            }
        }
        if (isDeep) {
            newNode.childNodes = this.childNodes.map(function (node) { return node.cloneNode(true); });
        }
        return newNode;
    };

    Object.defineProperties( TaroNode.prototype, prototypeAccessors );

    return TaroNode;
}(TaroEventTarget));

var TaroText = /*@__PURE__*/(function (TaroNode) {
    function TaroText(text) {
        TaroNode.call(this, 3 /* TEXT_NODE */, '#text');
        this._value = text;
    }

    if ( TaroNode ) TaroText.__proto__ = TaroNode;
    TaroText.prototype = Object.create( TaroNode && TaroNode.prototype );
    TaroText.prototype.constructor = TaroText;

    var prototypeAccessors = { textContent: { configurable: true },nodeValue: { configurable: true } };
    prototypeAccessors.textContent.set = function (text) {
        this._value = text;
        this.enqueueUpdate({
            path: ((this._path) + "." + ("v")),
            value: text
        });
    };
    prototypeAccessors.textContent.get = function () {
        return this._value;
    };
    prototypeAccessors.nodeValue.set = function (text) {
        this.textContent = text;
    };
    prototypeAccessors.nodeValue.get = function () {
        return this._value;
    };

    Object.defineProperties( TaroText.prototype, prototypeAccessors );

    return TaroText;
}(TaroNode));

/*
 *
 * https://www.w3.org/Style/CSS/all-properties.en.html
 */
var styleProperties = [
    'alignContent',
    'alignItems',
    'alignSelf',
    'alignmentAdjust',
    'alignmentBaseline',
    'all',
    'animation',
    'animationDelay',
    'animationDirection',
    'animationDuration',
    'animationFillMode',
    'animationIterationCount',
    'animationName',
    'animationPlayState',
    'animationTimingFunction',
    'appearance',
    'azimuth',
    'backfaceVisibility',
    'background',
    'backgroundAttachment',
    'backgroundBlendMode',
    'backgroundClip',
    'backgroundColor',
    'backgroundImage',
    'backgroundOrigin',
    'backgroundPosition',
    'backgroundRepeat',
    'backgroundSize',
    'baselineShift',
    'blockOverflow',
    'blockSize',
    'bookmarkLabel',
    'bookmarkLevel',
    'bookmarkState',
    'border',
    'borderBlock',
    'borderBlockColor',
    'borderBlockEnd',
    'borderBlockEndColor',
    'borderBlockEndStyle',
    'borderBlockEndWidth',
    'borderBlockStart',
    'borderBlockStartColor',
    'borderBlockStartStyle',
    'borderBlockStartWidth',
    'borderBlockStyle',
    'borderBlockWidth',
    'borderBottom',
    'borderBottomColor',
    'borderBottomFitLength',
    'borderBottomFitWidth',
    'borderBottomImage',
    'borderBottomLeftFitWidth',
    'borderBottomLeftImage',
    'borderBottomLeftRadius',
    'borderBottomRightFitLength',
    'borderBottomRightFitWidth',
    'borderBottomRightImage',
    'borderBottomRightRadius',
    'borderBottomStyle',
    'borderBottomWidth',
    'borderBottomlEftFitLength',
    'borderBoundary',
    'borderBreak',
    'borderCollapse',
    'borderColor',
    'borderCornerFit',
    'borderCornerImage',
    'borderCornerImageTransform',
    'borderEndEndRadius',
    'borderEndStartRadius',
    'borderFit',
    'borderFitLength',
    'borderFitWidth',
    'borderImage',
    'borderImageOutset',
    'borderImageRepeat',
    'borderImageSlice',
    'borderImageSource',
    'borderImageTransform',
    'borderImageWidth',
    'borderInline',
    'borderInlineColor',
    'borderInlineEnd',
    'borderInlineEndColor',
    'borderInlineEndStyle',
    'borderInlineEndWidth',
    'borderInlineStart',
    'borderInlineStartColor',
    'borderInlineStartStyle',
    'borderInlineStartWidth',
    'borderInlineStyle',
    'borderInlineWidth',
    'borderLeft',
    'borderLeftColor',
    'borderLeftFitLength',
    'borderLeftFitWidth',
    'borderLeftImage',
    'borderLeftStyle',
    'borderLeftWidth',
    'borderRadius',
    'borderRight',
    'borderRightColor',
    'borderRightFitLength',
    'borderRightFitWidth',
    'borderRightImage',
    'borderRightStyle',
    'borderRightWidth',
    'borderSpacing',
    'borderStartEndRadius',
    'borderStartStartRadius',
    'borderStyle',
    'borderTop',
    'borderTopColor',
    'borderTopFitLength',
    'borderTopFitWidth',
    'borderTopImage',
    'borderTopLeftFitLength',
    'borderTopLeftFitWidth',
    'borderTopLeftImage',
    'borderTopLeftRadius',
    'borderTopRightFitLength',
    'borderTopRightFitWidth',
    'borderTopRightImage',
    'borderTopRightRadius',
    'borderTopStyle',
    'borderTopWidth',
    'borderWidth',
    'bottom',
    'boxDecorationBreak',
    'boxShadow',
    'boxSizing',
    'boxSnap',
    'breakAfter',
    'breakBefore',
    'breakInside',
    'captionSide',
    'caret',
    'caretColor',
    'caretShape',
    'chains',
    'clear',
    'clip',
    'clipPath',
    'clipRule',
    'color',
    'colorAdjust',
    'colorInterpolationFilters',
    'colorScheme',
    'columnCount',
    'columnFill',
    'columnGap',
    'columnRule',
    'columnRuleColor',
    'columnRuleStyle',
    'columnRuleWidth',
    'columnSpan',
    'columnWidth',
    'columns',
    'contain',
    'content',
    'continue',
    'counterIncrement',
    'counterReset',
    'counterSet',
    'cue',
    'cueAfter',
    'cueBefore',
    'cursor',
    'direction',
    'display',
    'dominantBaseline',
    'dropInitialAfterAdjust',
    'dropInitialAfterAlign',
    'dropInitialBeforeAdjust',
    'dropInitialBeforeAlign',
    'dropInitialSize',
    'dropInitialValue',
    'elevation',
    'emptyCells',
    'filter',
    'flex',
    'flexBasis',
    'flexDirection',
    'flexFlow',
    'flexGrow',
    'flexShrink',
    'flexWrap',
    'float',
    'floodColor',
    'floodOpacity',
    'flow',
    'flowFrom',
    'flowInto',
    'font',
    'fontFamily',
    'fontFeatureSettings',
    'fontKerning',
    'fontLanguageOverride',
    'fontMaxSize',
    'fontMinSize',
    'fontOpticalSizing',
    'fontPalette',
    'fontSize',
    'fontSizeAdjust',
    'fontStretch',
    'fontStyle',
    'fontSynthesis',
    'fontSynthesisSmallCaps',
    'fontSynthesisStyle',
    'fontSynthesisWeight',
    'fontVariant',
    'fontVariantAlternates',
    'fontVariantCaps',
    'fontVariantEastAsian',
    'fontVariantEmoji',
    'fontVariantLigatures',
    'fontVariantNumeric',
    'fontVariantPosition',
    'fontVariationSettings',
    'fontWeight',
    'footnoteDisplay',
    'footnotePolicy',
    'forcedColorAdjust',
    'gap',
    'glyphOrientationVertical',
    'grid',
    'gridArea',
    'gridAutoColumns',
    'gridAutoFlow',
    'gridAutoRows',
    'gridColumn',
    'gridColumnEnd',
    'gridColumnStart',
    'gridRow',
    'gridRowEnd',
    'gridRowStart',
    'gridTemplate',
    'gridTemplateAreas',
    'gridTemplateColumns',
    'gridTemplateRows',
    'hangingPunctuation',
    'height',
    'hyphenateCharacter',
    'hyphenateLimitChars',
    'hyphenateLimitLast',
    'hyphenateLimitLines',
    'hyphenateLimitZone',
    'hyphens',
    'imageOrientation',
    'imageResolution',
    'initialLetters',
    'initialLettersAlign',
    'initialLettersWrap',
    'inlineBoxAlign',
    'inlineSize',
    'inlineSizing',
    'inset',
    'insetBlock',
    'insetBlockEnd',
    'insetBlockStart',
    'insetInline',
    'insetInlineEnd',
    'insetInlineStart',
    'isolation',
    'justifyContent',
    'justifyItems',
    'justifySelf',
    'left',
    'letterSpacing',
    'lightingColor',
    'lineBreak',
    'lineClamp',
    'lineGrid',
    'lineHeight',
    'linePadding',
    'lineSnap',
    'lineStacking',
    'lineStackingRuby',
    'lineStackingShift',
    'lineStackingStrategy',
    'listStyle',
    'listStyleImage',
    'listStylePosition',
    'listStyleType',
    'margin',
    'marginBlock',
    'marginBlockEnd',
    'marginBlockStart',
    'marginBottom',
    'marginInline',
    'marginInlineEnd',
    'marginInlineStart',
    'marginLeft',
    'marginRight',
    'marginTop',
    'marginTrim',
    'markerSide',
    'mask',
    'maskBorder',
    'maskBorderMode',
    'maskBorderOutset',
    'maskBorderRepeat',
    'maskBorderSlice',
    'maskBorderSource',
    'maskBorderWidth',
    'maskClip',
    'maskComposite',
    'maskImage',
    'maskMode',
    'maskOrigin',
    'maskPosition',
    'maskRepeat',
    'maskSize',
    'maskType',
    'maxBlockSize',
    'maxHeight',
    'maxInlineSize',
    'maxLines',
    'maxWidth',
    'minBlockSize',
    'minHeight',
    'minInlineSize',
    'minWidth',
    'mixBlendMode',
    'navDown',
    'navLeft',
    'navRight',
    'navUp',
    'objectFit',
    'objectPosition',
    'offset',
    'offsetAfter',
    'offsetAnchor',
    'offsetBefore',
    'offsetDistance',
    'offsetEnd',
    'offsetPath',
    'offsetPosition',
    'offsetRotate',
    'offsetStart',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outlineColor',
    'outlineOffset',
    'outlineStyle',
    'outlineWidth',
    'overflow',
    'overflowBlock',
    'overflowInline',
    'overflowWrap',
    'overflowX',
    'overflowY',
    'padding',
    'paddingBlock',
    'paddingBlockEnd',
    'paddingBlockStart',
    'paddingBottom',
    'paddingInline',
    'paddingInlineEnd',
    'paddingInlineStart',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'page',
    'pageBreakAfter',
    'pageBreakBefore',
    'pageBreakInside',
    'pause',
    'pauseAfter',
    'pauseBefore',
    'perspective',
    'perspectiveOrigin',
    'pitch',
    'pitchRange',
    'placeContent',
    'placeItems',
    'placeSelf',
    'playDuring',
    'pointerEvents',
    'position',
    'quotes',
    'regionFragment',
    'resize',
    'richness',
    'right',
    'rowGap',
    'rubyAlign',
    'rubyMerge',
    'rubyPosition',
    'running',
    'scrollBehavior',
    'scrollMargin',
    'scrollMarginBlock',
    'scrollMarginBlockEnd',
    'scrollMarginBlockStart',
    'scrollMarginBottom',
    'scrollMarginInline',
    'scrollMarginInlineEnd',
    'scrollMarginInlineStart',
    'scrollMarginLeft',
    'scrollMarginRight',
    'scrollMarginTop',
    'scrollPadding',
    'scrollPaddingBlock',
    'scrollPaddingBlockEnd',
    'scrollPaddingBlockStart',
    'scrollPaddingBottom',
    'scrollPaddingInline',
    'scrollPaddingInlineEnd',
    'scrollPaddingInlineStart',
    'scrollPaddingLeft',
    'scrollPaddingRight',
    'scrollPaddingTop',
    'scrollSnapAlign',
    'scrollSnapStop',
    'scrollSnapType',
    'shapeImageThreshold',
    'shapeInside',
    'shapeMargin',
    'shapeOutside',
    'speak',
    'speakHeader',
    'speakNumeral',
    'speakPunctuation',
    'speechRate',
    'stress',
    'stringSet',
    'tabSize',
    'tableLayout',
    'textAlign',
    'textAlignAll',
    'textAlignLast',
    'textCombineUpright',
    'textDecoration',
    'textDecorationColor',
    'textDecorationLine',
    'textDecorationStyle',
    'textEmphasis',
    'textEmphasisColor',
    'textEmphasisPosition',
    'textEmphasisStyle',
    'textGroupAlign',
    'textHeight',
    'textIndent',
    'textJustify',
    'textOrientation',
    'textOverflow',
    'textShadow',
    'textSpaceCollapse',
    'textSpaceTrim',
    'textSpacing',
    'textTransform',
    'textUnderlinePosition',
    'textWrap',
    'top',
    'transform',
    'transformBox',
    'transformOrigin',
    'transformStyle',
    'transition',
    'transitionDelay',
    'transitionDuration',
    'transitionProperty',
    'transitionTimingFunction',
    'unicodeBidi',
    'userSelect',
    'verticalAlign',
    'visibility',
    'voiceFamily',
    'volume',
    'whiteSpace',
    'widows',
    'width',
    'willChange',
    'wordBreak',
    'wordSpacing',
    'wordWrap',
    'wrapAfter',
    'wrapBefore',
    'wrapFlow',
    'wrapInside',
    'wrapThrough',
    'writingMode',
    'zIndex'
];

function setStyle(newVal, styleKey) {
    var old = this[styleKey];
    if (newVal) {
        this._usedStyleProp.add(styleKey);
    }
    shared.warn(shared.isString(newVal) && newVal.length > PROPERTY_THRESHOLD, ("Style 属性 " + styleKey + " 的值数据量过大，可能会影响渲染性能，考虑使用 CSS 类或其它方案替代。"));
    if (old !== newVal) {
        this._value[styleKey] = newVal;
        this._element.enqueueUpdate({
            path: ((this._element._path) + "." + ("st")),
            value: this.cssText
        });
    }
}
function initStyle(ctor) {
    var properties = {};
    var loop = function ( i ) {
        var styleKey = styleProperties[i];
        properties[styleKey] = {
            get: function get() {
                return this._value[styleKey] || '';
            },
            set: function set(newVal) {
                setStyle.call(this, newVal, styleKey);
            }
        };
    };

    for (var i = 0; i < styleProperties.length; i++) loop( i );
    Object.defineProperties(ctor.prototype, properties);
}
function isCssVariable(propertyName) {
    return /^--/.test(propertyName);
}
var Style = function Style(element) {
    this._element = element;
    this._usedStyleProp = new Set();
    this._value = {};
};

var prototypeAccessors = { cssText: { configurable: true } };
Style.prototype.setCssVariables = function setCssVariables (styleKey) {
        var this$1 = this;

    this.hasOwnProperty(styleKey) || Object.defineProperty(this, styleKey, {
        enumerable: true,
        configurable: true,
        get: function () {
            return this$1._value[styleKey] || '';
        },
        set: function (newVal) {
            setStyle.call(this$1, newVal, styleKey);
        }
    });
};
prototypeAccessors.cssText.get = function () {
        var this$1 = this;

    var text = '';
    this._usedStyleProp.forEach(function (key) {
        var val = this$1[key];
        if (!val)
            { return; }
        var styleName = isCssVariable(key) ? key : shared.toDashed(key);
        text += styleName + ": " + val + ";";
    });
    return text;
};
prototypeAccessors.cssText.set = function (str) {
        var this$1 = this;

    if (str == null) {
        str = '';
    }
    this._usedStyleProp.forEach(function (prop) {
        this$1.removeProperty(prop);
    });
    if (str === '') {
        return;
    }
    var rules = str.split(';');
    for (var i = 0; i < rules.length; i++) {
        var rule = rules[i].trim();
        if (rule === '') {
            continue;
        }
        // 可能存在 'background: url(http:x/y/z)' 的情况
        var ref = rule.split(':');
            var propName = ref[0];
            var valList = ref.slice(1);
        var val = valList.join(':');
        if (shared.isUndefined(val)) {
            continue;
        }
        this.setProperty(propName.trim(), val.trim());
    }
};
Style.prototype.setProperty = function setProperty (propertyName, value) {
    if (propertyName[0] === '-') {
        // 支持 webkit 属性或 css 变量
        this.setCssVariables(propertyName);
    }
    else {
        propertyName = shared.toCamelCase(propertyName);
    }
    if (shared.isUndefined(value)) {
        return;
    }
    if (value === null || value === '') {
        this.removeProperty(propertyName);
    }
    else {
        this[propertyName] = value;
    }
};
Style.prototype.removeProperty = function removeProperty (propertyName) {
    propertyName = shared.toCamelCase(propertyName);
    if (!this._usedStyleProp.has(propertyName)) {
        return '';
    }
    var value = this[propertyName];
    this[propertyName] = '';
    this._usedStyleProp.delete(propertyName);
    return value;
};
Style.prototype.getPropertyValue = function getPropertyValue (propertyName) {
    propertyName = shared.toCamelCase(propertyName);
    var value = this[propertyName];
    if (!value) {
        return '';
    }
    return value;
};

Object.defineProperties( Style.prototype, prototypeAccessors );
initStyle(Style);

function returnTrue() {
    return true;
}
function treeToArray(root, predict) {
    var array = [];
    var filter = predict !== null && predict !== void 0 ? predict : returnTrue;
    var object = root;
    while (object) {
        if (object.nodeType === 1 /* ELEMENT_NODE */ && filter(object)) {
            array.push(object);
        }
        object = following(object, root);
    }
    return array;
}
function following(el, root) {
    var firstChild = el.firstChild;
    if (firstChild) {
        return firstChild;
    }
    var current = el;
    do {
        if (current === root) {
            return null;
        }
        var nextSibling = current.nextSibling;
        if (nextSibling) {
            return nextSibling;
        }
        current = current.parentElement;
    } while (current);
    return null;
}

var ClassList = /*@__PURE__*/(function (Set) {
    function ClassList(className, el) {
        Set.call(this);
        className.trim().split(/\s+/).forEach(Set.prototype.add.bind(this));
        this.el = el;
    }

    if ( Set ) ClassList.__proto__ = Set;
    ClassList.prototype = Object.create( Set && Set.prototype );
    ClassList.prototype.constructor = ClassList;

    var prototypeAccessors = { value: { configurable: true } };
    prototypeAccessors.value.get = function () {
        return [].concat( this ).join(' ');
    };
    ClassList.prototype.add = function add (s) {
        Set.prototype.add.call(this, s);
        this._update();
        return this;
    };
    ClassList.prototype.remove = function remove (s) {
        Set.prototype.delete.call(this, s);
        this._update();
    };
    ClassList.prototype.toggle = function toggle (s) {
        if (Set.prototype.has.call(this, s)) {
            Set.prototype.delete.call(this, s);
        }
        else {
            Set.prototype.add.call(this, s);
        }
        this._update();
    };
    ClassList.prototype.replace = function replace (s1, s2) {
        Set.prototype.delete.call(this, s1);
        Set.prototype.add.call(this, s2);
        this._update();
    };
    ClassList.prototype.contains = function contains (s) {
        return Set.prototype.has.call(this, s);
    };
    ClassList.prototype.toString = function toString () {
        return this.value;
    };
    ClassList.prototype._update = function _update () {
        this.el.className = this.value;
    };

    Object.defineProperties( ClassList.prototype, prototypeAccessors );

    return ClassList;
}(Set));

/* eslint-disable no-dupe-class-members */
var TaroElement = /*@__PURE__*/(function (TaroNode) {
    function TaroElement(nodeType, nodeName) {
        var _a;
        TaroNode.call(this, nodeType || 1 /* ELEMENT_NODE */, nodeName);
        this.props = {};
        this.dataset = shared.EMPTY_OBJ;
        this.tagName = nodeName.toUpperCase();
        this.style = new Style(this);
        (_a = CurrentReconciler.onTaroElementCreate) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this.tagName, nodeType);
    }

    if ( TaroNode ) TaroElement.__proto__ = TaroNode;
    TaroElement.prototype = Object.create( TaroNode && TaroNode.prototype );
    TaroElement.prototype.constructor = TaroElement;

    var prototypeAccessors = { id: { configurable: true },classList: { configurable: true },className: { configurable: true },cssText: { configurable: true },children: { configurable: true },attributes: { configurable: true },textContent: { configurable: true } };
    prototypeAccessors.id.get = function () {
        return this.getAttribute('id');
    };
    prototypeAccessors.id.set = function (val) {
        this.setAttribute('id', val);
    };
    prototypeAccessors.classList.get = function () {
        return new ClassList(this.className, this);
    };
    prototypeAccessors.className.get = function () {
        return this.getAttribute('class') || '';
    };
    prototypeAccessors.className.set = function (val) {
        this.setAttribute('class', val);
    };
    prototypeAccessors.cssText.get = function () {
        return this.getAttribute('style') || '';
    };
    prototypeAccessors.children.get = function () {
        return this.childNodes.filter(isElement);
    };
    TaroElement.prototype.hasAttribute = function hasAttribute (qualifiedName) {
        return !shared.isUndefined(this.props[qualifiedName]);
    };
    TaroElement.prototype.hasAttributes = function hasAttributes () {
        return this.attributes.length > 0;
    };
    TaroElement.prototype.focus = function focus () {
        this.setAttribute('focus', true);
    };
    TaroElement.prototype.blur = function blur () {
        this.setAttribute('focus', false);
    };
    TaroElement.prototype.setAttribute = function setAttribute (qualifiedName, value) {
        var _a;
        shared.warn(shared.isString(value) && value.length > PROPERTY_THRESHOLD, ("元素 " + (this.nodeName) + " 的 属性 " + qualifiedName + " 的值数据量过大，可能会影响渲染性能。考虑降低图片转为 base64 的阈值或在 CSS 中使用 base64。"));
        if (qualifiedName === 'style') {
            this.style.cssText = value;
            qualifiedName = "st" /* Style */;
        }
        else if (qualifiedName === 'id') {
            eventSource.delete(this.uid);
            value = String(value);
            this.props[qualifiedName] = this.uid = value;
            eventSource.set(value, this);
            qualifiedName = 'uid';
        }
        else {
            // pure-view => static-view
            if (this.nodeName === 'view' && !isHasExtractProp(this) && !(/class|style|id/.test(qualifiedName)) && !this.isAnyEventBinded()) {
                this.enqueueUpdate({
                    path: ((this._path) + "." + ("nn")),
                    value: 'static-view'
                });
            }
            this.props[qualifiedName] = value;
            if (qualifiedName === 'class') {
                qualifiedName = "cl" /* Class */;
            }
            else if (qualifiedName.startsWith('data-')) {
                if (this.dataset === shared.EMPTY_OBJ) {
                    this.dataset = Object.create(null);
                }
                this.dataset[shared.toCamelCase(qualifiedName.replace(/^data-/, ''))] = value;
            }
        }
        (_a = CurrentReconciler.setAttribute) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this, qualifiedName, value);
        this.enqueueUpdate({
            path: ((this._path) + "." + (shared.toCamelCase(qualifiedName))),
            value: value
        });
    };
    TaroElement.prototype.removeAttribute = function removeAttribute (qualifiedName) {
        var _a;
        if (qualifiedName === 'style') {
            this.style.cssText = '';
        }
        else {
            delete this.props[qualifiedName];
            if (qualifiedName === 'class') {
                qualifiedName = "cl" /* Class */;
            }
        }
        (_a = CurrentReconciler.removeAttribute) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, this, qualifiedName);
        this.enqueueUpdate({
            path: ((this._path) + "." + (shared.toCamelCase(qualifiedName))),
            value: ''
        });
        if (this.nodeName === 'view' && !isHasExtractProp(this) && !this.isAnyEventBinded()) {
            // static-view => pure-view
            this.enqueueUpdate({
                path: ((this._path) + "." + ("nn")),
                value: 'pure-view'
            });
        }
    };
    TaroElement.prototype.getAttribute = function getAttribute (qualifiedName) {
        var attr = qualifiedName === 'style' ? this.style.cssText : this.props[qualifiedName];
        return attr !== null && attr !== void 0 ? attr : '';
    };
    prototypeAccessors.attributes.get = function () {
        var this$1 = this;

        var propKeys = Object.keys(this.props);
        var style = this.style.cssText;
        var attrs = propKeys.map(function (p) { return ({ name: p, value: this$1.props[p] }); });
        return attrs.concat(style ? { name: 'style', value: style } : []);
    };
    TaroElement.prototype.getElementsByTagName = function getElementsByTagName (tagName) {
        var this$1 = this;

        return treeToArray(this, function (el) {
            return el.nodeName === tagName || (tagName === '*' && this$1 !== el);
        });
    };
    TaroElement.prototype.getElementsByClassName = function getElementsByClassName (className) {
        return treeToArray(this, function (el) {
            var classList = el.classList;
            var classNames = className.trim().split(/\s+/);
            return classNames.every(function (c) { return classList.has(c); });
        });
    };
    TaroElement.prototype.dispatchEvent = function dispatchEvent (event) {
        var cancelable = event.cancelable;
        if (shared.isFunction(CurrentReconciler.modifyDispatchEvent)) {
            CurrentReconciler.modifyDispatchEvent(event, this.tagName);
        }
        var listeners = this.__handlers[event.type];
        if (!shared.isArray(listeners)) {
            return;
        }
        for (var i = listeners.length; i--;) {
            var listener = listeners[i];
            var result = (void 0);
            if (listener._stop) {
                listener._stop = false;
            }
            else {
                result = listener.call(this, event);
            }
            if ((result === false || event._end) && cancelable) {
                event.defaultPrevented = true;
            }
            if (event._end && event._stop) {
                break;
            }
        }
        if (event._stop) {
            this._stopPropagation(event);
        }
        else {
            event._stop = true;
        }
        return listeners != null;
    };
    prototypeAccessors.textContent.get = function () {
        var text = '';
        for (var i = 0; i < this.childNodes.length; i++) {
            var element = this.childNodes[i];
            text += element.textContent;
        }
        return text;
    };
    prototypeAccessors.textContent.set = function (text) {
        TaroNode.prototype.textContent = text;
    };
    TaroElement.prototype._stopPropagation = function _stopPropagation (event) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var target = this;
        // eslint-disable-next-line no-cond-assign
        while ((target = target.parentNode)) {
            var listeners = target.__handlers[event.type];
            if (!shared.isArray(listeners)) {
                continue;
            }
            for (var i = listeners.length; i--;) {
                var l = listeners[i];
                l._stop = true;
            }
        }
    };
    TaroElement.prototype.addEventListener = function addEventListener (type, handler, options) {
        var name = this.nodeName;
        if (!this.isAnyEventBinded() && SPECIAL_NODES.indexOf(name) > -1) {
            this.enqueueUpdate({
                path: ((this._path) + "." + ("nn")),
                value: name
            });
        }
        TaroNode.prototype.addEventListener.call(this, type, handler, options);
    };
    TaroElement.prototype.removeEventListener = function removeEventListener (type, handler) {
        TaroNode.prototype.removeEventListener.call(this, type, handler);
        var name = this.nodeName;
        if (!this.isAnyEventBinded() && SPECIAL_NODES.indexOf(name) > -1) {
            this.enqueueUpdate({
                path: ((this._path) + "." + ("nn")),
                value: isHasExtractProp(this) ? ("static-" + name) : ("pure-" + name)
            });
        }
    };

    Object.defineProperties( TaroElement.prototype, prototypeAccessors );

    return TaroElement;
}(TaroNode));

var FormElement = /*@__PURE__*/(function (TaroElement) {
    function FormElement () {
        TaroElement.apply(this, arguments);
    }

    if ( TaroElement ) FormElement.__proto__ = TaroElement;
    FormElement.prototype = Object.create( TaroElement && TaroElement.prototype );
    FormElement.prototype.constructor = FormElement;

    var prototypeAccessors = { value: { configurable: true } };

    prototypeAccessors.value.get = function () {
        // eslint-disable-next-line dot-notation
        var val = this.props['value'];
        return val == null ? '' : val;
    };
    prototypeAccessors.value.set = function (val) {
        this.setAttribute('value', val);
    };
    FormElement.prototype.dispatchEvent = function dispatchEvent (event) {
        if ((event.type === 'input' || event.type === 'change') && event.mpEvent) {
            var val = event.mpEvent.detail.value;
            this.props.value = val;
        }
        return TaroElement.prototype.dispatchEvent.call(this, event);
    };

    Object.defineProperties( FormElement.prototype, prototypeAccessors );

    return FormElement;
}(TaroElement));

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$4.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$3.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$3.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/** Used for built-in method references. */
var funcProto$1 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$2 = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$1 ? undefined : result;
  }
  return hasOwnProperty$1.call(data, key) ? data[key] : undefined;
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/* Built-in method references that are verified to be native. */
var Map$1 = getNative(root, 'Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map$1 || ListCache),
    'string': new Hash
  };
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = MapCache;

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/** Used as references for various `Number` constants. */
var INFINITY$1 = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

var Performance = function Performance() {
    this.recorder = new Map();
};
Performance.prototype.start = function start (id) {
    if (!options.debug) {
        return;
    }
    this.recorder.set(id, Date.now());
};
Performance.prototype.stop = function stop (id) {
    if (!options.debug) {
        return;
    }
    var now = Date.now();
    var prev = this.recorder.get(id);
    var time = now - prev;
    // eslint-disable-next-line no-console
    console.log((id + " 时长： " + time + "ms"));
};
var perf = new Performance();

var Events = function Events(opts) {
    if (typeof opts !== 'undefined' && opts.callbacks) {
        this.callbacks = opts.callbacks;
    }
    else {
        this.callbacks = {};
    }
};
Events.prototype.on = function on (eventName, callback, context) {
    var event, node, tail, list;
    if (!callback) {
        return this;
    }
    eventName = eventName.split(Events.eventSplitter);
    this.callbacks || (this.callbacks = {});
    var calls = this.callbacks;
    while ((event = eventName.shift())) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {
            tail: tail,
            next: list ? list.next : node
        };
    }
    return this;
};
Events.prototype.once = function once (events, callback, context) {
        var this$1 = this;

    var wrapper = function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

        callback.apply(this$1, args);
        this$1.off(events, wrapper, context);
    };
    this.on(events, wrapper, context);
    return this;
};
Events.prototype.off = function off (events, callback, context) {
    var event, calls, node, tail, cb, ctx;
    if (!(calls = this.callbacks)) {
        return this;
    }
    if (!(events || callback || context)) {
        delete this.callbacks;
        return this;
    }
    events = events ? events.split(Events.eventSplitter) : Object.keys(calls);
    while ((event = events.shift())) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) {
            continue;
        }
        tail = node.tail;
        while ((node = node.next) !== tail) {
            cb = node.callback;
            ctx = node.context;
            if ((callback && cb !== callback) || (context && ctx !== context)) {
                this.on(event, cb, ctx);
            }
        }
    }
    return this;
};
Events.prototype.trigger = function trigger (events) {
    var event, node, calls, tail;
    if (!(calls = this.callbacks)) {
        return this;
    }
    events = events.split(Events.eventSplitter);
    var rest = [].slice.call(arguments, 1);
    while ((event = events.shift())) {
        if ((node = calls[event])) {
            tail = node.tail;
            while ((node = node.next) !== tail) {
                node.callback.apply(node.context || this, rest);
            }
        }
    }
    return this;
};
Events.eventSplitter = /\s+/;
var eventCenter = CurrentReconciler.getEventCenter(Events);

var eventIncrementId = incrementId();
var TaroRootElement = /*@__PURE__*/(function (TaroElement) {
    function TaroRootElement() {
        TaroElement.call(this, 1 /* ELEMENT_NODE */, 'root');
        this.pendingUpdate = false;
        this.updatePayloads = [];
        this.pendingFlush = false;
        this.updateCallbacks = [];
        this.ctx = null;
    }

    if ( TaroElement ) TaroRootElement.__proto__ = TaroElement;
    TaroRootElement.prototype = Object.create( TaroElement && TaroElement.prototype );
    TaroRootElement.prototype.constructor = TaroRootElement;

    var prototypeAccessors = { _path: { configurable: true },_root: { configurable: true } };
    prototypeAccessors._path.get = function () {
        return 'root';
    };
    prototypeAccessors._root.get = function () {
        return this;
    };
    TaroRootElement.prototype.enqueueUpdate = function enqueueUpdate (payload) {
        this.updatePayloads.push(payload);
        if (this.pendingUpdate || this.ctx === null) {
            return;
        }
        this.performUpdate();
    };
    TaroRootElement.prototype.performUpdate = function performUpdate (initRender, prerender) {
        var this$1 = this;
        if ( initRender === void 0 ) initRender = false;

        this.pendingUpdate = true;
        var ctx = this.ctx;
        setTimeout(function () {
            var obj;

            var _a, _b;
            perf.start(SET_DATA);
            var data = Object.create(null);
            var resetPaths = new Set(initRender
                ? ['root.cn.[0]', 'root.cn[0]']
                : []);
            while (this$1.updatePayloads.length > 0) {
                var ref = this$1.updatePayloads.shift();
                var path = ref.path;
                var value = ref.value;
                if (path.endsWith("cn" /* Childnodes */)) {
                    resetPaths.add(path);
                }
                data[path] = value;
            }
            var loop = function ( path ) {
                resetPaths.forEach(function (p) {
                    // 已经重置了数组，就不需要分别再设置了
                    if (path$1.includes(p) && path$1 !== p) {
                        delete data[path$1];
                    }
                });
                var value$1 = data[path$1];
                if (shared.isFunction(value$1)) {
                    data[path$1] = value$1();
                }
            };

            for (var path$1 in data) loop();
            (_a = CurrentReconciler.prepareUpdateData) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, data, this$1);
            if (initRender) {
                (_b = CurrentReconciler.appendInitialPage) === null || _b === void 0 ? void 0 : _b.call(CurrentReconciler, data, this$1);
            }
            if (shared.isFunction(prerender)) {
                prerender(data);
            }
            else {
                this$1.pendingUpdate = false;
                var customWrapperUpdate = [];
                var normalUpdate = {};
                if (!initRender) {
                    for (var p in data) {
                        var dataPathArr = p.split('.');
                        var hasCustomWrapper = false;
                        for (var i = dataPathArr.length; i > 0; i--) {
                            var allPath = dataPathArr.slice(0, i).join('.');
                            var getData = get(ctx.__data__ || ctx.data, allPath);
                            if (getData && getData.nn && getData.nn === 'custom-wrapper') {
                                var customWrapperId = getData.uid;
                                var customWrapper = ctx.selectComponent(("#" + customWrapperId));
                                var splitedPath = dataPathArr.slice(i).join('.');
                                if (customWrapper) {
                                    hasCustomWrapper = true;
                                    customWrapperUpdate.push({
                                        ctx: ctx.selectComponent(("#" + customWrapperId)),
                                        data: ( obj = {}, obj[("i." + splitedPath)] = data[p], obj )
                                    });
                                }
                                break;
                            }
                        }
                        if (!hasCustomWrapper) {
                            normalUpdate[p] = data[p];
                        }
                    }
                }
                var updateArrLen = customWrapperUpdate.length;
                if (updateArrLen) {
                    var eventId = (this$1._path) + "_update_" + (eventIncrementId());
                    var executeTime = 0;
                    eventCenter.once(eventId, function () {
                        executeTime++;
                        if (executeTime === updateArrLen + 1) {
                            perf.stop(SET_DATA);
                            if (!this$1.pendingFlush) {
                                this$1.flushUpdateCallback();
                            }
                            if (initRender) {
                                perf.stop(PAGE_INIT);
                            }
                        }
                    }, eventCenter);
                    customWrapperUpdate.forEach(function (item) {
                        item.ctx.setData(item.data, function () {
                            eventCenter.trigger(eventId);
                        });
                    });
                    Object.keys(normalUpdate).length && ctx.setData(normalUpdate, function () {
                        eventCenter.trigger(eventId);
                    });
                }
                else {
                    ctx.setData(data, function () {
                        perf.stop(SET_DATA);
                        if (!this$1.pendingFlush) {
                            this$1.flushUpdateCallback();
                        }
                        if (initRender) {
                            perf.stop(PAGE_INIT);
                        }
                    });
                }
            }
        }, 0);
    };
    TaroRootElement.prototype.enqueueUpdateCallback = function enqueueUpdateCallback (cb, ctx) {
        this.updateCallbacks.push(function () {
            ctx ? cb.call(ctx) : cb();
        });
    };
    TaroRootElement.prototype.flushUpdateCallback = function flushUpdateCallback () {
        this.pendingFlush = false;
        var copies = this.updateCallbacks.slice(0);
        this.updateCallbacks.length = 0;
        for (var i = 0; i < copies.length; i++) {
            copies[i]();
        }
    };

    Object.defineProperties( TaroRootElement.prototype, prototypeAccessors );

    return TaroRootElement;
}(TaroElement));

var isBrowser = typeof document !== 'undefined' && !!document.scripts;
var doc = isBrowser ? document : shared.EMPTY_OBJ;
var win = isBrowser ? window : shared.EMPTY_OBJ;

var TaroDocument = /*@__PURE__*/(function (TaroElement) {
    function TaroDocument() {
        TaroElement.call(this, 9 /* DOCUMENT_NODE */, '#document');
    }

    if ( TaroElement ) TaroDocument.__proto__ = TaroElement;
    TaroDocument.prototype = Object.create( TaroElement && TaroElement.prototype );
    TaroDocument.prototype.constructor = TaroDocument;
    TaroDocument.prototype.createElement = function createElement (type) {
        if (type === 'root') {
            return new TaroRootElement();
        }
        if (shared.controlledComponent.has(type)) {
            return new FormElement(1 /* ELEMENT_NODE */, type);
        }
        return new TaroElement(1 /* ELEMENT_NODE */, type);
    };
    // an ugly fake createElementNS to deal with @vue/runtime-dom's
    // support mounting app to svg container since vue@3.0.8
    TaroDocument.prototype.createElementNS = function createElementNS (_svgNS, type) {
        return this.createElement(type);
    };
    TaroDocument.prototype.createTextNode = function createTextNode (text) {
        return new TaroText(text);
    };
    TaroDocument.prototype.getElementById = function getElementById (id) {
        var el = eventSource.get(id);
        return shared.isUndefined(el) ? null : el;
    };
    TaroDocument.prototype.getElementsByTagName = function getElementsByTagName (tagName) {
        var this$1 = this;

        var elements = [];
        eventSource.forEach(function (node) {
            if (node.nodeType !== 1 /* ELEMENT_NODE */) {
                return;
            }
            if (node.nodeName === tagName || (tagName === '*' && node !== this$1)) {
                elements.push(node);
            }
        });
        return elements;
    };
    TaroDocument.prototype.querySelector = function querySelector (query) {
        // 为了 Vue3 的乞丐版实现
        if (/^#/.test(query)) {
            return this.getElementById(query.slice(1));
        }
        return null;
    };
    // @TODO: @PERF: 在 hydrate 移除掉空的 node
    TaroDocument.prototype.createComment = function createComment () {
        return new TaroText('');
    };

    return TaroDocument;
}(TaroElement));
function createDocument() {
    var doc = new TaroDocument();
    doc.appendChild((doc.documentElement = doc.createElement('html')));
    doc.documentElement.appendChild((doc.head = doc.createElement('head')));
    var body = doc.createElement('body');
    doc.documentElement.appendChild(body);
    doc.body = body;
    var app = doc.createElement('app');
    app.id = 'app';
    var container = doc.createElement('container'); // 多包一层主要为了兼容 vue
    container.appendChild(app);
    doc.documentElement.lastChild.appendChild(container);
    doc.createEvent = createEvent;
    return doc;
}
var document$1 = (isBrowser ? doc : createDocument());

var machine = 'Macintosh';
var arch = 'Intel Mac OS X 10_14_5';
var engine = 'AppleWebKit/534.36 (KHTML, like Gecko) NodeJS/v4.1.0 Chrome/76.0.3809.132 Safari/534.36';
var navigator = isBrowser ? win.navigator : {
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: '5.0 (' + machine + '; ' + arch + ') ' + engine,
    cookieEnabled: true,
    mimeTypes: [],
    onLine: true,
    platform: 'MacIntel',
    plugins: [],
    product: 'Taro',
    productSub: '20030107',
    userAgent: 'Mozilla/5.0 (' + machine + '; ' + arch + ') ' + engine,
    vendor: 'Joyent',
    vendorSub: ''
};

// https://github.com/myrne/performance-now
exports.now = void 0;
(function () {
    var loadTime;
    if ((typeof performance !== 'undefined' && performance !== null) && performance.now) {
        exports.now = function () {
            return performance.now();
        };
    }
    else if (Date.now) {
        exports.now = function () {
            return Date.now() - loadTime;
        };
        loadTime = Date.now();
    }
    else {
        exports.now = function () {
            return new Date().getTime() - loadTime;
        };
        loadTime = new Date().getTime();
    }
})();
var lastTime = 0;
// https://gist.github.com/paulirish/1579671
// https://gist.github.com/jalbam/5fe05443270fa6d8136238ec72accbc0
exports.requestAnimationFrame = typeof requestAnimationFrame !== 'undefined' && requestAnimationFrame !== null ? requestAnimationFrame : function (callback) {
    var _now = exports.now();
    var nextTime = Math.max(lastTime + 16, _now); // First time will execute it immediately but barely noticeable and performance is gained.
    return setTimeout(function () { callback(lastTime = nextTime); }, nextTime - _now);
};
exports.cancelAnimationFrame = typeof cancelAnimationFrame !== 'undefined' && cancelAnimationFrame !== null ? cancelAnimationFrame : clearTimeout;
if (typeof global !== 'undefined') {
    exports.requestAnimationFrame = exports.requestAnimationFrame.bind(global);
    exports.cancelAnimationFrame = exports.cancelAnimationFrame.bind(global);
}

function getComputedStyle(element) {
    return new Style(element);
}

var window$1 = isBrowser ? win : {
    navigator: navigator,
    document: document$1
};
if (!isBrowser) {
    var globalProperties = Object.getOwnPropertyNames(global || win).concat( Object.getOwnPropertySymbols(global || win)
    );
    globalProperties.forEach(function (property) {
        if (!Object.prototype.hasOwnProperty.call(window$1, property)) {
            window$1[property] = global[property];
        }
    });
}
if (process.env.TARO_ENV && process.env.TARO_ENV !== 'h5') {
    window$1.requestAnimationFrame = exports.requestAnimationFrame;
    window$1.cancelAnimationFrame = exports.cancelAnimationFrame;
    window$1.getComputedStyle = getComputedStyle;
    if (!('Date' in window$1)) {
        window$1.Date = Date;
    }
    if (!('setTimeout' in window$1)) {
        window$1.setTimeout = setTimeout;
    }
}

var Current = {
    app: null,
    router: null,
    page: null
};
var getCurrentInstance = function () { return Current; };

/* eslint-disable dot-notation */
var instances = new Map();
function injectPageInstance(inst, id) {
    var _a;
    (_a = CurrentReconciler.mergePageInstance) === null || _a === void 0 ? void 0 : _a.call(CurrentReconciler, instances.get(id), inst);
    instances.set(id, inst);
}
function getPageInstance(id) {
    return instances.get(id);
}
function addLeadingSlash(path) {
    if (path == null) {
        return '';
    }
    return path.charAt(0) === '/' ? path : '/' + path;
}
var pageId = incrementId();
function safeExecute(path, lifecycle) {
    var args = [], len = arguments.length - 2;
    while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

    var instance = instances.get(path);
    if (instance == null) {
        return;
    }
    var func = CurrentReconciler.getLifecyle(instance, lifecycle);
    if (shared.isArray(func)) {
        var res = func.map(function (fn) { return fn.apply(instance, args); });
        return res[0];
    }
    if (!shared.isFunction(func)) {
        return;
    }
    return func.apply(instance, args);
}
function stringify(obj) {
    if (obj == null) {
        return '';
    }
    var path = Object.keys(obj).map(function (key) {
        return key + '=' + obj[key];
    }).join('&');
    return path === '' ? path : '?' + path;
}
function getPath(id, options) {
    var path = id;
    if (!isBrowser) {
        path = id + stringify(options);
    }
    return path;
}
function getOnReadyEventKey(path) {
    return path + '.' + 'onReady';
}
function getOnShowEventKey(path) {
    return path + '.' + 'onShow';
}
function getOnHideEventKey(path) {
    return path + '.' + 'onHide';
}
function createPageConfig(component, pageName, data, pageConfig) {
    var _a, _b;
    var id = pageName !== null && pageName !== void 0 ? pageName : ("taro_page_" + (pageId()));
    // 小程序 Page 构造器是一个傲娇小公主，不能把复杂的对象挂载到参数上
    var pageElement = null;
    var unmounting = false;
    var prepareMountList = [];
    var config = {
        onLoad: function onLoad(options, cb) {
            var this$1 = this;

            perf.start(PAGE_INIT);
            Current.page = this;
            this.config = pageConfig || {};
            if (this.options == null) {
                this.options = options;
            }
            this.options.$taroTimestamp = Date.now();
            var path = getPath(id, this.options);
            var router = isBrowser ? path : this.route || this.__route__;
            Current.router = {
                params: this.options,
                path: addLeadingSlash(router),
                onReady: getOnReadyEventKey(id),
                onShow: getOnShowEventKey(id),
                onHide: getOnHideEventKey(id)
            };
            var mount = function () {
                Current.app.mount(component, path, function () {
                    pageElement = document$1.getElementById(path);
                    shared.ensure(pageElement !== null, '没有找到页面实例。');
                    safeExecute(path, 'onLoad', this$1.options);
                    if (!isBrowser) {
                        pageElement.ctx = this$1;
                        pageElement.performUpdate(true, cb);
                    }
                });
            };
            if (unmounting) {
                prepareMountList.push(mount);
            }
            else {
                mount();
            }
        },
        onReady: function onReady() {
            var path = getPath(id, this.options);
            exports.requestAnimationFrame(function () {
                eventCenter.trigger(getOnReadyEventKey(id));
            });
            safeExecute(path, 'onReady');
            this.onReady.called = true;
        },
        onUnload: function onUnload() {
            var path = getPath(id, this.options);
            unmounting = true;
            Current.app.unmount(path, function () {
                unmounting = false;
                instances.delete(path);
                if (pageElement) {
                    pageElement.ctx = null;
                }
                if (prepareMountList.length) {
                    prepareMountList.forEach(function (fn) { return fn(); });
                    prepareMountList = [];
                }
            });
        },
        onShow: function onShow() {
            Current.page = this;
            this.config = pageConfig || {};
            var path = getPath(id, this.options);
            var router = isBrowser ? path : this.route || this.__route__;
            Current.router = {
                params: this.options,
                path: addLeadingSlash(router),
                onReady: getOnReadyEventKey(id),
                onShow: getOnShowEventKey(id),
                onHide: getOnHideEventKey(id)
            };
            exports.requestAnimationFrame(function () {
                eventCenter.trigger(getOnShowEventKey(id));
            });
            safeExecute(path, 'onShow');
        },
        onHide: function onHide() {
            Current.page = null;
            Current.router = null;
            var path = getPath(id, this.options);
            safeExecute(path, 'onHide');
            eventCenter.trigger(getOnHideEventKey(id));
        },
        onPullDownRefresh: function onPullDownRefresh() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onPullDownRefresh');
        },
        onReachBottom: function onReachBottom() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onReachBottom');
        },
        onPageScroll: function onPageScroll(options) {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onPageScroll', options);
        },
        onResize: function onResize(options) {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onResize', options);
        },
        onTabItemTap: function onTabItemTap(options) {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onTabItemTap', options);
        },
        onTitleClick: function onTitleClick() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onTitleClick');
        },
        onOptionMenuClick: function onOptionMenuClick() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onOptionMenuClick');
        },
        onPopMenuClick: function onPopMenuClick() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onPopMenuClick');
        },
        onPullIntercept: function onPullIntercept() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onPullIntercept');
        },
        onAddToFavorites: function onAddToFavorites() {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onAddToFavorites');
        }
    };
    // onShareAppMessage 和 onShareTimeline 一样，会影响小程序右上方按钮的选项，因此不能默认注册。
    if (component.onShareAppMessage || ((_a = component.prototype) === null || _a === void 0 ? void 0 : _a.onShareAppMessage) ||
        component.enableShareAppMessage) {
        config.onShareAppMessage = function (options) {
            var target = options.target;
            if (target != null) {
                var id$1 = target.id;
                var element = document$1.getElementById(id$1);
                if (element != null) {
                    options.target.dataset = element.dataset;
                }
            }
            var path = getPath(id, this.options);
            return safeExecute(path, 'onShareAppMessage', options);
        };
    }
    if (component.onShareTimeline || ((_b = component.prototype) === null || _b === void 0 ? void 0 : _b.onShareTimeline) ||
        component.enableShareTimeline) {
        config.onShareTimeline = function () {
            var path = getPath(id, this.options);
            return safeExecute(path, 'onShareTimeline');
        };
    }
    config.eh = eventHandler;
    if (!shared.isUndefined(data)) {
        config.data = data;
    }
    if (isBrowser) {
        config.path = id;
    }
    return config;
}
function createComponentConfig(component, componentName, data) {
    var _a, _b, _c;
    var id = componentName !== null && componentName !== void 0 ? componentName : ("taro_component_" + (pageId()));
    var componentElement = null;
    var config = {
        attached: function attached() {
            var this$1 = this;

            perf.start(PAGE_INIT);
            var path = getPath(id, { id: this.getPageId() });
            Current.app.mount(component, path, function () {
                componentElement = document$1.getElementById(path);
                shared.ensure(componentElement !== null, '没有找到组件实例。');
                safeExecute(path, 'onLoad');
                if (!isBrowser) {
                    componentElement.ctx = this$1;
                    componentElement.performUpdate(true);
                }
            });
        },
        detached: function detached() {
            var path = getPath(id, { id: this.getPageId() });
            Current.app.unmount(path, function () {
                instances.delete(path);
                if (componentElement) {
                    componentElement.ctx = null;
                }
            });
        },
        pageLifetimes: {
            show: function show() {
                safeExecute(id, 'onShow');
            },
            hide: function hide() {
                safeExecute(id, 'onHide');
            }
        },
        methods: {
            eh: eventHandler
        }
    };
    if (!shared.isUndefined(data)) {
        config.data = data;
    }
    config['options'] = (_a = component === null || component === void 0 ? void 0 : component['options']) !== null && _a !== void 0 ? _a : shared.EMPTY_OBJ;
    config['externalClasses'] = (_b = component === null || component === void 0 ? void 0 : component['externalClasses']) !== null && _b !== void 0 ? _b : shared.EMPTY_OBJ;
    config['behaviors'] = (_c = component === null || component === void 0 ? void 0 : component['behaviors']) !== null && _c !== void 0 ? _c : shared.EMPTY_OBJ;
    return config;
}
function createRecursiveComponentConfig(componentName) {
    var obj;

    return {
        properties: {
            i: {
                type: Object,
                value: ( obj = {}, obj["nn" /* NodeName */] = 'view', obj )
            },
            l: {
                type: String,
                value: ''
            }
        },
        observers: {
            i: function i(val) {
                shared.warn(val["nn" /* NodeName */] === '#text', ("请在此元素外再套一层非 Text 元素：<text>" + (val["v" /* Text */]) + "</text>，详情：https://github.com/NervJS/taro/issues/6054"));
            }
        },
        options: {
            addGlobalClass: true,
            virtualHost: componentName !== 'custom-wrapper'
        },
        methods: {
            eh: eventHandler
        }
    };
}

var HOOKS_APP_ID = 'taro-app';
var taroHooks = function (lifecycle) {
    return function (fn) {
        var id = R.useContext(PageContext) || HOOKS_APP_ID;
        // hold fn ref and keep up to date
        var fnRef = R.useRef(fn);
        if (fnRef.current !== fn)
            { fnRef.current = fn; }
        R.useLayoutEffect(function () {
            var inst = getPageInstance(id);
            var first = false;
            if (inst == null) {
                first = true;
                inst = Object.create(null);
            }
            inst = inst;
            // callback is immutable but inner function is up to date
            var callback = function () {
                var args = [], len = arguments.length;
                while ( len-- ) args[ len ] = arguments[ len ];

                return fnRef.current.apply(fnRef, args);
            };
            if (shared.isFunction(inst[lifecycle])) {
                inst[lifecycle] = [inst[lifecycle], callback];
            }
            else {
                inst[lifecycle] = (inst[lifecycle] || []).concat( [callback]
                );
            }
            if (first) {
                injectPageInstance(inst, id);
            }
            return function () {
                var inst = getPageInstance(id);
                var list = inst[lifecycle];
                if (list === callback) {
                    inst[lifecycle] = undefined;
                }
                else if (shared.isArray(list)) {
                    inst[lifecycle] = list.filter(function (item) { return item !== callback; });
                }
            };
        }, []);
    };
};
var useDidShow = taroHooks('componentDidShow');
var useDidHide = taroHooks('componentDidHide');
var usePullDownRefresh = taroHooks('onPullDownRefresh');
var useReachBottom = taroHooks('onReachBottom');
var usePageScroll = taroHooks('onPageScroll');
var useResize = taroHooks('onResize');
var useShareAppMessage = taroHooks('onShareAppMessage');
var useTabItemTap = taroHooks('onTabItemTap');
var useTitleClick = taroHooks('onTitleClick');
var useOptionMenuClick = taroHooks('onOptionMenuClick');
var usePullIntercept = taroHooks('onPullIntercept');
var useShareTimeline = taroHooks('onShareTimeline');
var useAddToFavorites = taroHooks('onAddToFavorites');
var useReady = taroHooks('onReady');
var useRouter = function (dynamic) {
    if ( dynamic === void 0 ) dynamic = false;

    return dynamic ? Current.router : R.useMemo(function () { return Current.router; }, []);
};
var useScope = function () { return undefined; };

function isClassComponent(R, component) {
    var _a;
    return shared.isFunction(component.render) ||
        !!((_a = component.prototype) === null || _a === void 0 ? void 0 : _a.isReactComponent) ||
        component.prototype instanceof R.Component; // compat for some others react-like library
}
// 初始值设置为 any 主要是为了过 TS 的校验
var R = shared.EMPTY_OBJ;
var PageContext = shared.EMPTY_OBJ;
function connectReactPage(R, id) {
    var h = R.createElement;
    return function (component) {
        // eslint-disable-next-line dot-notation
        var isReactComponent = isClassComponent(R, component);
        var inject = function (node) { return node && injectPageInstance(node, id); };
        var refs = isReactComponent ? { ref: inject } : {
            forwardedRef: inject,
            // 兼容 react-redux 7.20.1+
            reactReduxForwardedRef: inject
        };
        if (PageContext === shared.EMPTY_OBJ) {
            PageContext = R.createContext('');
        }
        return /*@__PURE__*/(function (superclass) {
            function Page() {
                superclass.apply(this, arguments);
                this.state = {
                    hasError: false
                };
            }

            if ( superclass ) Page.__proto__ = superclass;
            Page.prototype = Object.create( superclass && superclass.prototype );
            Page.prototype.constructor = Page;
            Page.getDerivedStateFromError = function getDerivedStateFromError (error) {
                console.warn(error);
                return { hasError: true };
            };
            // React 16 uncaught error 会导致整个应用 crash，
            // 目前把错误缩小到页面
            Page.prototype.componentDidCatch = function componentDidCatch (error, info) {
                console.warn(error);
                console.error(info.componentStack);
            };
            Page.prototype.render = function render () {
                var children = this.state.hasError
                    ? []
                    : h(PageContext.Provider, { value: id }, h(component, Object.assign(Object.assign({}, this.props), refs)));
                if (isBrowser) {
                    return h('div', { id: id, className: 'taro_page' }, children);
                }
                return h('root', { id: id }, children);
            };

            return Page;
        }(R.Component));
    };
}
var ReactDOM;
function setReconciler$2() {
    var hostConfig = {
        getLifecyle: function getLifecyle(instance, lifecycle) {
            if (lifecycle === 'onShow') {
                lifecycle = 'componentDidShow';
            }
            else if (lifecycle === 'onHide') {
                lifecycle = 'componentDidHide';
            }
            return instance[lifecycle];
        },
        mergePageInstance: function mergePageInstance(prev, next) {
            if (!prev || !next)
                { return; }
            // 子组件使用 lifecycle hooks 注册了生命周期后，会存在 prev，里面是注册的生命周期回调。
            // prev 使用 Object.create(null) 创建，H5 的 fast-refresh 可能也会导致存在 prev，要排除这些意外产生的 prev
            if ('constructor' in prev)
                { return; }
            Object.keys(prev).forEach(function (item) {
                if (shared.isFunction(next[item])) {
                    next[item] = [next[item] ].concat( prev[item]);
                }
                else {
                    next[item] = (next[item] || []).concat( prev[item]);
                }
            });
        },
        modifyEventType: function modifyEventType(event) {
            event.type = event.type.replace(/-/g, '');
        },
        batchedEventUpdates: function batchedEventUpdates(cb) {
            ReactDOM.unstable_batchedUpdates(cb);
        }
    };
    if (isBrowser) {
        hostConfig.createPullDownComponent = function (el, _, R, customWrapper) {
            var isReactComponent = isClassComponent(R, el);
            return R.forwardRef(function (props, ref) {
                var newProps = Object.assign({}, props);
                var refs = isReactComponent ? { ref: ref } : {
                    forwardedRef: ref,
                    // 兼容 react-redux 7.20.1+
                    reactReduxForwardedRef: ref
                };
                return R.createElement(customWrapper || 'taro-pull-to-refresh', null, R.createElement(el, Object.assign(Object.assign({}, newProps), refs)));
            });
        };
        hostConfig.findDOMNode = function (inst) {
            return ReactDOM.findDOMNode(inst);
        };
    }
    options.reconciler(hostConfig);
}
var pageKeyId = incrementId();
function createReactApp(App, react, reactdom, config) {
    R = react;
    ReactDOM = reactdom;
    shared.ensure(!!ReactDOM, '构建 React/Nerv 项目请把 process.env.FRAMEWORK 设置为 \'react\'/\'nerv\' ');
    var ref = R.createRef();
    var isReactComponent = isClassComponent(R, App);
    setReconciler$2();
    var wrapper;
    var AppWrapper = /*@__PURE__*/(function (superclass) {
        function AppWrapper() {
            superclass.apply(this, arguments);
            // run createElement() inside the render function to make sure that owner is right
            this.pages = [];
            this.elements = [];
        }

        if ( superclass ) AppWrapper.__proto__ = superclass;
        AppWrapper.prototype = Object.create( superclass && superclass.prototype );
        AppWrapper.prototype.constructor = AppWrapper;
        AppWrapper.prototype.mount = function mount (component, id, cb) {
            var key = id + pageKeyId();
            var page = function () { return R.createElement(component, { key: key, tid: id }); };
            this.pages.push(page);
            this.forceUpdate(cb);
        };
        AppWrapper.prototype.unmount = function unmount (id, cb) {
            for (var i = 0; i < this.elements.length; i++) {
                var element = this.elements[i];
                if (element.props.tid === id) {
                    this.elements.splice(i, 1);
                    break;
                }
            }
            this.forceUpdate(cb);
        };
        AppWrapper.prototype.render = function render () {
            while (this.pages.length > 0) {
                var page = this.pages.pop();
                this.elements.push(page());
            }
            var props = null;
            if (isReactComponent) {
                props = { ref: ref };
            }
            return R.createElement(App, props, isBrowser ? R.createElement('div', null, this.elements.slice()) : this.elements.slice());
        };

        return AppWrapper;
    }(R.Component));
    var app = Object.create({
        render: function render(cb) {
            wrapper.forceUpdate(cb);
        },
        mount: function mount(component, id, cb) {
            var page = connectReactPage(R, id)(component);
            wrapper.mount(page, id, cb);
        },
        unmount: function unmount(id, cb) {
            wrapper.unmount(id, cb);
        }
    }, {
        config: {
            writable: true,
            enumerable: true,
            configurable: true,
            value: config
        },
        onLaunch: {
            enumerable: true,
            writable: true,
            value: function value(options) {
                var this$1 = this;

                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                // eslint-disable-next-line react/no-render-return-value
                wrapper = ReactDOM.render(R.createElement(AppWrapper), document$1.getElementById('app'));
                var app = ref.current;
                // For taroize
                // 把 App Class 上挂载的额外属性同步到全局 app 对象中
                if (app === null || app === void 0 ? void 0 : app.taroGlobalData) {
                    var globalData = app.taroGlobalData;
                    var keys = Object.keys(globalData);
                    var descriptors = Object.getOwnPropertyDescriptors(globalData);
                    keys.forEach(function (key) {
                        Object.defineProperty(this$1, key, {
                            configurable: true,
                            enumerable: true,
                            get: function get() {
                                return globalData[key];
                            },
                            set: function set(value) {
                                globalData[key] = value;
                            }
                        });
                    });
                    Object.defineProperties(this, descriptors);
                }
                this.$app = app;
                if (app != null && shared.isFunction(app.onLaunch)) {
                    app.onLaunch(options);
                }
            }
        },
        onShow: {
            enumerable: true,
            writable: true,
            value: function value(options) {
                var app = ref.current;
                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                if (app != null && shared.isFunction(app.componentDidShow)) {
                    app.componentDidShow(options);
                }
                // app useDidShow
                triggerAppHook('componentDidShow');
            }
        },
        onHide: {
            enumerable: true,
            writable: true,
            value: function value(options) {
                var app = ref.current;
                if (app != null && shared.isFunction(app.componentDidHide)) {
                    app.componentDidHide(options);
                }
                // app useDidHide
                triggerAppHook('componentDidHide');
            }
        },
        onPageNotFound: {
            enumerable: true,
            writable: true,
            value: function value(res) {
                var app = ref.current;
                if (app != null && shared.isFunction(app.onPageNotFound)) {
                    app.onPageNotFound(res);
                }
            }
        }
    });
    function triggerAppHook(lifecycle) {
        var instance = getPageInstance(HOOKS_APP_ID);
        if (instance) {
            var app = ref.current;
            var func = CurrentReconciler.getLifecyle(instance, lifecycle);
            if (Array.isArray(func)) {
                func.forEach(function (cb) { return cb.apply(app); });
            }
        }
    }
    Current.app = app;
    return Current.app;
}
var getNativeCompId = incrementId();
function initNativeComponentEntry(R, ReactDOM) {
    var NativeComponentWrapper = /*@__PURE__*/(function (superclass) {
        function NativeComponentWrapper() {
            superclass.apply(this, arguments);
            this.root = R.createRef();
            this.ctx = this.props.getCtx();
        }

        if ( superclass ) NativeComponentWrapper.__proto__ = superclass;
        NativeComponentWrapper.prototype = Object.create( superclass && superclass.prototype );
        NativeComponentWrapper.prototype.constructor = NativeComponentWrapper;
        NativeComponentWrapper.prototype.componentDidMount = function componentDidMount () {
            this.ctx.component = this;
            var rootElement = this.root.current;
            rootElement.ctx = this.ctx;
            rootElement.performUpdate(true);
        };
        NativeComponentWrapper.prototype.render = function render () {
            return (R.createElement('root', {
                ref: this.root
            }, this.props.renderComponent(this.ctx)));
        };

        return NativeComponentWrapper;
    }(R.Component));
    var Entry = /*@__PURE__*/(function (superclass) {
        function Entry() {
            superclass.apply(this, arguments);
            this.state = {
                components: []
            };
        }

        if ( superclass ) Entry.__proto__ = superclass;
        Entry.prototype = Object.create( superclass && superclass.prototype );
        Entry.prototype.constructor = Entry;
        Entry.prototype.componentDidMount = function componentDidMount () {
            Current.app = this;
        };
        Entry.prototype.mount = function mount (Component, compId, getCtx) {
            var isReactComponent = isClassComponent(R, Component);
            var inject = function (node) { return node && injectPageInstance(node, compId); };
            var refs = isReactComponent ? { ref: inject } : {
                forwardedRef: inject,
                reactReduxForwardedRef: inject
            };
            var item = {
                compId: compId,
                element: R.createElement(NativeComponentWrapper, {
                    key: compId,
                    getCtx: getCtx,
                    renderComponent: function renderComponent(ctx) {
                        return R.createElement(Component, Object.assign(Object.assign({}, (ctx.data || (ctx.data = {})).props), refs));
                    }
                })
            };
            this.setState({
                components: ( this.state.components ).concat( [item])
            });
        };
        Entry.prototype.unmount = function unmount (compId) {
            var components = this.state.components;
            var index = components.findIndex(function (item) { return item.compId === compId; });
            var next = components.slice(0, index).concat( components.slice(index + 1));
            this.setState({
                components: next
            });
        };
        Entry.prototype.render = function render () {
            var components = this.state.components;
            return (components.map(function (ref) {
                var element = ref.element;

                return element;
            }));
        };

        return Entry;
    }(R.Component));
    setReconciler$2();
    var app = document$1.getElementById('app');
    ReactDOM.render(R.createElement(Entry, {}), app);
}
function createNativeComponentConfig(Component, react, reactdom, componentConfig) {
    R = react;
    ReactDOM = reactdom;
    var config = {
        properties: {
            props: {
                type: null,
                value: null,
                observer: function observer(_newVal, oldVal) {
                    oldVal && this.component.forceUpdate();
                }
            }
        },
        created: function created() {
            if (!Current.app) {
                initNativeComponentEntry(R, ReactDOM);
            }
        },
        attached: function attached() {
            var this$1 = this;

            setCurrent();
            this.compId = getNativeCompId();
            this.config = componentConfig;
            Current.app.mount(Component, this.compId, function () { return this$1; });
        },
        ready: function ready() {
            safeExecute(this.compId, 'onReady');
        },
        detached: function detached() {
            Current.app.unmount(this.compId);
        },
        pageLifetimes: {
            show: function show() {
                safeExecute(this.compId, 'onShow');
            },
            hide: function hide() {
                safeExecute(this.compId, 'onHide');
            }
        },
        methods: {
            eh: eventHandler
        }
    };
    function setCurrent() {
        var pages = getCurrentPages();
        var currentPage = pages[pages.length - 1];
        if (Current.page === currentPage)
            { return; }
        Current.page = currentPage;
        var route = currentPage.route || currentPage.__route__;
        var router = {
            params: currentPage.options || {},
            path: addLeadingSlash(route),
            onReady: '',
            onHide: '',
            onShow: ''
        };
        Current.router = router;
        if (!currentPage.options) {
            // 例如在微信小程序中，页面 options 的设置时机比组件 attached 慢
            Object.defineProperty(currentPage, 'options', {
                enumerable: true,
                configurable: true,
                get: function get() {
                    return this._optionsValue;
                },
                set: function set(value) {
                    router.params = value;
                    this._optionsValue = value;
                }
            });
        }
    }
    return config;
}

function connectVuePage(Vue, id) {
    return function (component) {
        var injectedPage = Vue.extend({
            props: {
                tid: String
            },
            mixins: [component, {
                    created: function created() {
                        injectPageInstance(this, id);
                    }
                }]
        });
        var options = {
            render: function render(h) {
                return h(isBrowser ? 'div' : 'root', {
                    attrs: {
                        id: id,
                        class: isBrowser ? 'taro_page' : ''
                    }
                }, [
                    h(injectedPage, { props: { tid: id } })
                ]);
            }
        };
        return options;
    };
}
function setReconciler$1() {
    var hostConfig = {
        getLifecyle: function getLifecyle(instance, lifecycle) {
            return instance.$options[lifecycle];
        },
        removeAttribute: function removeAttribute(dom, qualifiedName) {
            var compName = shared.capitalize(shared.toCamelCase(dom.tagName.toLowerCase()));
            if (compName in shared.internalComponents &&
                shared.hasOwn(shared.internalComponents[compName], qualifiedName) &&
                shared.isBooleanStringLiteral(shared.internalComponents[compName][qualifiedName])) {
                // avoid attribute being removed because set false value in vue
                dom.setAttribute(qualifiedName, false);
            }
            else {
                delete dom.props[qualifiedName];
            }
        }
    };
    if (isBrowser) {
        hostConfig.createPullDownComponent = function (el, path, vue) {
            var injectedPage = vue.extend({
                props: {
                    tid: String
                },
                mixins: [el, {
                        created: function created() {
                            injectPageInstance(this, path);
                        }
                    }]
            });
            var options = {
                name: 'PullToRefresh',
                render: function render(h) {
                    return h('taro-pull-to-refresh', { class: ['hydrated'] }, [h(injectedPage, this.$slots.default)]);
                }
            };
            return options;
        };
        hostConfig.findDOMNode = function (el) {
            return el.$el;
        };
    }
    options.reconciler(hostConfig);
}
var Vue;
function createVueApp(App, vue, config) {
    Vue = vue;
    shared.ensure(!!Vue, '构建 Vue 项目请把 process.env.FRAMEWORK 设置为 \'vue\'');
    setReconciler$1();
    Vue.config.getTagNamespace = shared.noop;
    var elements = [];
    var pages = [];
    var appInstance;
    var wrapper = new Vue({
        render: function render(h) {
            while (pages.length > 0) {
                var page = pages.pop();
                elements.push(page(h));
            }
            return h(App, { ref: 'app' }, elements.slice());
        },
        methods: {
            mount: function mount(component, id, cb) {
                pages.push(function (h) { return h(component, { key: id }); });
                this.updateSync(cb);
            },
            updateSync: function updateSync(cb) {
                this._update(this._render(), false);
                this.$children.forEach(function (child) { return child._update(child._render(), false); });
                cb();
            },
            unmount: function unmount(id, cb) {
                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];
                    if (element.key === id) {
                        elements.splice(i, 1);
                        break;
                    }
                }
                this.updateSync(cb);
            }
        }
    });
    var app = Object.create({
        mount: function mount(component, id, cb) {
            var page = connectVuePage(Vue, id)(component);
            wrapper.mount(page, id, cb);
        },
        unmount: function unmount(id, cb) {
            wrapper.unmount(id, cb);
        }
    }, {
        config: {
            writable: true,
            enumerable: true,
            configurable: true,
            value: config
        },
        onLaunch: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                wrapper.$mount(document$1.getElementById('app'));
                appInstance = wrapper.$refs.app;
                if (appInstance != null && shared.isFunction(appInstance.$options.onLaunch)) {
                    appInstance.$options.onLaunch.call(appInstance, options);
                }
            }
        },
        onShow: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                if (appInstance != null && shared.isFunction(appInstance.$options.onShow)) {
                    appInstance.$options.onShow.call(appInstance, options);
                }
            }
        },
        onHide: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                if (appInstance != null && shared.isFunction(appInstance.$options.onHide)) {
                    appInstance.$options.onHide.call(appInstance, options);
                }
            }
        }
    });
    Current.app = app;
    return Current.app;
}

function createVue3Page(h, id) {
    return function (component) {
        var _a;
        var inject = {
            props: {
                tid: String
            },
            created: function created() {
                injectPageInstance(this, id);
                // vue3 组件 created 时机比小程序页面 onShow 慢，因此在 created 后再手动触发一次 onShow。
                this.$nextTick(function () {
                    safeExecute(id, 'onShow');
                });
            }
        };
        if (shared.isArray(component.mixins)) {
            var mixins = component.mixins;
            var idx = mixins.length - 1;
            if (!((_a = mixins[idx].props) === null || _a === void 0 ? void 0 : _a.tid)) {
                // mixins 里还没注入过，直接推入数组
                component.mixins.push(inject);
            }
            else {
                // mixins 里已经注入过，代替前者
                component.mixins[idx] = inject;
            }
        }
        else {
            component.mixins = [inject];
        }
        return h(isBrowser ? 'div' : 'root', {
            key: id,
            id: id,
            class: isBrowser ? 'taro_page' : ''
        }, [
            h(component, {
                tid: id
            })
        ]);
    };
}
function setReconciler() {
    var hostConfig = {
        getLifecyle: function getLifecyle(instance, lifecycle) {
            return instance.$options[lifecycle];
        },
        removeAttribute: function removeAttribute(dom, qualifiedName) {
            var compName = shared.capitalize(shared.toCamelCase(dom.tagName.toLowerCase()));
            if (compName in shared.internalComponents &&
                shared.hasOwn(shared.internalComponents[compName], qualifiedName) &&
                shared.isBooleanStringLiteral(shared.internalComponents[compName][qualifiedName])) {
                // avoid attribute being removed because set false value in vue
                dom.setAttribute(qualifiedName, false);
            }
            else {
                delete dom.props[qualifiedName];
            }
        },
        modifyEventType: function modifyEventType(event) {
            event.type = event.type.replace(/-/g, '');
        }
    };
    if (isBrowser) {
        hostConfig.createPullDownComponent = function (component, path, h) {
            var inject = {
                props: {
                    tid: String
                },
                created: function created() {
                    injectPageInstance(this, path);
                }
            };
            component.mixins = shared.isArray(component.mixins)
                ? component.mixins.push(inject)
                : [inject];
            return {
                render: function render() {
                    return h('taro-pull-to-refresh', {
                        class: 'hydrated'
                    }, [h(component, this.$slots.default)]);
                }
            };
        };
        hostConfig.findDOMNode = function (el) {
            return el.$el;
        };
    }
    options.reconciler(hostConfig);
}
function createVue3App(app, h, config) {
    var pages = [];
    var appInstance;
    shared.ensure(!shared.isFunction(app._component), '入口组件不支持使用函数式组件');
    setReconciler();
    app._component.render = function () {
        return pages.slice();
    };
    var appConfig = Object.create({
        mount: function mount(component, id, cb) {
            var page = createVue3Page(h, id)(component);
            pages.push(page);
            this.updateAppInstance(cb);
        },
        unmount: function unmount(id, cb) {
            pages = pages.filter(function (page) { return page.key !== id; });
            this.updateAppInstance(cb);
        },
        updateAppInstance: function updateAppInstance(cb) {
            appInstance.$forceUpdate();
            appInstance.$nextTick(cb);
        }
    }, {
        config: {
            writable: true,
            enumerable: true,
            configurable: true,
            value: config
        },
        onLaunch: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                var _a;
                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                appInstance = app.mount('#app');
                var onLaunch = (_a = appInstance === null || appInstance === void 0 ? void 0 : appInstance.$options) === null || _a === void 0 ? void 0 : _a.onLaunch;
                shared.isFunction(onLaunch) && onLaunch.call(appInstance, options);
            }
        },
        onShow: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                var _a;
                Current.router = Object.assign({ params: options === null || options === void 0 ? void 0 : options.query }, options);
                var onShow = (_a = appInstance === null || appInstance === void 0 ? void 0 : appInstance.$options) === null || _a === void 0 ? void 0 : _a.onShow;
                shared.isFunction(onShow) && onShow.call(appInstance, options);
            }
        },
        onHide: {
            writable: true,
            enumerable: true,
            value: function value(options) {
                var _a;
                var onHide = (_a = appInstance === null || appInstance === void 0 ? void 0 : appInstance.$options) === null || _a === void 0 ? void 0 : _a.onHide;
                shared.isFunction(onHide) && onHide.call(appInstance, options);
            }
        }
    });
    Current.app = appConfig;
    return Current.app;
}

function removeLeadingSlash(path) {
    if (path == null) {
        return '';
    }
    return path.charAt(0) === '/' ? path.slice(1) : path;
}
var nextTick = function (cb, ctx) {
    var _a, _b, _c;
    var router = Current.router;
    var timerFunc = function () {
        setTimeout(function () {
            ctx ? cb.call(ctx) : cb();
        }, 1);
    };
    if (router !== null) {
        var pageElement = null;
        var path = getPath(removeLeadingSlash(router.path), router.params);
        pageElement = document$1.getElementById(path);
        if (pageElement !== null) {
            if (isBrowser) {
                // eslint-disable-next-line dot-notation
                (_c = (_b = (_a = pageElement.firstChild) === null || _a === void 0 ? void 0 : _a['componentOnReady']) === null || _b === void 0 ? void 0 : _b.call(_a).then(function () {
                    timerFunc();
                })) !== null && _c !== void 0 ? _c : timerFunc();
            }
            else {
                pageElement.enqueueUpdateCallback(cb, ctx);
            }
        }
        else {
            timerFunc();
        }
    }
    else {
        timerFunc();
    }
};

exports.Current = Current;
exports.CurrentReconciler = CurrentReconciler;
exports.Events = Events;
exports.FormElement = FormElement;
exports.HOOKS_APP_ID = HOOKS_APP_ID;
exports.Style = Style;
exports.TaroElement = TaroElement;
exports.TaroEvent = TaroEvent;
exports.TaroNode = TaroNode;
exports.TaroRootElement = TaroRootElement;
exports.TaroText = TaroText;
exports.connectReactPage = connectReactPage;
exports.connectVuePage = connectVuePage;
exports.createComponentConfig = createComponentConfig;
exports.createDocument = createDocument;
exports.createEvent = createEvent;
exports.createNativeComponentConfig = createNativeComponentConfig;
exports.createPageConfig = createPageConfig;
exports.createReactApp = createReactApp;
exports.createRecursiveComponentConfig = createRecursiveComponentConfig;
exports.createVue3App = createVue3App;
exports.createVueApp = createVueApp;
exports.document = document$1;
exports.eventCenter = eventCenter;
exports.getComputedStyle = getComputedStyle;
exports.getCurrentInstance = getCurrentInstance;
exports.hydrate = hydrate;
exports.injectPageInstance = injectPageInstance;
exports.navigator = navigator;
exports.nextTick = nextTick;
exports.options = options;
exports.stringify = stringify;
exports.useAddToFavorites = useAddToFavorites;
exports.useDidHide = useDidHide;
exports.useDidShow = useDidShow;
exports.useOptionMenuClick = useOptionMenuClick;
exports.usePageScroll = usePageScroll;
exports.usePullDownRefresh = usePullDownRefresh;
exports.usePullIntercept = usePullIntercept;
exports.useReachBottom = useReachBottom;
exports.useReady = useReady;
exports.useResize = useResize;
exports.useRouter = useRouter;
exports.useScope = useScope;
exports.useShareAppMessage = useShareAppMessage;
exports.useShareTimeline = useShareTimeline;
exports.useTabItemTap = useTabItemTap;
exports.useTitleClick = useTitleClick;
exports.window = window$1;
//# sourceMappingURL=index.js.map
