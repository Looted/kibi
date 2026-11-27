#!/usr/bin/env node
import { createRequire } from "node:module";
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS(function(exports) {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/visit.js
var require_visit = __commonJS(function(exports) {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor === "function")
      return visitor(key, node, path);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path);
    return;
  }
  function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS(function(exports) {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS(function(exports) {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res) => {
        data.res = res;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS(function(exports) {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS(function(exports) {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      if (found && ctx) {
        const { anchors, doc, maxAliasCount } = ctx;
        let data = anchors.get(found);
        if (!data) {
          toJS.toJS(found, null, ctx);
          data = anchors.get(found);
        }
        if (data?.res === undefined) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, found, anchors);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const source = this.resolve(ctx.doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      return ctx.anchors.get(source).res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors && source && anchors.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors);
      const vc = getAliasCount(doc, node.value, anchors);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node = new Scalar.Scalar(value);
        if (ref)
          ref.node = node;
        return node;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS(function(exports) {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1;i >= 0; --i) {
      const k = path[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path, keepScalar) {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path, value) {
      const [key, ...rest] = path;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS(function(exports) {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS(function(exports) {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i = 0;i < folds.length; ++i) {
      const fold = folds[i];
      const end = folds[i + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS(function(exports) {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/log.js
var require_log = __commonJS(function(exports) {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS(function(exports) {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str = stringify.stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      if (chompKeep && comment)
        chompKeep = false;
      lines.push(blockItemPrefix + str);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS(function(exports) {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map, onError) {
      if (!identity.isMap(map))
        onError("Expected a mapping for this tag");
      return map;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq, onError) {
      if (!identity.isSeq(seq))
        onError("Expected a sequence for this tag");
      return seq;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS(function(exports) {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS(function(exports) {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS(function(exports) {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs = new YAMLSeq.YAMLSeq(schema);
    pairs.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS(function(exports) {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap = new this;
      omap.items = pairs$1.items;
      return omap;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n = BigInt(str);
      return sign === "-" ? BigInt(-1) * n : n;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set.items.push(Pair.createPair(value, null, ctx));
        }
      return set;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags.includes(tagObj))
        tags.push(tagObj);
      return tags;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS(function(exports) {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS(function(exports) {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path) {
      if (Collection.isEmptyPath(path)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path, keepScalar) {
      if (Collection.isEmptyPath(path))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path) {
      if (Collection.isEmptyPath(path))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path, value) {
      if (Collection.isEmptyPath(path)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/errors.js
var require_errors = __commonJS(function(exports) {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "…" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "…";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `…
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS(function(exports) {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS(function(exports) {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS(function(exports) {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS(function(exports) {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS(function(exports) {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS(function(exports) {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS(function(exports) {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end = start + header.length;
      if (scalar.source)
        end += scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return unfoldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function unfoldLines(source) {
    const line = /(.*?)\r?\n/sy;
    let match = line.exec(source);
    if (!match)
      return source;
    let trimEnd, trimBoth;
    try {
      trimEnd = new RegExp("(?<![ \t])[ \t]+$");
      trimBoth = new RegExp("^[ \t]+|(?<![ \t])[ \t]+$", "g");
    } catch {
      trimEnd = /[ \t]+$/;
      trimBoth = /^[ \t]+|[ \t]+$/g;
    }
    let res = match[1].replace(trimEnd, "");
    let sep = " ";
    let pos = line.lastIndex;
    while (match = line.exec(source)) {
      const lm = match[1].replace(trimBoth, "");
      if (lm === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + lm;
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "",
    _: " ",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS(function(exports) {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS(function(exports) {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS(function(exports) {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0;i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0;i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS(function(exports) {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS(function(exports) {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS(function(exports) {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
  }
  exports.visit = visit;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS(function(exports) {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS(function(exports) {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i = this.pos;ch = this.buffer[i]; ++i) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i = nl - 1;
          let ch = this.buffer[i];
          if (ch === "\r")
            ch = this.buffer[--i];
          const lastChar = i;
          while (ch === " ")
            ch = this.buffer[--i];
          if (ch === `
` && i >= this.pos && i + 1 + indent > lastChar)
            nl = i;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS(function(exports) {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS(function(exports) {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0;i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS(function(exports) {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// src/hook-runner.ts
import { createHash as createHash9 } from "node:crypto";
import os2 from "node:os";
import path19 from "node:path";
import { pathToFileURL } from "node:url";

// ../agent-core/dist/bash-command.js
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
var MAX_COMMAND_CHARS = 20000;
var MAX_CANDIDATES = 200;
var MTIME_TOLERANCE_MS = 1000;
var TOKEN_SEPARATOR = /[\s;|&<>()'"`,=[\]{}]/;
var PATH_LIKE = /^[\w@.~/+-]*[\w-]\.[A-Za-z0-9]{1,8}$|^[\w@.~+-]*\/[\w@.~/+-]*$/;
var SEARCH_COMMAND = /(^|[\s;|&(])(grep|egrep|rg|ag|ack|find|fd|git\s+(grep|ls-files))(\s|$)/;
var CD_TARGET = /(?:^|[\s;&|('"])cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g;
function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}
function* cdTargets(command, cwd) {
  let base = cwd;
  for (const match of command.matchAll(CD_TARGET)) {
    const target = unquote(match[1]);
    if (target === "-")
      continue;
    base = path.resolve(base, target);
    yield base;
  }
}
function commandFilePaths(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const found = new Set;
  let candidates = 0;
  for (const token of scanned.split(TOKEN_SEPARATOR)) {
    if (!PATH_LIKE.test(token) || token.startsWith("-"))
      continue;
    if (++candidates > MAX_CANDIDATES)
      break;
    for (const base of bases) {
      const absolute = path.resolve(base, token);
      try {
        if (fs.statSync(absolute).isFile()) {
          found.add(absolute);
          break;
        }
      } catch {}
    }
  }
  return [...found];
}
function isSearchCommand(command) {
  return SEARCH_COMMAND.test(command.slice(0, MAX_COMMAND_CHARS));
}
function filesChangedSince(root, sinceMs) {
  const listed = spawnSync("git", ["ls-files", "--modified", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8", timeout: 3000 });
  if (listed.status !== 0)
    return [];
  const changed = new Set;
  for (const relative of listed.stdout.split("\x00")) {
    if (relative.length === 0)
      continue;
    try {
      const { mtimeMs } = fs.statSync(path.join(root, relative));
      if (mtimeMs >= sinceMs - MTIME_TOLERANCE_MS)
        changed.add(relative);
    } catch {}
  }
  return [...changed];
}
var SIMPLE_COMMAND_SEPARATOR = /&&|\|\||[;|\n]/g;
var REDIRECT_TARGET = /(?:^|[^&<>])(?:&>>?|>>?\|?)\s*(?!&)([^\s;&|<>()]+)/g;
var IN_PLACE_FLAG = /^(-[A-Za-z]*i\S*|--in-place(=\S*)?)$/;
var IN_PLACE_EDITORS = new Set(["sed", "gsed", "perl"]);
var COMMAND_PREFIXES = new Set([
  "sudo",
  "env",
  "command",
  "exec",
  "nice",
  "time",
  "xargs",
  "timeout",
  "(",
  "{",
  "then",
  "do",
  "else",
  "!"
]);
var SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
var SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/;
function shellScript(words) {
  const [name, ...args] = words;
  if (!SHELLS.has(path.basename(String(name))))
    return;
  const flag = args.findIndex((arg) => SCRIPT_FLAG.test(arg));
  return flag === -1 ? undefined : args[flag + 1];
}
function maskQuoted(command) {
  let masked = "";
  let quote = null;
  let escaped = false;
  for (const char of command.split("")) {
    if (escaped) {
      escaped = false;
      masked += "_";
    } else if (quote === null && (char === "'" || char === '"')) {
      quote = char;
      masked += "_";
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
      masked += "_";
    } else if (quote !== null) {
      if (char === quote)
        quote = null;
      masked += "_";
    } else
      masked += char;
  }
  return masked;
}
function* simpleCommandWords(command, masked) {
  let start = 0;
  const cut = (end) => [...masked.slice(start, end).matchAll(/\S+/g)].map((word) => {
    const from = start + word.index;
    return command.slice(from, from + word[0].length);
  });
  for (const separator of masked.matchAll(SIMPLE_COMMAND_SEPARATOR)) {
    yield cut(separator.index);
    start = separator.index + separator[0].length;
  }
  yield cut(masked.length);
}
function isCommandWord(word) {
  return !COMMAND_PREFIXES.has(word) && !/^\w+=/.test(word);
}
function commandStart(words) {
  let afterPrefix = false;
  for (const [index, word] of words.entries()) {
    if (!isCommandWord(word)) {
      afterPrefix = afterPrefix || COMMAND_PREFIXES.has(word);
      continue;
    }
    if (afterPrefix && (/^-/.test(word) || /^\d+(?:\.\d+)?[smhd]?$/.test(word)))
      continue;
    return index;
  }
  return -1;
}
function unbracketed(words) {
  return words.flatMap((word) => {
    const opened = /^\(+./.test(word) ? word.replace(/^\(+/, "") : word;
    const closed = /.\)+$/.test(opened) ? opened.replace(/\)+$/, "") : opened;
    return closed === ")" || closed === "}" ? [] : [closed];
  });
}
function operandsSkipping(args, valueFlags) {
  const operands = [];
  let afterDoubleDash = false;
  for (let index = 0;index < args.length; index++) {
    const arg = args[index];
    if (afterDoubleDash) {
      operands.push(arg);
      continue;
    }
    if (arg === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (valueFlags.has(arg)) {
      index++;
      continue;
    }
    if (arg.startsWith("-"))
      continue;
    operands.push(arg);
  }
  return operands;
}
var TRUNCATE_VALUE_FLAGS = new Set(["-s", "--size", "-r", "--reference"]);
var CP_MV_VALUE_FLAGS = new Set([
  "-t",
  "--target-directory",
  "-S",
  "--suffix"
]);
var GIT_RESTORE_VALUE_FLAGS = new Set(["-s", "--source"]);
function* writtenNames(command) {
  const masked = maskQuoted(command);
  for (const match of masked.matchAll(REDIRECT_TARGET)) {
    const end = match.index + match[0].length;
    yield unquote(command.slice(end - match[1].length, end));
  }
  for (const words of simpleCommandWords(command, masked)) {
    const plain = unbracketed(words);
    const commandWords = plain.slice(commandStart(plain));
    const script = shellScript(commandWords);
    if (script !== undefined) {
      yield* writtenNames(unquote(script));
      continue;
    }
    const [name, ...args] = commandWords;
    const program = path.basename(String(name));
    if (IN_PLACE_EDITORS.has(program) && args.some((arg) => IN_PLACE_FLAG.test(arg)) || program === "tee") {
      yield* args;
    } else if (program === "rm") {
      yield* operandsSkipping(args, new Set);
    } else if (program === "truncate") {
      yield* operandsSkipping(args, TRUNCATE_VALUE_FLAGS);
    } else if (program === "mv") {
      yield* operandsSkipping(args, CP_MV_VALUE_FLAGS);
    } else if (program === "cp") {
      let targetDir;
      const operands = [];
      let afterDoubleDash = false;
      for (let i = 0;i < args.length; i++) {
        const arg = args[i];
        if (afterDoubleDash) {
          operands.push(arg);
          continue;
        }
        if (arg === "--") {
          afterDoubleDash = true;
          continue;
        }
        if (arg === "-t" || arg === "--target-directory") {
          const next = args[i + 1];
          if (next !== undefined)
            targetDir = unquote(next);
          i += 1;
          continue;
        }
        if (arg.startsWith("--target-directory=")) {
          targetDir = unquote(arg.slice("--target-directory=".length));
          continue;
        }
        if (arg.startsWith("-t") && arg.length > 2) {
          targetDir = unquote(arg.slice(2));
          continue;
        }
        if (arg === "-S" || arg === "--suffix") {
          i += 1;
          continue;
        }
        if (arg.startsWith("-"))
          continue;
        operands.push(arg);
      }
      if (targetDir !== undefined) {
        for (const src of operands) {
          yield path.join(targetDir, path.basename(unquote(src)));
        }
      } else {
        const destination = operands.at(-1);
        if (operands.length >= 2 && destination !== undefined)
          yield destination;
      }
    } else if (program === "dd") {
      for (const arg of args) {
        const cleaned = unquote(arg);
        if (cleaned.startsWith("of=") && cleaned.length > 3)
          yield cleaned.slice(3);
      }
    } else if (program === "git") {
      const subIndex = args.findIndex((arg) => !arg.startsWith("-"));
      const sub = subIndex >= 0 ? args[subIndex] : undefined;
      const subArgs = subIndex >= 0 ? args.slice(subIndex + 1) : [];
      if (sub === "restore") {
        yield* operandsSkipping(subArgs, GIT_RESTORE_VALUE_FLAGS);
      } else if (sub === "checkout") {
        const dashIndex = subArgs.indexOf("--");
        if (dashIndex >= 0)
          yield* subArgs.slice(dashIndex + 1);
      }
    }
  }
}
function commandEditPaths(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const wanted = new Set;
  for (const target of writtenNames(scanned)) {
    const name = unquote(target);
    if (!name || name.startsWith("-"))
      continue;
    for (const base of bases)
      wanted.add(path.resolve(base, name));
  }
  const seen = new Set(commandFilePaths(scanned, cwd).filter((absolute) => wanted.has(absolute)));
  for (const absolute of wanted) {
    if (seen.has(absolute))
      continue;
    try {
      if (fs.statSync(absolute).isFile())
        seen.add(absolute);
    } catch {}
  }
  return [...seen];
}
var SHELL_TOOLS = new Set([
  "Bash",
  "Shell",
  "shell",
  "local_shell",
  "exec_command",
  "run_shell_command"
]);
var SEARCH_PROGRAMS = new Set(["grep", "egrep", "fgrep", "rg"]);
var WHOLE_FILE_PROGRAMS = new Set(["cat", "nl", "bat", "less", "more"]);
var GREP_VALUE_FLAGS = new Set([
  "-A",
  "-B",
  "-C",
  "-m",
  "-g",
  "-t",
  "-T",
  "-f",
  "--glob",
  "--type",
  "--max-count",
  "--context",
  "--after-context",
  "--before-context",
  "--include",
  "--exclude",
  "--exclude-dir"
]);
var SED_PRINT = /^(\d+)(?:,(\d+|\$))?p$/;
var DEFAULT_HEAD_LINES = 10;
function lineCount(args, index) {
  const arg = args[index];
  if (arg === "-n" || arg === "--lines") {
    const value = args[index + 1];
    return value !== undefined && /^[+-]?\d+$/.test(value) ? { value, used: 2 } : undefined;
  }
  const attached = /^(?:-n|--lines=)([+-]?\d+)$/.exec(arg) ?? /^-(\d+)$/.exec(arg);
  return attached ? { value: attached[1], used: 1 } : undefined;
}
function readText(absolute) {
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return;
  }
}
function fileLineCount(absolute) {
  const content = readText(absolute) ?? "";
  const lines = content.split(`
`).length;
  return content.endsWith(`
`) || content === "" ? lines - 1 : lines;
}
function readStage(words) {
  const [name, ...args] = words;
  const program = path.basename(String(name));
  if (program === "sed") {
    if (args.some((arg) => IN_PLACE_FLAG.test(arg)))
      return;
    let quiet = false;
    const scripts = [];
    const operands = [];
    let expectExpr = false;
    let expectFile = false;
    let hasScriptFile = false;
    for (let index = 0;index < args.length; index++) {
      const arg = args[index];
      if (expectExpr) {
        scripts.push(unquote(arg));
        expectExpr = false;
        continue;
      }
      if (expectFile) {
        expectFile = false;
        continue;
      }
      if (arg === "--") {
        operands.push(...args.slice(index + 1));
        break;
      }
      if (arg === "--quiet" || arg === "--silent") {
        quiet = true;
        continue;
      }
      if (arg === "-e" || arg === "--expression") {
        expectExpr = true;
        continue;
      }
      if (arg.startsWith("--expression=")) {
        scripts.push(unquote(arg.slice("--expression=".length)));
        continue;
      }
      if (arg === "-f" || arg === "--file") {
        expectFile = true;
        hasScriptFile = true;
        continue;
      }
      if (arg.startsWith("--file=")) {
        hasScriptFile = true;
        continue;
      }
      if (arg.startsWith("-") && arg.length > 1) {
        if (!arg.startsWith("--")) {
          const flags = arg.slice(1);
          if (flags.includes("n"))
            quiet = true;
          const exprPos = flags.indexOf("e");
          if (exprPos >= 0) {
            const attached = flags.slice(exprPos + 1);
            if (attached.length > 0)
              scripts.push(unquote(attached));
            else
              expectExpr = true;
          }
          const filePos = flags.indexOf("f");
          if (filePos >= 0) {
            hasScriptFile = true;
            if (filePos === flags.length - 1)
              expectFile = true;
          }
        }
        continue;
      }
      if (scripts.length === 0 && !hasScriptFile)
        scripts.push(unquote(arg));
      else
        operands.push(arg);
    }
    if (quiet && scripts.length === 1) {
      const print = SED_PRINT.exec(scripts[0]);
      if (print) {
        const start = Number(print[1]);
        const endText = print[2] ?? print[1];
        return {
          operands,
          range: (absolute) => ({
            start,
            end: endText === "$" ? fileLineCount(absolute) : Number(endText)
          }),
          recursive: false,
          whole: false
        };
      }
    }
    return operands.length > 0 ? { operands, recursive: false, whole: true } : undefined;
  }
  if (program === "head" || program === "tail") {
    let count = String(DEFAULT_HEAD_LINES);
    const operands = [];
    for (let index = 0;index < args.length; index++) {
      const arg = args[index];
      if (arg === "-c" || arg === "--bytes" || /^-c.+/.test(arg) || arg.startsWith("--bytes="))
        return;
      const found = lineCount(args, index);
      if (found) {
        count = found.value;
        index += found.used - 1;
      } else if (!arg.startsWith("-"))
        operands.push(arg);
    }
    const lines = Number(count.replace(/^[+-]/, ""));
    return {
      operands,
      range: (absolute) => {
        if (program === "head") {
          if (count.startsWith("-")) {
            const total = fileLineCount(absolute);
            return { start: 1, end: Math.max(0, total - lines) };
          }
          return { start: 1, end: lines };
        }
        const total = fileLineCount(absolute);
        return count.startsWith("+") ? { start: lines, end: total } : { start: Math.max(1, total - lines + 1), end: total };
      },
      recursive: false,
      whole: false
    };
  }
  if (SEARCH_PROGRAMS.has(program))
    return searchStage(program, args);
  if (WHOLE_FILE_PROGRAMS.has(program))
    return {
      operands: args.filter((arg) => !arg.startsWith("-")),
      recursive: false,
      whole: true
    };
  return;
}
function searchStage(program, args) {
  let pattern;
  let ignoreCase = false;
  let fixed = program === "fgrep";
  let basic = program === "grep";
  let word = false;
  let recursive = program === "rg";
  let skipSearchView = false;
  const operands = [];
  for (let index = 0;index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") {
      for (const rest of args.slice(index + 1)) {
        if (pattern === undefined)
          pattern = unquote(rest);
        else
          operands.push(rest);
      }
      break;
    }
    if (arg === "-e" || arg === "--regexp") {
      pattern = unquote(String(args[++index]));
      continue;
    }
    if (GREP_VALUE_FLAGS.has(arg)) {
      index++;
      continue;
    }
    if (arg.startsWith("--")) {
      if (arg === "--ignore-case")
        ignoreCase = true;
      else if (arg === "--fixed-strings")
        fixed = true;
      else if (arg === "--extended-regexp" || arg === "--perl-regexp")
        basic = false;
      else if (arg === "--word-regexp")
        word = true;
      else if (arg === "--recursive")
        recursive = true;
      else if (arg === "--invert-match" || arg === "--files-without-match" || arg === "--count")
        skipSearchView = true;
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "i")
          ignoreCase = true;
        else if (flag === "F")
          fixed = true;
        else if (flag === "E" || flag === "P")
          basic = false;
        else if (flag === "w")
          word = true;
        else if (flag === "r" || flag === "R")
          recursive = true;
        else if (flag === "v" || flag === "L" || flag === "c")
          skipSearchView = true;
      }
      continue;
    }
    if (pattern === undefined)
      pattern = unquote(arg);
    else
      operands.push(arg);
  }
  if (skipSearchView)
    return;
  return {
    operands,
    ...pattern === undefined || pattern.length === 0 ? {} : { grep: { pattern, ignoreCase, fixed, basic: basic && !fixed, word } },
    recursive,
    whole: pattern === ""
  };
}
function* pipelines(command) {
  const masked = maskQuoted(command);
  const separator = /&&|\|\||[;\n]/g;
  let start = 0;
  const pieces = [];
  for (const match of masked.matchAll(separator)) {
    pieces.push([start, match.index]);
    start = match.index + match[0].length;
  }
  pieces.push([start, masked.length]);
  for (const [from, to] of pieces) {
    const stages = [];
    let stageStart = from;
    const cut = (end) => {
      const words = [...masked.slice(stageStart, end).matchAll(/\S+/g)].map((word) => {
        const at = stageStart + word.index;
        return command.slice(at, at + word[0].length);
      });
      const plain = unbracketed(words);
      stages.push(plain.slice(Math.max(0, commandStart(plain))));
    };
    for (let index = from;index < to; index++) {
      if (masked[index] === "|") {
        cut(index);
        stageStart = index + 1;
      }
    }
    cut(to);
    yield stages;
  }
}
function commandReadViews(command, cwd) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const bases = [cwd, ...cdTargets(scanned, cwd)];
  const views = new Map;
  const resolve = (word) => {
    const name = unquote(word);
    for (const base of bases) {
      const absolute = path.resolve(base, name);
      try {
        const stat = fs.statSync(absolute);
        if (stat.isFile() || stat.isDirectory())
          return { absolute, directory: stat.isDirectory() };
      } catch {}
    }
    return;
  };
  const add = (view) => {
    const known = views.get(view.absolute);
    if (!known || !known.focus && !known.grep)
      views.set(view.absolute, view);
  };
  const visit = (line, depth) => {
    for (const stages of pipelines(line)) {
      let source;
      for (const words of stages) {
        const script = shellScript(words);
        if (script !== undefined && depth < 2) {
          visit(unquote(script), depth + 1);
          continue;
        }
        const stage = readStage(words);
        if (!stage) {
          source = undefined;
          continue;
        }
        const operands = stage.operands.map(resolve).filter((target) => target !== undefined);
        if (stage.grep) {
          const targets = operands.length === 0 && stage.recursive ? [
            {
              absolute: path.resolve(bases.at(-1)),
              directory: true
            }
          ] : operands;
          for (const target of targets)
            if (!target.directory || stage.recursive)
              add({ ...target, grep: stage.grep });
          if (operands.length === 0 && source)
            add({ absolute: source, directory: false, grep: stage.grep });
          source = undefined;
          continue;
        }
        const files = operands.filter((target) => !target.directory);
        if (stage.range) {
          const targets = files.length === 0 && source ? [{ absolute: source, directory: false }] : files;
          for (const target of targets)
            add({ ...target, focus: [stage.range(target.absolute)] });
          source = undefined;
          continue;
        }
        for (const target of files)
          add(target);
        source = files.length === 1 ? files[0].absolute : undefined;
      }
    }
  };
  visit(scanned, 0);
  return [...views.values()];
}
function kibiInitLevelTarget(command) {
  const scanned = command.slice(0, MAX_COMMAND_CHARS);
  const find = (line, depth) => {
    for (const stages of pipelines(line)) {
      for (const words of stages) {
        const script = shellScript(words);
        if (script !== undefined && depth < 2) {
          const nested = find(unquote(script), depth + 1);
          if (nested !== undefined)
            return nested;
          continue;
        }
        const cleaned = words.map(unquote);
        const initIndex = cleaned.findIndex((word, index) => word === "init" && index > 0 && /(?:^|[\\/])kibi(?:\.[cm]?js)?$/.test(cleaned[index - 1]));
        if (initIndex < 0)
          continue;
        for (let index = initIndex + 1;index < cleaned.length; index++) {
          const arg = cleaned[index];
          if (arg === "--level") {
            const value = cleaned[index + 1];
            if (value !== undefined && value.length > 0)
              return value;
          } else if (arg.startsWith("--level=")) {
            const value = arg.slice("--level=".length);
            if (value.length > 0)
              return value;
          }
        }
      }
    }
    return;
  };
  return find(scanned, 0);
}

// ../agent-core/dist/hook-input.js
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function parseStdinJson(rawInput) {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return {};
  }
  return JSON.parse(trimmed);
}

// src/hook-input.ts
function readString(record, key) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
function parseHookInput(raw) {
  const input = raw ?? {};
  const parsed = {
    event: readString(input, "hook_event_name") ?? ""
  };
  const sessionId = readString(input, "session_id");
  const cwd = readString(input, "cwd");
  const toolName = readString(input, "tool_name");
  const source = readString(input, "source");
  if (sessionId !== undefined)
    parsed.sessionId = sessionId;
  if (cwd !== undefined)
    parsed.cwd = cwd;
  if (toolName !== undefined)
    parsed.toolName = toolName;
  const prompt = readString(input, "prompt");
  if (source !== undefined)
    parsed.source = source;
  if (prompt !== undefined)
    parsed.prompt = prompt;
  if (input.tool_input !== undefined)
    parsed.toolInput = input.tool_input;
  if (input.stop_hook_active === true)
    parsed.stopHookActive = true;
  return parsed;
}

// ../agent-core/dist/checkout-hooks.js
import { spawnSync as spawnSync2 } from "node:child_process";
import * as fs2 from "node:fs";
import * as path3 from "node:path";

// ../agent-core/dist/version-control.js
import { lstatSync } from "node:fs";
import * as path2 from "node:path";
function ceilingDirectories(env) {
  return new Set((env.GIT_CEILING_DIRECTORIES ?? "").split(path2.delimiter).filter((entry) => entry.length > 0).map((entry) => path2.resolve(entry)));
}
function findRepositoryMarker(start, env = process.env) {
  const ceilings = ceilingDirectories(env);
  let current = path2.resolve(start);
  for (;; ) {
    const entry = path2.join(current, ".git");
    try {
      lstatSync(entry);
      return entry;
    } catch (error) {
      const code = error.code;
      if (code !== "ENOENT" && code !== "ENOTDIR")
        return entry;
    }
    const parent = path2.dirname(current);
    if (parent === current || ceilings.has(parent))
      return null;
    current = parent;
  }
}
function noGitAdvisory(reason, kibiBranch) {
  const opening = reason === "git_unavailable" ? "Git is not installed (or not on PATH) and this directory has no repository: Kibi is working without version control." : "No Git repository: Kibi is working without version control in this directory.";
  const recommendation = reason === "git_unavailable" ? "Recommended: install Git, run `git init`, then `kibi init`; the knowledge recorded here carries over." : "Recommended: run `git init`, then `kibi init`; the knowledge recorded here carries over.";
  const sentences = [
    opening,
    "Search, query, record, upsert, check and sync work on one knowledge store.",
    "Off until there is a repository: the commit gate (`kibi check --staged`), Git hooks, impact review and per-branch knowledge.",
    recommendation,
    "Until then, finish a change with `kibi check`."
  ];
  if (kibiBranch !== undefined)
    sentences.push(`KIBI_BRANCH=${kibiBranch} selects this store only in processes that set it; unset it to use this directory's own store.`);
  return sentences.join(" ");
}

// ../agent-core/dist/checkout-hooks.js
var HOOK_MANAGER_FILES = [
  "lefthook.yml",
  "lefthook.yaml",
  ".lefthook.yml",
  ".lefthook.yaml",
  "lefthook.json",
  ".husky",
  ".pre-commit-config.yaml"
];
function git(workspaceRoot, args) {
  const result = spawnSync2("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    timeout: 2000
  });
  return result.status === 0 ? result.stdout.trim() : null;
}
function hasKibiPreCommitGate(workspaceRoot) {
  const resolved = git(workspaceRoot, [
    "rev-parse",
    "--git-path",
    "hooks/pre-commit"
  ]);
  const hookPath = resolved !== null ? path3.resolve(workspaceRoot, resolved) : path3.join(workspaceRoot, ".git", "hooks", "pre-commit");
  try {
    return /kibi[^\n]*\bcheck\b/i.test(String(fs2.readFileSync(hookPath)));
  } catch {}
  return false;
}
function kibiHooksMissing(workspaceRoot) {
  if (!fs2.existsSync(path3.join(workspaceRoot, ".kb", "manifest.json")))
    return false;
  if (git(workspaceRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true")
    return false;
  if (git(workspaceRoot, ["config", "--get", "core.hooksPath"]) !== null)
    return false;
  if (HOOK_MANAGER_FILES.some((file) => fs2.existsSync(path3.join(workspaceRoot, file))))
    return false;
  return !hasKibiPreCommitGate(workspaceRoot);
}
var MISSING_HOOKS_NOTE = "Kibi git hooks are not installed in this checkout (a clone never carries .git/hooks), so commits skip `kibi check --staged` and a branch switch does not recompile the KB. Install them with `npx --no-install kibi hooks install` (or the project's package-manager runner), or by installing the project's dependencies when its prepare script runs it.";
function missingHooksNote(workspaceRoot) {
  return kibiHooksMissing(workspaceRoot) ? MISSING_HOOKS_NOTE : null;
}
function workspaceWithoutGit(workspaceRoot) {
  const probe = spawnSync2("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    timeout: 2000
  });
  if (probe.status === 0)
    return null;
  if (findRepositoryMarker(workspaceRoot) !== null)
    return null;
  return probe.error === undefined ? "not_a_repository" : "git_unavailable";
}
function checkoutSessionNote(workspaceRoot) {
  if (!fs2.existsSync(path3.join(workspaceRoot, ".kb", "manifest.json")))
    return null;
  const noGit = workspaceWithoutGit(workspaceRoot);
  if (noGit !== null) {
    const branch = process.env.KIBI_BRANCH?.trim();
    return noGitAdvisory(noGit, branch ? branch : undefined);
  }
  return missingHooksNote(workspaceRoot);
}

// ../agent-core/dist/decision-guard.js
import { createHash as createHash3 } from "node:crypto";
import fs6 from "node:fs";
import path8 from "node:path";

// ../agent-core/dist/kb-mcp-tools.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function canonicalKbToolName(toolName) {
  const trimmed = String(toolName).trim();
  const vibeDot = /^mcp_[^.]+\.(.+)$/i.exec(trimmed)?.[1];
  const lastSegment = trimmed.includes("__") ? trimmed.split("__").at(-1) : vibeDot !== undefined ? vibeDot : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}
var KIBI_WORKSPACE_ARGUMENT = "workspaceRoot";
function isKibiMcpToolName(toolName) {
  const name = String(toolName).trim();
  if (/^MCP:kb_[a-z_]+$/i.test(name))
    return true;
  if (/^mcp_[^.]*kibi[^.]*\.(?:kibi_)?kb_[a-z_]+$/i.test(name))
    return true;
  const segments = name.split("__");
  if (segments[0] !== "mcp")
    return false;
  const server = segments.slice(1, -1).join("__");
  return /kibi/i.test(server) && /^kb_[a-z_]+$/.test(segments.at(-1));
}
function stampKibiWorkspace(toolName, toolInput, workspaceRoot) {
  if (!workspaceRoot || !isKibiMcpToolName(toolName))
    return;
  const base = isRecord(toolInput) ? toolInput : {};
  const named = base[KIBI_WORKSPACE_ARGUMENT];
  if (typeof named === "string" && named.trim().length > 0)
    return;
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}
function effectiveKbOperation(operation, payload) {
  const write = operation === "kb_record" ? "kb_upsert" : operation;
  return write === "kb_upsert" && payload.dryRun === true ? "kb_validate_upsert" : write;
}
var KIBI_CLI_ROUTES = {
  check: "kb_check",
  query: "kb_query",
  "kb-query": "kb_query",
  search: "kb_search",
  status: "kb_status",
  graph: "kb_graph",
  coverage: "kb_coverage",
  "find-gaps": "kb_find_gaps",
  gaps: "kb_find_gaps",
  upsert: "kb_upsert",
  record: "kb_upsert",
  sync: "kb_sync"
};
function kibiCliOperation(command) {
  if (typeof command !== "string")
    return;
  const route = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command)?.[1];
  return route ? KIBI_CLI_ROUTES[route] : undefined;
}
var SHELL_TOOL_NAMES = new Set(["Bash", "bash", "Shell", "shell"]);

// ../agent-core/dist/path-policy.js
import path4 from "node:path";
var codeExtensions = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".lua",
  ".mjs",
  ".mts",
  ".cts",
  ".php",
  ".pl",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte"
]);
var ignoredSegments = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__"
]);
var testSegments = new Set([
  "test",
  "tests",
  "__tests__",
  "spec",
  "specs",
  "e2e",
  "__mocks__",
  "fixtures"
]);
var testBasename = /(\.|_)(test|spec|e2e)\.[^.]+$|^test_[^/]+\.py$/;
var documentationExtensions = new Set([".md", ".mdx", ".rst", ".txt"]);
var documentationSegments = new Set(["docs", "documentation"]);
var canonicalKbKnowledgeLanes = new Set([
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events"
]);
var canonicalKbKnowledgeFiles = new Set([
  "symbols.yaml",
  "symbol-coordinates.yaml"
]);
var explicitPathKeys = new Set([
  "absolute_path",
  "file",
  "file_path",
  "filepath",
  "new_path",
  "old_path",
  "path",
  "paths",
  "relative_path",
  "target_path"
]);
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeWorkspacePath(candidate) {
  return candidate.trim().replaceAll("\\", "/");
}
function pathSegments(candidate) {
  return normalizeWorkspacePath(candidate).split("/").filter(Boolean);
}
var patchTextKeys = ["command", "patch", "input", "patchText"];
function extractPatchTexts(toolInput) {
  const fields = isRecord2(toolInput) ? toolInput : {};
  return patchTextKeys.map((key) => fields[key]).filter((value) => typeof value === "string");
}
function canonicalizeWorkspacePath(workspaceRoot, options) {
  const trimmed = normalizeWorkspacePath(options.rawPath);
  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path4.isAbsolute(trimmed) ? path4.resolve(trimmed) : path4.resolve(base, trimmed);
  const workspaceRelative = path4.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (workspaceRelative.length === 0 || workspaceRelative === ".." || workspaceRelative.startsWith("../") || path4.isAbsolute(workspaceRelative)) {
    return;
  }
  return { workspaceRelative, absolute };
}
function toWorkspacePath(workspaceRoot, rawPath, eventCwd) {
  const canonical = canonicalizeWorkspacePath(workspaceRoot, {
    rawPath,
    eventCwd
  });
  return canonical ? { relative: canonical.workspaceRelative, absolute: canonical.absolute } : undefined;
}
function classifyPath(relativePath) {
  const segments = pathSegments(relativePath);
  if (segments[0] === ".kb")
    return "kb";
  if (segments.some((segment) => ignoredSegments.has(segment)))
    return "other";
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return "other";
  }
  const basename = segments.at(-1);
  if (basename === undefined)
    return "other";
  const extension = path4.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension))
    return "other";
  if (testBasename.test(basename) || segments.some((segment) => testSegments.has(segment))) {
    return "test";
  }
  return "source";
}

// ../agent-core/dist/requirement-candidates.js
import fs4 from "node:fs";
import path6 from "node:path";

// ../agent-core/dist/knowledge-index.js
import { createHash, randomUUID } from "node:crypto";
import fs3 from "node:fs";
import path5 from "node:path";
var SYMBOLS_MANIFEST = ".kb/symbols.yaml";
var SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
var INDEX_FORMAT = "kibi-agent-core.knowledge-index.v2";
var CACHE_FILE = "knowledge-index.json";
function unquote2(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value.replace(/\s#[\s\S]*/, "").trimEnd();
}
var FLOW_BLANK = /(?:[ \t\n\r]|#[^\n]*)*/y;
var DOUBLE_QUOTED = /"(?:[^"\\]|\\[\s\S])*"/y;
var SINGLE_QUOTED = /'(?:[^']|'')*'/y;
function parseFlow(text, start = 0) {
  let pos = start;
  const skip = () => {
    FLOW_BLANK.lastIndex = pos;
    FLOW_BLANK.test(text);
    pos = FLOW_BLANK.lastIndex;
  };
  const scalar = (stops) => {
    const quote = text.charAt(pos);
    if (quote === '"' || quote === "'") {
      const pattern = quote === '"' ? DOUBLE_QUOTED : SINGLE_QUOTED;
      pattern.lastIndex = pos;
      const raw = pattern.exec(text)[0];
      pos = pattern.lastIndex;
      return unquote2(raw);
    }
    let cursor = pos;
    for (;; ) {
      const char = text.charAt(cursor);
      if (stops.includes(char) && char !== ":" || char === `
` || char === "\r")
        break;
      if (stops.includes(":") && char === ":" && /[\s,\]}]/.test(text.charAt(cursor + 1)))
        break;
      if (char === "#" && /\s/.test(text.charAt(cursor - 1)))
        break;
      cursor += 1;
    }
    const raw = text.slice(pos, cursor).trim();
    pos = cursor;
    return raw;
  };
  const value = () => {
    const open = text.charAt(pos);
    if (open === "[") {
      pos += 1;
      const items = [];
      for (;; ) {
        skip();
        if (text.charAt(pos) === "]") {
          pos += 1;
          return items;
        }
        items.push(value());
        skip();
        if (text.charAt(pos) === ",")
          pos += 1;
        else if (text.charAt(pos) !== "]")
          throw new SyntaxError;
      }
    }
    if (open === "{") {
      pos += 1;
      const record = {};
      for (;; ) {
        skip();
        if (text.charAt(pos) === "}") {
          pos += 1;
          return record;
        }
        const key = scalar(":,}");
        skip();
        let entry;
        if (text.charAt(pos) === ":") {
          pos += 1;
          skip();
          entry = text.charAt(pos) === "," || text.charAt(pos) === "}" ? undefined : value();
        }
        if (key.length > 0)
          record[key] = entry;
        skip();
        if (text.charAt(pos) === ",")
          pos += 1;
        else if (text.charAt(pos) !== "}")
          throw new SyntaxError;
      }
    }
    return scalar(",]}");
  };
  try {
    const parsed = value();
    return { value: parsed, end: pos };
  } catch {}
  return;
}
function opensFlow(raw) {
  return raw.startsWith("[") || raw.startsWith("{");
}
var keyValue = /^([A-Za-z0-9_"'-][^:]*?):(?:\s+(.*))?$/;
function completeFlowValue(raw) {
  if (!opensFlow(raw))
    return;
  const parsed = parseFlow(raw);
  if (parsed === undefined)
    return;
  const rest = raw.slice(parsed.end).trim();
  return rest.length === 0 || rest.startsWith("#") ? parsed : undefined;
}
function parseScalarOrFlow(raw) {
  if (!raw)
    return;
  return completeFlowValue(raw)?.value ?? unquote2(raw);
}
function scanSymbolsManifest(text) {
  return scanRecordSequence(text, "symbols");
}
function unbalancedFlow(raw) {
  return opensFlow(raw) && parseFlow(raw) === undefined;
}
function flowRecords(text, start) {
  const parsed = parseFlow(text, start);
  if (!Array.isArray(parsed?.value))
    return;
  return parsed.value.filter((item) => typeof item === "object" && !Array.isArray(item));
}
function scanFlowSection(text, sectionKey) {
  const header = new RegExp(`^${sectionKey}:[ \\t]*(\\[)?`);
  let offset = 0;
  let first = true;
  let afterHeader = false;
  for (const piece of text.split(/(\r?\n)/)) {
    const content = piece.trim();
    if (content.length > 0 && !content.startsWith("#")) {
      const bracket = offset + piece.indexOf("[");
      if ((first || afterHeader) && content.startsWith("["))
        return flowRecords(text, bracket);
      if (afterHeader)
        return;
      first = false;
      const match = header.exec(piece);
      if (match) {
        if (match[1] !== undefined)
          return flowRecords(text, bracket);
        afterHeader = true;
      }
    }
    offset += piece.length;
  }
  return;
}
function scanRecordSequence(text, sectionKey) {
  const flowSection = scanFlowSection(text, sectionKey);
  if (flowSection !== undefined)
    return flowSection;
  const records = [];
  let item;
  let listKey;
  let listItem;
  let otherSection = false;
  let pendingFlow;
  const assign = (target, key, raw, recordIndent) => {
    if (raw !== undefined && unbalancedFlow(raw)) {
      pendingFlow = { target, key, first: raw, text: raw, recordIndent };
      return false;
    }
    const value = parseScalarOrFlow(raw);
    if (value === undefined)
      return true;
    target[key] = value;
    return false;
  };
  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#"))
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (pendingFlow !== undefined) {
      if (indent > pendingFlow.recordIndent) {
        pendingFlow.text += `
${content}`;
        const parsed = parseFlow(pendingFlow.text);
        if (parsed === undefined)
          continue;
        pendingFlow.target[pendingFlow.key] = parsed.value;
        pendingFlow = undefined;
        continue;
      }
      pendingFlow.target[pendingFlow.key] = unquote2(pendingFlow.first);
      pendingFlow = undefined;
    }
    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      otherSection = pair === null || unquote2(pair[1]) !== sectionKey;
      item = undefined;
      continue;
    }
    if (otherSection)
      continue;
    if (dash && (item === undefined || indent === item.indent)) {
      const rest = dash[3];
      item = { record: {}, indent, keyIndent: rawLine.length - rest.length };
      records.push(item.record);
      listKey = undefined;
      listItem = undefined;
      const pair = keyValue.exec(rest);
      if (pair !== null) {
        const key = unquote2(pair[1]);
        if (assign(item.record, key, pair[2], indent))
          listKey = key;
      }
      continue;
    }
    if (item === undefined || indent <= item.indent)
      continue;
    if (dash) {
      if (listKey === undefined)
        continue;
      const list = Array.isArray(item.record[listKey]) ? item.record[listKey] : [];
      item.record[listKey] = list;
      const rest = dash[3];
      const flowItem = completeFlowValue(rest);
      listItem = undefined;
      if (flowItem !== undefined) {
        list.push(flowItem.value);
        continue;
      }
      const pair = keyValue.exec(rest);
      if (pair?.[2] !== undefined) {
        listItem = { [unquote2(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        list.push(unquote2(rest));
      }
      continue;
    }
    const pair = keyValue.exec(content);
    if (pair === null)
      continue;
    const key = unquote2(pair[1]);
    if (indent === item.keyIndent) {
      listItem = undefined;
      listKey = assign(item.record, key, pair[2], item.indent) ? key : undefined;
    } else if (listItem !== undefined) {
      assign(listItem, key, pair[2], item.indent);
    }
  }
  return records;
}
function scanSymbolCoordinates(text) {
  const coordinates = {};
  let inCoordinates = false;
  let current;
  for (const rawLine of text.split(/\r?\n/)) {
    const pair = keyValue.exec(rawLine.trim());
    if (pair === null)
      continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const key = unquote2(pair[1]);
    if (indent === 0) {
      inCoordinates = key === "coordinates";
      current = undefined;
      continue;
    }
    if (!inCoordinates)
      continue;
    if (current !== undefined && indent < current.indent)
      continue;
    if (current === undefined || indent === current.indent) {
      coordinates[key] ??= {};
      current = { indent, entry: coordinates[key] };
      continue;
    }
    if (pair[2] === undefined)
      continue;
    const value = unquote2(pair[2]);
    if (key === "sourceFile") {
      const sourceFile = normalizeSourceFile(value);
      if (sourceFile.length > 0)
        current.entry.sourceFile = sourceFile;
      continue;
    }
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric))
      continue;
    if (key === "sourceLine")
      current.entry.line = numeric;
    if (key === "sourceEndLine")
      current.entry.endLine = numeric;
  }
  return coordinates;
}
function toPositiveInt(value) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
function pushUnique(list, value) {
  if (!list.includes(value))
    list.push(value);
}
function normalizeSourceFile(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}
function manifestStateOf(text, recordCount) {
  if (text === undefined)
    return "missing";
  if (recordCount > 0)
    return "indexed";
  const meaningful = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#")).filter((line) => !/^symbols:\s*(\[\s*\])?$/.test(line)).filter((line) => line !== "[]").filter((line) => !/^(?:---|\.\.\.|%\S.*|version:\s*\S+)$/.test(line));
  return meaningful.length === 0 ? "empty" : "unreadable";
}
function buildKnowledgeIndex(records, coordinates = {}, options = {}, manifest = records.length > 0 ? "indexed" : "empty") {
  const files = {};
  let symbolCount = 0;
  const recordedFiles = new Set;
  const coordinateFiles = [];
  for (const entry of Object.values(coordinates)) {
    if (entry.sourceFile !== undefined)
      pushUnique(coordinateFiles, entry.sourceFile);
  }
  coordinateFiles.sort();
  for (const record of records) {
    const id = typeof record.id === "string" ? record.id : undefined;
    const sourceFile = typeof record.sourceFile === "string" ? normalizeSourceFile(record.sourceFile) : undefined;
    if (!id || !sourceFile)
      continue;
    symbolCount += 1;
    recordedFiles.add(sourceFile);
    const symbol = {
      id,
      title: typeof record.title === "string" ? record.title : id,
      implements: [],
      coveredBy: [],
      executableFor: []
    };
    const relate = (type, target) => {
      if (type === "implements")
        pushUnique(symbol.implements, target);
      else if (type === "covered_by")
        pushUnique(symbol.coveredBy, target);
      else if (type === "executable_for")
        pushUnique(symbol.executableFor, target);
    };
    const relateTyped = (relation) => {
      const typed = relation ?? {};
      if (typeof typed.target === "string")
        relate(typed.type, typed.target);
    };
    if (options.legacyLinksAsImplements !== false) {
      let links = [];
      if (typeof record.links === "string")
        links = [record.links];
      else if (Array.isArray(record.links))
        links = record.links;
      for (const link of links) {
        if (typeof link === "string")
          relate("implements", link);
        else
          relateTyped(link);
      }
    }
    if (Array.isArray(record.relationships))
      for (const relation of record.relationships)
        relateTyped(relation);
    if (symbol.implements.length + symbol.coveredBy.length + symbol.executableFor.length === 0) {
      continue;
    }
    const line = toPositiveInt(record.sourceLine) ?? coordinates[id]?.line ?? undefined;
    const endLine = toPositiveInt(record.sourceEndLine) ?? coordinates[id]?.endLine ?? undefined;
    if (line !== undefined)
      symbol.line = line;
    if (endLine !== undefined)
      symbol.endLine = endLine;
    const bucket = files[sourceFile] ?? [];
    bucket.push(symbol);
    files[sourceFile] = bucket;
  }
  const unlinkedFiles = [...recordedFiles].filter((file) => files[file] === undefined).sort();
  return { files, symbolCount, manifest, coordinateFiles, unlinkedFiles };
}
function fileSignature(filePath) {
  try {
    const stats = fs3.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}
function readText2(filePath) {
  try {
    return fs3.readFileSync(filePath, "utf8");
  } catch {}
  return;
}
function writeCacheAtomically(cachePath, payload) {
  try {
    fs3.mkdirSync(path5.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs3.writeFileSync(temporary, payload);
    fs3.renameSync(temporary, cachePath);
  } catch {}
}
function readCachedIndex(cachePath, signature) {
  try {
    const parsed = JSON.parse(String(fs3.readFileSync(cachePath)));
    if (parsed.signature === signature && parsed.index)
      return parsed.index;
  } catch {}
  return;
}
function scanKnowledgeIndex(symbolsPath, coordinatesPath, options) {
  const symbolsText = readText2(symbolsPath);
  const coordinatesText = readText2(coordinatesPath);
  const records = symbolsText === undefined ? [] : scanSymbolsManifest(symbolsText);
  return buildKnowledgeIndex(records, coordinatesText === undefined ? {} : scanSymbolCoordinates(coordinatesText), options, manifestStateOf(symbolsText, records.length));
}
function loadKnowledgeIndex(workspaceRoot, cacheDir, options = {}) {
  const symbolsPath = path5.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path5.join(workspaceRoot, SYMBOL_COORDINATES);
  if (!cacheDir)
    return scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  const legacyMode = options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = path5.join(cacheDir, options.cacheFileName ?? CACHE_FILE);
  const cached = readCachedIndex(cachePath, signature);
  if (cached !== undefined)
    return cached;
  const index = scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  writeCacheAtomically(cachePath, JSON.stringify({ signature, index }));
  return index;
}
var ENTITY_LANES = [
  ["REQ-", "requirements"],
  ["SCEN-", "scenarios"],
  ["TEST-", "tests"],
  ["ADR-", "adr"],
  ["FACT-", "facts"],
  ["FLAG-", "flags"],
  ["EVT-", "events"]
];
var SAFE_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
var MAX_REASON_CHARS = 280;
var REQUIREMENT_READ_BYTES = 65536;
var ENTITY_READ_BYTES = 8192;
var SUMMARY_SCALARS = {
  semantic_text: "statement",
  rationale: "rationale",
  fact_kind: "factKind",
  subject_key: "subjectKey",
  property_key: "propertyKey",
  operator: "operator",
  unit: "unit",
  claim_text: "claimText"
};
var SCALAR_VALUE_FIELDS = new Set([
  "value_string",
  "value_int",
  "value_number",
  "value_bool"
]);
function readScalar(lines, index, raw) {
  const block = /^[>|][+-]?$/.test(raw.trim());
  const parts = block ? [] : [raw.trim()];
  let last = index;
  for (const next of lines.slice(index + 1)) {
    if (next.trim() === "---" || !/^\s+\S/.test(next))
      break;
    if (!block && /^\s+-\s/.test(next))
      break;
    parts.push(next.trim());
    last += 1;
  }
  const joined = parts.join(" ");
  return { value: block ? joined : unquote2(joined), last };
}
function proseExcerpt(lines, maxChars) {
  const prose = lines.map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s/, "").replace(/^\s*>\s?/, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__|`/g, "").trim()).filter((line) => !line.startsWith("|")).join(" ").replace(/\s+/g, " ").trim();
  if (!prose)
    return;
  let excerpt = "";
  for (const sentence of prose.split(/(?<=[.!?]) /)) {
    const next = `${excerpt} ${sentence}`.trim();
    if (excerpt !== "" && Array.from(next).length > maxChars)
      break;
    excerpt = next;
  }
  const chars = Array.from(excerpt);
  return chars.length <= maxChars ? excerpt : `${chars.slice(0, maxChars - 1).join("")}…`;
}
var NO_REASON_STATED = /^reason not stated\b/i;
var REASON_SECTIONS = [
  [/^(?:rationale|why(?! this changed)|context)\b/, "section"],
  [/^why this changed\b/, "why_this_changed"]
];
var CHANGE_NOTE = /^(?:[-*+>]\s*)?(?:split from|superseded by|supersedes|replaces|replaced by)\s/i;
function withoutChangeNotes(lines) {
  return lines.filter((line) => !CHANGE_NOTE.test(line.trim()));
}
function recordedReason(rationale, body) {
  const field = proseExcerpt(withoutChangeNotes([rationale ?? ""]), MAX_REASON_CHARS);
  if (field && !NO_REASON_STATED.test(field))
    return { text: field, from: "rationale" };
  const sections = [];
  let current;
  let fenced = false;
  for (const line of body) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced)
      continue;
    const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      current = [];
      sections.push([heading[1].toLowerCase(), current]);
      continue;
    }
    current?.push(line);
  }
  for (const [pattern, from] of REASON_SECTIONS) {
    const text = sections.filter(([name]) => pattern.test(name)).map(([, content]) => proseExcerpt(withoutChangeNotes(content), MAX_REASON_CHARS)).find((prose) => prose !== undefined && !NO_REASON_STATED.test(prose));
    if (text)
      return { text, from };
  }
  return;
}
var SPEAKING_ORIGINS = new Set(["human", "agent", "import"]);
function firstParagraph(lines) {
  const paragraph = [];
  for (const line of lines) {
    const text = line.trim();
    if (text === "") {
      if (paragraph.length > 0)
        break;
      continue;
    }
    if (/^#{1,6}\s/.test(text)) {
      if (paragraph.length > 0)
        break;
      continue;
    }
    paragraph.push(text);
  }
  return paragraph.join(" ");
}
var MAX_SUMMARY_LINKS = 24;
var RELATIONSHIPS_DIR = ".kb/relationships";
var shardCache = new Map;
function shardPathFor(workspaceRoot, entityId) {
  const shard = createHash("sha256").update(entityId).digest("hex");
  return path5.join(workspaceRoot, RELATIONSHIPS_DIR, `${shard.slice(0, 2)}.yaml`);
}
function shardLinksFrom(workspaceRoot, entityId) {
  const shardPath = shardPathFor(workspaceRoot, entityId);
  const signature = fileSignature(shardPath);
  let cached = shardCache.get(shardPath);
  if (cached?.signature !== signature) {
    const byFrom = new Map;
    const text = readText2(shardPath);
    if (text !== undefined) {
      for (const { type, from, to } of scanRecordSequence(text, "relationships")) {
        if (typeof type !== "string" || typeof to !== "string")
          continue;
        const list = byFrom.get(from) ?? [];
        list.push({ type, target: to });
        byFrom.set(from, list);
      }
    }
    cached = { signature, byFrom };
    shardCache.set(shardPath, cached);
  }
  return cached.byFrom.get(entityId) ?? [];
}
var RETIRED_STATUS = /supersed|deprecat|reject|obsolete|retired|archived|removed/i;
function isRetiredStatus(status) {
  return RETIRED_STATUS.test(String(status));
}
function isCurrentFirmSummary(summary) {
  return summary.firmness === "firm" && !isRetiredStatus(summary.status) && summary.supersededBy === undefined;
}
function shardSupersedes(text) {
  const pick = (records) => records.flatMap(({ type, from, to }) => type === "supersedes" && typeof from === "string" && typeof to === "string" ? [{ from, to }] : []);
  if (!/^relationships:\s*\[/m.test(text)) {
    const blocks = text.split(/\n(?=\s*- )/).filter((block) => block.includes("supersedes"));
    const records = scanRecordSequence(`relationships:
${blocks.map((block) => block.replace(/^relationships:\s*\n/, "")).join(`
`)}
`, "relationships");
    const found = pick(records);
    if (found.length === records.filter((record) => record.type === "supersedes").length)
      return found;
  }
  return pick(scanRecordSequence(text, "relationships"));
}
function currentSuccessors(workspaceRoot) {
  const edges = [];
  const list = (dir, suffix) => {
    try {
      return fs3.readdirSync(path5.join(workspaceRoot, dir)).filter((name) => name.endsWith(suffix)).sort();
    } catch {}
    return [];
  };
  for (const name of list(".kb/requirements", ".md")) {
    const id = name.slice(0, -3);
    const text = readText2(path5.join(workspaceRoot, ".kb/requirements", name));
    if (text === undefined || !text.includes("supersedes"))
      continue;
    for (const link of readSummaryHead(workspaceRoot, id, false).links ?? [])
      if (link.type === "supersedes")
        edges.push({ from: id, to: link.target });
  }
  for (const name of list(RELATIONSHIPS_DIR, ".yaml")) {
    const text = readText2(path5.join(workspaceRoot, RELATIONSHIPS_DIR, name));
    if (text === undefined || !text.includes("supersedes"))
      continue;
    for (const { from, to } of shardSupersedes(text))
      edges.push({ from, to });
  }
  const successors = new Map;
  const retired = new Map;
  for (const { from, to } of edges) {
    if (from === to || successors.has(to) || !from.startsWith("REQ-"))
      continue;
    if (!retired.has(from))
      retired.set(from, isRetiredStatus(readSummaryHead(workspaceRoot, from, false).status));
    if (retired.get(from) === false)
      successors.set(to, from);
  }
  return successors;
}
function supersedingRequirement(workspaceRoot, requirementId) {
  return currentSuccessors(workspaceRoot).get(requirementId);
}
function flushLink(links, pending) {
  if (pending?.target !== undefined) {
    links.push({ type: pending.type ?? "relates_to", target: pending.target });
  } else if (pending?.bare !== undefined) {
    links.push({ type: "relates_to", target: pending.bare });
  }
}
function readEntitySummary(workspaceRoot, entityId) {
  const summary = readSummaryHead(workspaceRoot, entityId);
  if (summary.status === "closed" && entityId.startsWith("REQ-")) {
    const successor = supersedingRequirement(workspaceRoot, entityId);
    if (successor !== undefined)
      summary.supersededBy = successor;
  }
  return summary;
}
function readSummaryHead(workspaceRoot, entityId, withShardLinks = true) {
  const lane = ENTITY_LANES.find(([prefix]) => entityId.startsWith(prefix));
  if (!lane || !SAFE_ENTITY_ID.test(entityId))
    return { id: entityId };
  const requirement = lane[1] === "requirements";
  let head;
  let whole;
  try {
    const descriptor = fs3.openSync(path5.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`), "r");
    try {
      const buffer = Buffer.alloc(requirement ? REQUIREMENT_READ_BYTES : ENTITY_READ_BYTES);
      const bytes = fs3.readSync(descriptor, buffer, 0, buffer.length, 0);
      whole = bytes < buffer.length;
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs3.closeSync(descriptor);
    }
  } catch {
    return { id: entityId };
  }
  const lines = head.split(/\r?\n/);
  if (lines[0].trim() !== "---")
    return { id: entityId };
  const summary = { id: entityId };
  const authored = [];
  const claim = {};
  const values = [];
  let inLinks = false;
  let inValueSet = false;
  let inOrigin = false;
  let originKind;
  const origin = {};
  let rationale;
  let closed = false;
  let bodyStart = lines.length;
  let pending;
  for (let index = 1;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "---") {
      closed = true;
      bodyStart = index + 1;
      break;
    }
    const scalar = /^([a-z_]+):\s*(.*)/.exec(line);
    const scalarField = scalar ? SUMMARY_SCALARS[scalar[1]] : undefined;
    if (scalar && scalarField && scalar[2]) {
      const { value, last } = readScalar(lines, index, scalar[2]);
      if (value !== "") {
        if (scalarField === "statement")
          summary.statement = value;
        else if (scalarField === "rationale")
          rationale = value;
        else
          claim[scalarField] = value;
      }
      index = last;
      flushLink(authored, pending);
      pending = undefined;
      inLinks = false;
      inValueSet = false;
      continue;
    }
    if (scalar && SCALAR_VALUE_FIELDS.has(scalar[1]) && scalar[2]) {
      values.push(unquote2(scalar[2]));
    }
    const flowSet = /^value_set:\s*\[(.*)\]\s*$/.exec(line);
    if (flowSet !== null && flowSet[1].trim()) {
      values.push(...flowSet[1].split(",").map((member) => unquote2(member)));
    }
    if (/^\S/.test(line))
      inValueSet = /^value_set:\s*$/.test(line);
    else if (inValueSet) {
      const member = /^\s*-\s*(.+)/.exec(line);
      if (member)
        values.push(unquote2(member[1]));
    }
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin)
      originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind)
      originKind = nestedKind[1];
    const originField = inOrigin ? /^\s+(approved_by|recorded_at):(.+)/.exec(line) : null;
    if (originField)
      origin[originField[1]] = unquote2(originField[2]);
    if (/^\S/.test(line))
      inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)/.exec(line);
    if (match?.[1] === "title" && match[2])
      summary.title = unquote2(match[2]);
    if (match?.[1] === "status" && match[2])
      summary.status = unquote2(match[2]);
    if (match?.[1] === "firmness" && match[2])
      summary.firmness = unquote2(match[2]);
    if (/^\S/.test(line)) {
      flushLink(authored, pending);
      pending = undefined;
      inLinks = /^links:\s*$/.test(line);
      continue;
    }
    if (!inLinks)
      continue;
    const entry = /^\s*-\s*(.*)/.exec(line);
    if (entry) {
      flushLink(authored, pending);
      pending = {};
    }
    if (!pending)
      continue;
    const body = (entry ? entry[1] : line).trim();
    const field = /^(type|target):\s*(.+)/.exec(body);
    if (field?.[1] === "type")
      pending.type = unquote2(field[2]);
    else if (field?.[1] === "target")
      pending.target = unquote2(field[2]);
    else if (entry && SAFE_ENTITY_ID.test(unquote2(body)))
      pending.bare = unquote2(body);
  }
  flushLink(authored, pending);
  if (summary.firmness === undefined && closed && (lane[1] === "requirements" || lane[1] === "adr"))
    summary.firmness = originKind === "agent" ? "default" : "firm";
  const links = [];
  const seen = new Set;
  for (const link of [
    ...authored,
    ...withShardLinks ? shardLinksFrom(workspaceRoot, entityId) : []
  ]) {
    const key = `${link.type}\x00${link.target}`;
    if (link.target.length === 0 || seen.has(key))
      continue;
    seen.add(key);
    links.push(link);
    if (links.length >= MAX_SUMMARY_LINKS)
      break;
  }
  if (links.length > 0)
    summary.links = links;
  if (values.length > 0)
    claim.values = values;
  if (Object.keys(claim).length > 0)
    summary.claim = claim;
  if (summary.statement === undefined && requirement && closed) {
    const paragraph = firstParagraph(lines.slice(bodyStart));
    if (paragraph)
      summary.statement = paragraph;
  }
  if (requirement && closed) {
    const reason = recordedReason(rationale, lines.slice(bodyStart));
    if (reason) {
      const speaking = SPEAKING_ORIGINS.has(String(originKind));
      const by = origin.approved_by || (speaking ? originKind : undefined);
      const on = /^\d{4}-\d{2}-\d{2}/.exec(String(origin.recorded_at))?.[0];
      summary.why = {
        recorded: true,
        ...reason,
        ...speaking && by ? { by } : {},
        ...speaking && by && on ? { on } : {}
      };
    } else if (whole) {
      summary.why = { recorded: false };
    }
  }
  return summary;
}

// ../agent-core/dist/requirement-candidates.js
var REQUIREMENTS_DIR = path6.join(".kb", "requirements");
var HEAD_BYTES = 4096;
var MAX_SCANNED = 2000;
var MAX_REQUIREMENT_CANDIDATES = 3;
var LAYOUT_WORDS = stems([
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "component",
  "view",
  "screen",
  "package",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "helper",
  "public",
  "static",
  "asset",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "feature",
  "internal",
  "service",
  "test",
  "spec",
  "dist",
  "build",
  "html",
  "htm",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "css",
  "scss",
  "less",
  "json",
  "yaml",
  "yml",
  "java",
  "swift",
  "php"
]);
var FILLER_WORDS = stems([
  "the",
  "and",
  "for",
  "with",
  "must",
  "should",
  "shall",
  "may",
  "can",
  "are",
  "its",
  "their",
  "that",
  "this",
  "from",
  "into",
  "when",
  "each",
  "every",
  "all",
  "not",
  "req",
  "auto"
]);
function words(text) {
  return text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length >= 3 && !/\d/.test(word)).map((word) => word.length > 4 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word) ?? [];
}
function stems(list) {
  return new Set(list.flatMap(words));
}
function pathTopicWords(relativePath) {
  const found = words(relativePath).filter((word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word));
  return [...new Set(found)];
}
function unquote3(value) {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}
function readHead(file) {
  let head;
  try {
    const descriptor = fs4.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs4.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs4.closeSync(descriptor);
    }
  } catch {
    return;
  }
  const lines = head.split(/\r?\n/);
  if (lines[0].trim() !== "---")
    return;
  const fields = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---")
      break;
    const match = /^(id|title|status|semantic_text):(.+)/.exec(line);
    if (match)
      fields[match[1]] = unquote3(match[2]);
  }
  if (!fields.id || !fields.title)
    return;
  const statement = fields.semantic_text?.replace(/''/g, "'");
  return {
    id: fields.id,
    title: fields.title,
    ...fields.status ? { status: fields.status } : {},
    ...statement && !/^[>|]/.test(statement) ? { statement } : {}
  };
}
var RETIRED_STATUS2 = /supersed|deprecat|reject|obsolete|retired|archived|removed/i;
var NOTHING_REPLACED = new Set;
function isClosed(head) {
  return String(head.status).trim().toLowerCase() === "closed";
}
function replacedRequirements(workspaceRoot, requirements, closed) {
  const replaced = new Set;
  for (const head of requirements) {
    if (isClosed(head) || RETIRED_STATUS2.test(String(head.status)))
      continue;
    for (const link of readEntitySummary(workspaceRoot, head.id).links ?? [])
      if (link.type === "supersedes" && closed.has(link.target))
        replaced.add(link.target);
  }
  return replaced;
}
function requestTopicWords(text, limit = 40) {
  const found = words(text).filter((word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word));
  return [...new Set(found)].slice(0, limit);
}
var REQUEST_FILLER_WORDS = stems([
  "please",
  "could",
  "would",
  "you",
  "your",
  "our",
  "have",
  "has",
  "make",
  "sure",
  "change",
  "update",
  "add",
  "fix",
  "now",
  "need",
  "want",
  "like",
  "also",
  "just",
  "then",
  "than",
  "there",
  "here",
  "what",
  "which",
  "why",
  "how",
  "will",
  "use",
  "using",
  "new",
  "file",
  "code",
  "never",
  "always",
  "only",
  "any",
  "but",
  "they",
  "them",
  "was",
  "were",
  "been",
  "being",
  "does",
  "don",
  "doesn",
  "let",
  "get",
  "set",
  "one",
  "out",
  "about",
  "over",
  "same",
  "still",
  "too",
  "very"
]);
function rankRequirementCandidates(relativePath, requirements, limit = MAX_REQUIREMENT_CANDIDATES, requestWords, replaced = NOTHING_REPLACED) {
  const topic = new Set(pathTopicWords(relativePath));
  const request = new Set(requestWords?.filter((word) => !topic.has(word)));
  const scored = [];
  for (const head of requirements) {
    if (RETIRED_STATUS2.test(String(head.status)))
      continue;
    if (replaced.has(head.id))
      continue;
    const titleWords = words(head.title);
    const pathHits = titleWords.filter((word) => topic.has(word));
    const requestHits = titleWords.filter((word) => request.has(word));
    const shared = new Set(pathHits).size;
    const asked = new Set(requestHits).size;
    if (shared > 0 || asked >= 2) {
      scored.push({
        head,
        closed: isClosed(head) ? 1 : 0,
        shared,
        asked,
        uses: pathHits.length + requestHits.length
      });
    }
  }
  scored.sort((a, b) => a.closed - b.closed || b.shared - a.shared || b.asked - a.asked || b.uses - a.uses || a.head.id.localeCompare(b.head.id));
  return scored.slice(0, limit).map((entry) => entry.head);
}
function requirementCandidatesForPath(workspaceRoot, relativePath, limit = MAX_REQUIREMENT_CANDIDATES, requestWords) {
  if (pathTopicWords(relativePath).length === 0 && (requestWords?.length ?? 0) < 2)
    return [];
  const directory = path6.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs4.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED)
    return [];
  const heads = names.map((name) => readHead(path6.join(directory, name))).filter((head) => head !== undefined);
  const closed = new Set(rankRequirementCandidates(relativePath, heads, heads.length, requestWords).filter(isClosed).map((head) => head.id));
  const replaced = closed.size > 0 ? replacedRequirements(workspaceRoot, heads, closed) : NOTHING_REPLACED;
  return rankRequirementCandidates(relativePath, heads, limit, requestWords, replaced);
}
var NEGATION = /\b(?:not|never|no|none|without|cannot|nor)\b|n't\b/i;
var MIN_RESTATED_WORDS = 3;
function ruleWords(text) {
  const found = [
    ...words(text),
    ...text.match(/\d+(?:[.,]\d+)?/g) ?? []
  ].filter((word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word));
  return new Set(found);
}
function restatedRequirement(workspaceRoot, sentence) {
  const asked = ruleWords(sentence);
  if (asked.size < MIN_RESTATED_WORDS)
    return;
  const negated = NEGATION.test(sentence);
  const directory = path6.join(workspaceRoot, REQUIREMENTS_DIR);
  let names;
  try {
    names = fs4.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return;
  }
  if (names.length > MAX_SCANNED)
    return;
  for (const name of names.sort()) {
    const head = readHead(path6.join(directory, name));
    if (head === undefined || isClosed(head))
      continue;
    if (RETIRED_STATUS2.test(String(head.status)))
      continue;
    const title = ruleWords(head.title);
    const clauses = [
      head.title,
      ...(head.statement ?? "").split(/(?<=[.;!?])\s+/)
    ].filter((clause) => clause.trim() !== "");
    for (const clause of clauses) {
      if (NEGATION.test(clause) !== negated)
        continue;
      const known = new Set([...title, ...ruleWords(clause)]);
      if ([...asked].every((word) => known.has(word)))
        return head;
    }
  }
  return;
}

// ../agent-core/dist/snippets.js
import { createHash as createHash2 } from "node:crypto";
import fs5 from "node:fs";
import path7 from "node:path";
var MAX_REQUIREMENTS = 4;
var MAX_SYMBOLS_PER_REQUIREMENT = 3;
var MAX_TESTS = 3;
var MAX_TITLE = 80;
var MAX_GROUNDING = 2;
var MAX_CLAIM = 160;
var MAX_WHY_CHARS = 240;
var SHORT_WHY_CHARS = 160;
var TIGHT_WHY_CHARS = 100;
var MAX_FOCUS_SCAN_BYTES = 2 * 1024 * 1024;
var MAX_SNIPPET_CHARS = 1200;
function truncate(text, limit) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function overlaps(symbol, range) {
  const line = Number(symbol.line);
  return line <= range.end && Number(symbol.endLine ?? line) >= range.start;
}
function span(symbol) {
  return Number(symbol.endLine ?? symbol.line) - Number(symbol.line);
}
function focusedSymbols(symbols, focus) {
  if (!focus)
    return [];
  return symbols.filter((symbol) => focus.some((range) => overlaps(symbol, range))).sort((left, right) => span(left) - span(right));
}
function editFocus(absolutePath, toolInput) {
  const input = toolInput ?? {};
  const edits = Array.isArray(input.edits) ? input.edits : [];
  const usable = [input, ...edits.map((edit) => edit ?? {})].flatMap((record) => [record.old_string, record.oldString].map((needle) => ({
    needle,
    all: record.replace_all === true || record.replaceAll === true
  }))).filter((entry) => typeof entry.needle === "string" && entry.needle.length > 0);
  if (usable.length === 0)
    return;
  let content;
  try {
    if (fs5.statSync(absolutePath).size > MAX_FOCUS_SCAN_BYTES)
      return;
    content = fs5.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }
  const ranges = [];
  for (const { needle, all } of usable) {
    let offset = content.indexOf(needle);
    while (offset >= 0) {
      const start = content.slice(0, offset).split(`
`).length;
      ranges.push({ start, end: start + needle.split(`
`).length - 1 });
      if (!all)
        break;
      offset = content.indexOf(needle, offset + needle.length);
    }
  }
  return ranges.length > 0 ? ranges : undefined;
}
function formatList(items, limit) {
  const shown = items.slice(0, limit).join(", ");
  return items.length > limit ? `${shown} +${items.length - limit}` : shown;
}
function describeEntity(summary, supersededBy) {
  const successor = supersededBy ?? summary.supersededBy;
  const retired = successor ? ` (${summary.status ?? "closed"}, superseded by ${successor})` : isRetiredStatus(summary.status) ? ` (${summary.status})` : "";
  const firmness = !retired && (summary.firmness === "firm" || summary.firmness === "exploratory") ? summary.firmness === "firm" ? " [firm: ask before changing]" : " [exploratory]" : "";
  const notable = `${retired}${firmness}`;
  const title = displayTitle(summary);
  return title ? `${summary.id}${notable}: ${truncate(title, MAX_TITLE)}` : `${summary.id}${notable}`;
}
function displayTitle(summary) {
  const { title, statement } = summary;
  if (!title || !statement?.startsWith(title))
    return title;
  const rest = statement.slice(title.length);
  if (!/^\.\S/.test(rest))
    return title;
  const end = rest.search(/[.!?](?:\s|$)/);
  return end === -1 ? statement : statement.slice(0, title.length + end);
}
function jsonString(value) {
  return JSON.stringify(value);
}
function unownedSourceNote(relativePath, candidates = []) {
  const head = `Kibi: no symbol in ${relativePath} is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.`;
  const search = `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) surfaces requirements that may already describe it; new behavior is recorded with kb_record (statement, why, who said it, code) as part of the change.`;
  for (let shown = candidates.length;shown > 0; shown--) {
    const named = candidates.slice(0, shown).map((candidate) => `${candidate.id}: ${truncate(candidate.title, MAX_TITLE)}`);
    const note = [
      head,
      `Requirements whose titles share words with this path or the request: ${named.join("; ")}. kb_query({id:${jsonString(candidates[0].id)}}) shows whether one describes the behavior being changed; one that does is traced by an implements link from the symbol that implements it (for markup, the component that renders it).`,
      search
    ].join(`
`);
    if (note.length <= MAX_SNIPPET_CHARS)
      return note;
  }
  if (candidates.length > 0)
    return [head, search].join(`
`);
  return [
    head,
    "No requirement title matches this file, so nothing recorded is known to cover it.",
    `kb_search({query:"<behavior being changed>", sourceLocations:[{path:${jsonString(relativePath)}}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_record (statement, why, who said it, code) before the work is reported done.`
  ].join(`
`);
}
function unreadableManifestNote(relativePath) {
  return [
    "Kibi: the hook could not read .kb/symbols.yaml, so requirement snippets are unavailable this session.",
    `kb_query({sourceFile:${jsonString(relativePath)}}) still lists what ${relativePath} implements; \`kibi sync\` rewrites the manifest in the canonical block layout.`
  ].join(`
`);
}
function impactCheckLine(relativePath) {
  return `Behavior changes here are traced to these requirements; kb_check({changed:true, sourceFiles:[${jsonString(relativePath)}]}) gives the commit gate's verdict on the edit.`;
}
var GROUNDING_LINK_TYPES = [
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule"
];
var PROPERTY_VERBS = {
  calls: "call",
  imports: "import",
  reads: "read",
  uses: "use",
  throws: "throw"
};
var OPERATOR_PHRASES = {
  eq: "must be",
  neq: "must not be",
  lt: "must be less than",
  lte: "must be at most",
  gt: "must be greater than",
  gte: "must be at least",
  matches: "must match",
  includes: "must include",
  subset_of: "must be within",
  excludes: "must not include"
};
function joinMembers(values, conjunction) {
  if (values.length === 1)
    return values[0];
  return `${values.slice(0, -1).join(", ")} ${conjunction} ${values.at(-1)}`;
}
var MODAL = /^(.{1,100}?)\s+(?:must|may|can|cannot|should|shall|will|never)\b/i;
function subjectPhrase(claim) {
  const spoken = MODAL.exec(String(claim.claimText))?.[1];
  if (spoken)
    return spoken;
  return claim.subjectKey?.replace(/[._]+/g, " ").trim() || undefined;
}
function factClaimSentence(summary) {
  const claim = summary.claim;
  if (!claim || claim.factKind === "subject")
    return;
  const values = claim.values ?? [];
  if (claim.propertyKey && claim.operator && values.length > 0) {
    const subject = subjectPhrase(claim);
    if (!subject)
      return claim.claimText;
    const verb = PROPERTY_VERBS[claim.propertyKey];
    const verbal = verb ? {
      excludes: `must not ${verb} ${joinMembers(values, "or")}`,
      includes: `must ${verb} ${joinMembers(values, "and")}`,
      subset_of: `may ${verb} only ${joinMembers(values, "or")}`,
      eq: `must ${verb} exactly ${joinMembers(values, "and")}`
    }[claim.operator] : undefined;
    if (verbal)
      return `${subject} ${verbal}`;
    const phrase = OPERATOR_PHRASES[claim.operator];
    if (phrase) {
      const property = claim.propertyKey.replace(/_+/g, " ");
      const unit = claim.unit ? ` ${claim.unit}` : "";
      return `${subject}: ${property} ${phrase} ${values.join(", ")}${unit}`;
    }
  }
  return claim.claimText;
}
function groundingText(summary) {
  if (summary.claim?.factKind === "subject")
    return;
  return factClaimSentence(summary) ?? summary.title;
}
function withoutClosingStop(text) {
  return text.replace(/[.\s]+$/, "");
}
var REASON_LABELS = {
  rationale: "rationale",
  why_this_changed: "Why this changed",
  section: "context section"
};
function reasonLine(summary, maxChars = MAX_WHY_CHARS, requirementId) {
  const why = summary.why;
  if (!why)
    return;
  const of = requirementId ? ` for ${requirementId}` : "";
  if (!why.recorded)
    return `Why: no reason is recorded${of}.`;
  const text = proseExcerpt([why.text], maxChars);
  const said = why.by ? `; ${why.by}${why.on ? `, ${why.on}` : ""}` : "";
  const owner = requirementId ? `${requirementId} ` : "";
  return `Why: ${withoutClosingStop(text)} (${owner}${REASON_LABELS[why.from]}${said}).`;
}
function requirementGroundingLines(requirementId, summarize, options = {}) {
  const maxFacts = options.maxFacts ?? MAX_GROUNDING;
  const whyChars = options.whyChars ?? MAX_WHY_CHARS;
  const requirement = summarize(requirementId);
  if (isRetiredStatus(requirement.status) || requirement.supersededBy !== undefined)
    return [];
  const links = requirement.links ?? [];
  const facts = [
    ...new Set(links.filter((link) => GROUNDING_LINK_TYPES.includes(link.type)).map((link) => link.target))
  ];
  const adrs = [
    ...new Set(links.filter((link) => link.target.startsWith("ADR-")).map((link) => link.target))
  ];
  const lines = [];
  if (facts.length > 0) {
    const claims = [
      ...new Set(facts.map((id) => groundingText(summarize(id))).filter((sentence) => Boolean(sentence)).map(withoutClosingStop))
    ];
    const statement = requirement.statement ? withoutClosingStop(requirement.statement) : undefined;
    const shown = claims.length > 0 ? claims.slice(0, maxFacts) : statement ? [statement] : [];
    const more = claims.length > maxFacts ? ` +${claims.length - maxFacts} more` : "";
    if (shown.length > 0) {
      lines.push(`${requirementId} must keep true: ${shown.map((claim) => truncate(claim, MAX_CLAIM)).join("; ")}${more}.`);
    }
  }
  const why = whyChars > 0 ? reasonLine(requirement, whyChars, requirementId) : undefined;
  if (why)
    lines.push(why);
  const adr = adrs[0];
  if (adr)
    lines.push(`Decision: ${describeEntity(summarize(adr))}.`);
  return lines;
}
function implementedRequirementIds(symbols) {
  return [...new Set(symbols.flatMap((symbol) => symbol.implements))];
}
function createEntitySummarizer(workspaceRoot) {
  const summaries = new Map;
  return (entityId) => {
    let summary = summaries.get(entityId);
    if (!summary) {
      summary = readEntitySummary(workspaceRoot, entityId);
      summaries.set(entityId, summary);
    }
    return summary;
  };
}
function replacedAmong(requirementIds, summarize) {
  const listed = new Set(requirementIds);
  const replaced = new Map;
  for (const id of requirementIds) {
    const summary = summarize(id);
    if (summary.supersededBy !== undefined && !replaced.has(id))
      replaced.set(id, summary.supersededBy);
    if (summary.status === "closed" || isRetiredStatus(summary.status))
      continue;
    for (const link of summary.links ?? [])
      if (link.type === "supersedes" && link.target !== id && listed.has(link.target) && !replaced.has(link.target))
        replaced.set(link.target, id);
  }
  return replaced;
}
function currentFirstOwners(symbols, focus, summarize) {
  const { owners, requirementIds } = requirementOwners(symbols, focus);
  const replaced = replacedAmong(requirementIds, summarize);
  return {
    owners,
    requirementIds: [
      ...requirementIds.filter((id) => !replaced.has(id)),
      ...requirementIds.filter((id) => replaced.has(id))
    ],
    replaced
  };
}
function requirementOwners(symbols, focus) {
  const owners = new Map;
  const ordered = new Set([...focus, ...symbols]);
  for (const symbol of ordered) {
    for (const requirement of symbol.implements) {
      const titles = owners.get(requirement) ?? [];
      if (!titles.includes(symbol.title))
        titles.push(symbol.title);
      owners.set(requirement, titles);
    }
  }
  const focusOwners = new Set(focus.flatMap((symbol) => symbol.implements));
  const requirementIds = [...owners.keys()].sort((left, right) => {
    const focusOrder = Number(focusOwners.has(right)) - Number(focusOwners.has(left));
    return focusOrder !== 0 ? focusOrder : owners.get(right).length - owners.get(left).length;
  });
  return { owners, requirementIds };
}
var SNIPPET_LAYOUTS = [
  {
    requirements: MAX_REQUIREMENTS,
    facts: MAX_GROUNDING,
    whyChars: MAX_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 3,
    facts: MAX_GROUNDING,
    whyChars: MAX_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 2,
    facts: 1,
    whyChars: MAX_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 2,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: true,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: SHORT_WHY_CHARS,
    tests: false,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: TIGHT_WHY_CHARS,
    tests: false,
    moreIds: true
  },
  {
    requirements: 1,
    facts: 1,
    whyChars: TIGHT_WHY_CHARS,
    tests: false,
    moreIds: false
  }
];
function fitLayouts(compose, maxChars) {
  const texts = SNIPPET_LAYOUTS.map(compose);
  const fits = texts.find((text) => text.length <= maxChars);
  return fits ?? truncate(texts.at(-1), maxChars);
}
function fileKnowledgeSnippet(input) {
  const { relativePath, symbols, surface, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { owners, requirementIds, replaced } = currentFirstOwners(symbols, focus, summarize);
  const tests = [
    ...new Set(symbols.flatMap((symbol) => symbol.coveredBy))
  ].sort();
  const executes = [
    ...new Set(symbols.flatMap((symbol) => symbol.executableFor))
  ].sort();
  if (owners.size === 0 && tests.length === 0 && executes.length === 0) {
    return;
  }
  const leadId = requirementIds[0];
  const primaryFocus = focus[0];
  const compose = (layout) => {
    const lines = [
      `Kibi knowledge for ${relativePath} (symbol manifest):`
    ];
    for (const requirementId of requirementIds.slice(0, layout.requirements)) {
      const symbolTitles = owners.get(requirementId);
      lines.push(`- ${describeEntity(summarize(requirementId), replaced.get(requirementId))} — ${formatList(symbolTitles, MAX_SYMBOLS_PER_REQUIREMENT)}`);
    }
    if (requirementIds.length > layout.requirements) {
      const rest = requirementIds.slice(layout.requirements);
      lines.push(layout.moreIds ? `- Also linked (${rest.length} more): ${rest.join(", ")}; kb_query({sourceFile:${jsonString(relativePath)}, type:"req"}) lists them` : `- +${rest.length} more requirements: kb_query({sourceFile:${jsonString(relativePath)}, type:"req"})`);
    }
    const grounding = surface === "edit" && leadId ? requirementGroundingLines(leadId, summarize, {
      maxFacts: layout.facts,
      whyChars: layout.whyChars
    }) : [];
    lines.push(...grounding);
    if (layout.tests && tests.length > 0) {
      lines.push(`Covered by: ${formatList(tests, MAX_TESTS)}.`);
    }
    if (layout.tests && executes.length > 0) {
      lines.push(`Test code for: ${formatList(executes, MAX_TESTS)}.`);
    }
    if (primaryFocus) {
      const owner = primaryFocus.implements[0];
      const verb = surface === "edit" ? "The edit is inside" : "These lines are inside";
      lines.push(owner ? `${verb} ${primaryFocus.title}, which implements ${owner}.` : `${verb} ${primaryFocus.title}.`);
    }
    const location = primaryFocus ? `{path:${jsonString(relativePath)}, symbol:${jsonString(primaryFocus.title)}}` : `{path:${jsonString(relativePath)}}`;
    const reasonShown = grounding.some((line) => line.startsWith("Why: "));
    const next = [
      leadId ? `kb_query({id:${jsonString(leadId)}, includeBody:true}) returns the full requirement text${reasonShown ? "" : " and why it exists"}` : undefined,
      `kb_search({query:"<topic>", sourceLocations:[${location}]}) answers with governing requirements, facts, decisions, and tests`
    ].filter((part) => part !== undefined);
    lines.push(`Next layer: ${next.join("; ")}.`);
    if (surface === "edit")
      lines.push(impactCheckLine(relativePath));
    return lines.join(`
`);
  };
  return fitLayouts(compose, input.maxChars ?? MAX_SNIPPET_CHARS);
}
function editKnowledgeUpdate(input) {
  const { relativePath, symbols, summarize } = input;
  const focus = focusedSymbols(symbols, input.focus);
  const { requirementIds } = currentFirstOwners(symbols, focus, summarize);
  const leadId = requirementIds[0];
  const lines = [];
  const focused = focusUpdate(relativePath, symbols, input.focus);
  if (focused) {
    lines.push(focused);
  } else if (leadId) {
    lines.push(`Kibi: this edit to ${relativePath} changes code that implements ${formatList(requirementIds, 2)}.`);
  }
  if (!leadId)
    return lines[0];
  return fitLayouts((layout) => [
    ...lines,
    ...requirementGroundingLines(leadId, summarize, {
      maxFacts: layout.facts,
      whyChars: layout.whyChars
    }),
    impactCheckLine(relativePath)
  ].join(`
`), input.maxChars ?? MAX_SNIPPET_CHARS);
}
function focusUpdate(relativePath, symbols, focus) {
  const symbol = focusedSymbols(symbols, focus)[0];
  if (!symbol)
    return;
  const owners = symbol.implements.length > 0 ? `, which implements ${formatList(symbol.implements, 2)}` : "";
  return `Kibi: this edit to ${relativePath} is inside ${symbol.title}${owners}.`;
}
function claimSnippetSlot(stateDir, key) {
  if (!stateDir)
    return true;
  const marker = path7.join(stateDir, "shown-snippets", createHash2("sha256").update(key).digest("hex").slice(0, 32));
  try {
    fs5.mkdirSync(path7.dirname(marker), { recursive: true });
    fs5.writeFileSync(marker, "", { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

// ../agent-core/dist/decision-guard.js
var CONFIRM_FIRM_EDITS_ENV = "KIBI_CONFIRM_FIRM_EDITS";
function confirmFirmEdits(env) {
  const value = env[CONFIRM_FIRM_EDITS_ENV]?.trim().toLowerCase();
  return !(value === "0" || value === "false" || value === "off");
}
var MAX_LOCATE_BYTES = 2 * 1024 * 1024;
var CODE_NAME = /^[A-Za-z_$][\w$]*(?:[.#:][A-Za-z_$][\w$]*)*$/;
var NAME_LOOKAHEAD_LINES = 5;
function readSmallText(absolutePath) {
  try {
    if (fs6.statSync(absolutePath).size > MAX_LOCATE_BYTES)
      return;
    return fs6.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }
}
function unlocatedSymbols(symbols, content) {
  const lines = content?.split(`
`);
  return symbols.filter((symbol) => {
    if (symbol.line === undefined)
      return true;
    if (lines === undefined)
      return false;
    const end = symbol.endLine ?? symbol.line;
    if (end > lines.length)
      return true;
    if (!CODE_NAME.test(symbol.title))
      return false;
    if (symbol.line === 1 && end >= lines.length - 1)
      return false;
    const name = symbol.title.split(/[.#:]/).pop();
    const window = lines.slice(symbol.line - 1, Math.min(end, symbol.line + NAME_LOOKAHEAD_LINES)).join(`
`);
    return !window.includes(name);
  });
}
function firmRequirementsTouched(input) {
  if (input.commentOnly === true)
    return { ids: [], symbol: undefined };
  const unlocated = input.wholeFile ? [] : unlocatedSymbols(input.symbols, input.absolutePath === undefined ? undefined : readSmallText(input.absolutePath));
  const touched = input.wholeFile ? input.symbols : [
    ...focusedSymbols(input.symbols.filter((symbol) => !unlocated.includes(symbol)), input.focus),
    ...unlocated
  ];
  const ids = implementedRequirementIds(touched).filter((id) => {
    if (input.confirmed?.has(id))
      return false;
    const summary = input.summarize(id);
    if (!isCurrentFirmSummary(summary))
      return false;
    const reviewed = input.reviewed;
    if (reviewed === undefined)
      return true;
    return !touched.filter((symbol) => symbol.implements.includes(id)).every((symbol) => reviewed(id, symbol));
  });
  return { ids, symbol: input.wholeFile ? undefined : touched[0] };
}
var MAX_COMMENT_ONLY_BYTES = 2 * 1024 * 1024;
var DEAD_IMPLEMENTS_LINE = /^\s*(?:\/\/+|#+|%+|\/\*+|\*|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;
function isDeadImplementsComment(line) {
  return DEAD_IMPLEMENTS_LINE.test(line);
}
var TRAILING_DEAD_IMPLEMENTS = /^\s*(?:\/\/+|#+|%+|\/\*+|--)\s*(?:implements|Implements|IMPLEMENTS)(?:\s*:\s*|\s+)[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+(?:\s*,\s*[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+)*\s*(?:\*\/)?\s*$/;
function quotesClosed(code) {
  const unescaped = code.replace(/\\./g, "");
  return ["'", '"', "`"].every((quote) => unescaped.split(quote).length % 2 === 1);
}
function removesTrailingDeadImplementsComment(before, after) {
  const code = after.trimEnd();
  if (code === "" || !before.startsWith(code))
    return false;
  const cut = before.slice(code.length);
  if (!TRAILING_DEAD_IMPLEMENTS.test(cut))
    return false;
  if (!/^\s/.test(cut) && !code.endsWith(";"))
    return false;
  return quotesClosed(code);
}
function removesOnlyDeadComments(before, after) {
  const kept = before.split(`
`);
  const wanted = after.split(`
`);
  let removed = 0;
  let next = 0;
  for (const line of kept) {
    const target = wanted[next];
    if (target === line) {
      next += 1;
    } else if (isDeadImplementsComment(line)) {
      removed += 1;
    } else if (target !== undefined && removesTrailingDeadImplementsComment(line, target)) {
      removed += 1;
      next += 1;
    } else {
      return false;
    }
  }
  return removed > 0 && next === wanted.length;
}
var PATCH_SECTION_HEADER = /^\*\*\* (Update|Add|Delete) File: (.+)$/;
function parsePatchSections(patch) {
  const lines = patch.trim().split(/\r?\n/);
  if (lines[0]?.trim() !== "*** Begin Patch")
    return;
  if (lines.at(-1)?.trim() !== "*** End Patch")
    return;
  const sections = [];
  let current;
  for (const line of lines.slice(1, -1)) {
    const header = PATCH_SECTION_HEADER.exec(line.trim());
    if (header?.[1] && header[2]) {
      current = {
        kind: header[1],
        path: normalizeWorkspacePath(header[2]),
        lines: []
      };
      sections.push(current);
    } else if (current === undefined) {
      return;
    } else {
      current.lines.push(line);
    }
  }
  return sections;
}
function patchSectionRemovesOnlyDeadComments(section) {
  if (section.kind !== "Update")
    return false;
  let removed = 0;
  const lines = section.lines;
  for (let index = 0;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("-")) {
      const replacement = lines[index + 1];
      if (isDeadImplementsComment(line.slice(1))) {
        removed += 1;
      } else if (replacement?.startsWith("+") && removesTrailingDeadImplementsComment(line.slice(1), replacement.slice(1))) {
        removed += 1;
        index += 1;
      } else {
        return false;
      }
    } else if (!(line.startsWith(" ") || line.startsWith("@@") || line === "" || line === "*** End of File")) {
      return false;
    }
  }
  return removed > 0;
}
function patchesRemoveOnlyDeadComments(absolutePath, patches, base) {
  const target = path8.resolve(absolutePath);
  const relevant = [];
  for (const patch of patches) {
    const sections = parsePatchSections(patch);
    if (sections === undefined)
      return false;
    relevant.push(...base === undefined ? sections : sections.filter((section) => path8.resolve(base, section.path) === target));
  }
  return relevant.length > 0 && relevant.every(patchSectionRemovesOnlyDeadComments);
}
function removesOnlyDeadImplementsComments(absolutePath, toolInput, base) {
  const input = toolInput ?? {};
  const records = Array.isArray(input.edits) ? [input, ...input.edits.map((edit) => edit ?? {})] : [input];
  const pairs = [];
  for (const entry of records) {
    const before = entry.old_string ?? entry.oldString;
    const after = entry.new_string ?? entry.newString;
    if (before === undefined && after === undefined)
      continue;
    if (typeof before !== "string" || typeof after !== "string")
      return false;
    pairs.push([before, after]);
  }
  const patches = extractPatchTexts(toolInput);
  if (patches.length > 0) {
    return pairs.length === 0 && input.content === undefined && patchesRemoveOnlyDeadComments(absolutePath, patches, base);
  }
  if (pairs.length === 0) {
    if (typeof input.content !== "string")
      return false;
    try {
      if (fs6.statSync(absolutePath).size > MAX_COMMENT_ONLY_BYTES)
        return false;
      pairs.push([fs6.readFileSync(absolutePath, "utf8"), input.content]);
    } catch {
      return false;
    }
  }
  return pairs.every(([before, after]) => removesOnlyDeadComments(before, after));
}
function firmEditConfirmation(where, requirements) {
  const shown = requirements.slice(0, 2).map((summary) => summary.title ? `${summary.id}: ${summary.title}` : summary.id);
  const more = requirements.length > shown.length ? ` (+${requirements.length - shown.length} more)` : "";
  const noun = requirements.length === 1 ? "a firm requirement" : "firm requirements";
  const named = `${shown.join("; ")}${more}`.replace(/\.+$/, "");
  return `Kibi: this edit changes ${where}, which implements ${noun} recorded in the knowledge base: ${named}. Allow it if the change keeps ${requirements.length === 1 ? "that requirement" : "them"}, or if you mean to change ${requirements.length === 1 ? "the requirement" : "them"} too.`;
}
function firmEditContext(ids) {
  const named = ids.slice(0, 2).join(", ");
  return [
    `Kibi asked the person to confirm this edit because it changes code that implements firm ${ids.length === 1 ? "requirement" : "requirements"} ${named}.`,
    "If the person declined the edit, the requirement stands: name it and ask the person how to proceed, rather than reaching the same change another way. If it was allowed and the change alters what the requirement says, the requirement is updated with kb_upsert in this change. " + `If nobody could answer and the edit keeps the requirement, record verdict "keeps" for that symbol with kb_review_firm_edit (CLI: kibi review-firm-edit) and retry: a keeps receipt recorded after this question lets the retry of this edit through in this session; a later session is asked again. kibi check --staged blocks the commit until each edited symbol has a current keeps receipt, so record one after the edit too. A receipt is your own judgment: record it without asking the person to approve it; kibi signoff lists it as yours.`
  ].join(`
`);
}
var RULE_PHRASES = /\b(?:from now on|going forward|must(?:n['’]t| not)?|should (?:always|never)(?!\s+have\b)|is not allowed|are not allowed|not be allowed|only (?:allow|admins?|owners?)|is required|are required|has to|have to)\b/gi;
var DESCRIBING_FRAME = /\b(?:bug|issue|problem|regression|error|crash)\s+(?:where|when|that|in which)\b|\b(?:which|whether|what)\s+(?:of\s+)?[\w'’-]+\s+$/i;
var SPEAKER_FRAME = /\bI\s+$/;
var SPEAKER_PHRASE = /^ha(?:s|ve) to$/i;
var CLAUSE_BREAK = /[;:]|,\s*(?:(?:and|but|so)\s+)?|\b(?:and|but)\s+/gi;
function currentClause(prefix) {
  let start = 0;
  for (const match of prefix.matchAll(CLAUSE_BREAK))
    start = match.index + match[0].length;
  return prefix.slice(start);
}
var IMPERATIVE_ADVERB = /(?:^|[;:,(]\s*|\b(?:and|but|so|then|please|also|let['’]?s|let us)\s+)(never|always)\b(?!-)(?!\s+mind\b)/i;
var ASKING_ADVERB = /(?:\b(?:make sure|ensure)(?:\s+that)?(?:\s+[\w'’-]+){0,3}?\s+|\b(?:remember|need|want|be sure|try) to\s+|\b(?:may|shall|can)\s+(?=never)|\b(?:we|you)\s+(?=(?:never|always)\s+(?:want|need) to\b))(never|always)\b(?!-)/i;
var DESCRIBING_NEXT_WORD = /^\s+(?:a|an|the|have been|has|had|been|was|were|is|are|am|did|does|\w+ed|\w*[^s\W]s)\b/i;
var REQUEST_QUESTION = /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\b/i;
var ASKS_TO_BE_TOLD = /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\s+(?:tell|explain|show)\b/i;
var CODE_SPANS = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g;
var LINE_MARKERS = /^(?:[-*+#]+\s+|\d+[.)]\s+)+/;
var PASTED_OUTPUT_LINE = /^\s*(?:[\w.$]*Error:|[\w.$]+Exception:|(?:[Ee]rror|ERROR|[Ww]arning|WARNING|[Ff]atal|FATAL|[Pp]anic|PANIC)\s*[:[]|at\s+\S+\s+\(\S*:\d+)/;
var QUOTED_WORDS = /(?<!\w)'[^'\n]+'(?!\w)|‘[^’\n]*’/g;
var MIN_QUOTED_RULE_WORDS = 4;
function quotedRule(span) {
  const words = span.split(/\s+/).filter((word) => /\w/.test(word));
  return words.length >= MIN_QUOTED_RULE_WORDS && new RegExp(RULE_PHRASES.source, "i").test(span);
}
var EMPHASIS = /\*+|(?<!\w)_+|_+(?!\w)/g;
function requestLines(text) {
  const lines = [];
  let previous = "blank";
  for (const line of text.split(`
`)) {
    if (/^(?: {4}|\t)/.test(line) && previous !== "text") {
      previous = "code";
      continue;
    }
    previous = line.trim() === "" ? "blank" : "text";
    if (/^\s*>/.test(line) || PASTED_OUTPUT_LINE.test(line))
      continue;
    lines.push(line.trim().replace(LINE_MARKERS, "").replace(EMPHASIS, ""));
  }
  return lines;
}
function requestSentences(prompt) {
  return requestLines(prompt.replace(CODE_SPANS, " ")).map((line) => line.replace(QUOTED_WORDS, (span) => quotedRule(span) ? span : " ")).flatMap((line) => line.split(/(?<=[.!?])\s/)).map((sentence) => sentence.trim());
}
function instructingAdverb(sentence) {
  const asked = ASKING_ADVERB.exec(sentence);
  if (asked)
    return asked[1].toLowerCase();
  const pattern = new RegExp(IMPERATIVE_ADVERB.source, "gi");
  for (const match of sentence.matchAll(pattern)) {
    const rest = sentence.slice(match.index + match[0].length);
    if (!DESCRIBING_NEXT_WORD.test(rest))
      return match[1].toLowerCase();
  }
  return;
}
function ruleMatch(prompt, workspaceRoot) {
  const sentences = requestSentences(prompt);
  for (const [index, sentence] of sentences.entries()) {
    if (sentence.endsWith("?") && (!REQUEST_QUESTION.test(sentence) || ASKS_TO_BE_TOLD.test(sentence)))
      continue;
    if (workspaceRoot !== undefined && restatedRequirement(workspaceRoot, sentence) !== undefined)
      continue;
    for (const match of sentence.matchAll(RULE_PHRASES)) {
      const clause = currentClause(sentence.slice(0, match.index));
      if (DESCRIBING_FRAME.test(clause))
        continue;
      if (SPEAKER_PHRASE.test(match[0]) && SPEAKER_FRAME.test(clause))
        continue;
      return { phrase: match[0].toLowerCase(), sentences, index };
    }
    const adverb = instructingAdverb(sentence);
    if (adverb)
      return { phrase: adverb, sentences, index };
  }
  return;
}
function statedRule(prompt, workspaceRoot) {
  return ruleMatch(prompt, workspaceRoot)?.phrase;
}
var REASON_MARKER = /\b(?:because|so that)\b/i;
var MAX_REASON_CHARS2 = 200;
function statedReason(prompt, workspaceRoot) {
  const match = prompt === undefined ? undefined : ruleMatch(prompt, workspaceRoot);
  if (match === undefined)
    return;
  for (const sentence of match.sentences.slice(match.index, match.index + 2)) {
    const marker = REASON_MARKER.exec(sentence);
    if (marker === null)
      continue;
    const reason = sentence.slice(marker.index).replace(/[.!]+$/, "");
    return reason.length > MAX_REASON_CHARS2 ? `${reason.slice(0, MAX_REASON_CHARS2 - 1).trimEnd()}…` : reason;
  }
  return;
}
function reasonLine2(reason) {
  return `The request gives its reason ("${reason}"): put that reason in the why field, in the person's words.`;
}
function rulePromptNote(phrase, reason) {
  return [
    `Kibi: this request reads as a rule or decision (it says "${phrase}").`,
    "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new rule is recorded with kb_record (the statement, the person's reason, saidBy user and the code that enforces it; a changed one with kb_upsert) as part of this change, not after it.",
    ...reason === undefined ? [] : [reasonLine2(reason)]
  ].join(`
`);
}
var RECORD_FOLLOW_UP_LINE = "kb_record returns every step left before kb_check passes (nextActions) and every approval only the person can give (approvalsNeeded) at once: do the steps in this change, and put all the approvals to the person in one question, not one per check result.";
function captureReminder(rulePhrase) {
  return rulePhrase === undefined ? [
    "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    `A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_record (statement, why, who said it and the code that implements it) before the work is reported done; when there was none, the final report says so in one line. ${RECORD_FOLLOW_UP_LINE}`
  ].join(`
`) : [
    `Kibi: the person's request said "${rulePhrase}", this session changed source files, and nothing was recorded in the knowledge base.`,
    `Record the rule behind "${rulePhrase}" with kb_record (statement, why, who said it and the code that implements it) before the work is reported done, or say in the final report why "${rulePhrase}" is not a rule. ${RECORD_FOLLOW_UP_LINE}`
  ].join(`
`);
}
function ruleCaptureTemplate(rulePhrase, reason) {
  const template = {
    statement: "<the rule as one shall or must sentence>",
    why: reason === undefined ? "<why the person wants it, in their words; 'Reason not stated' if they gave none>" : "<the person's reason, in their words>",
    saidBy: "user",
    quote: "<the person's words, quoted>",
    code: [
      { file: "<file you changed>", symbol: "<function that enforces it>" }
    ]
  };
  return [
    `Kibi: the request said "${rulePhrase}" and this session now changes source files. Record that rule in this change with one kb_record call (without MCP: kibi record --input -); fill in this template:`,
    JSON.stringify(template),
    ...reason === undefined ? [] : [reasonLine2(reason)],
    RECORD_FOLLOW_UP_LINE,
    "Facts, decisions and other modeling go through kb_upsert."
  ].join(`
`);
}
var UNATTRIBUTED = "unattributed";
var UNATTRIBUTED_IDLE_MS = 2 * 60 * 60 * 1000;
var STALE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
function sessionKey(session) {
  return createHash3("sha256").update(session.sessionId?.trim() || UNATTRIBUTED).digest("hex").slice(0, 32);
}
function guardRoot(session) {
  if (!session.stateDir)
    throw new Error;
  return path8.join(session.stateDir, "decision-guard");
}
function sessionPath(session, name) {
  return path8.join(guardRoot(session), sessionKey(session), name);
}
function newestOf(files) {
  let newest = Number.NaN;
  for (const file of files) {
    try {
      const time = fs6.statSync(file).mtimeMs;
      if (!(time <= newest))
        newest = time;
    } catch {}
  }
  return newest;
}
function markerFiles(dir) {
  try {
    return fs6.readdirSync(dir).map((name) => path8.join(dir, name));
  } catch {
    return [];
  }
}
function removeQuietly(target) {
  try {
    fs6.rmSync(target, { recursive: true, force: true });
  } catch {}
}
function startDecisionSession(session, cause, options = {}) {
  const now = options.now ?? Date.now();
  const hostFiles = options.hostFiles ?? [];
  let root;
  try {
    root = guardRoot(session);
  } catch {
    return false;
  }
  const own = sessionKey(session);
  let dropped = false;
  if (!session.sessionId?.trim() && cause !== "resume") {
    const files = [...markerFiles(path8.join(root, own)), ...hostFiles];
    dropped = cause === "startup" || newestOf(files) < now - UNATTRIBUTED_IDLE_MS;
    if (dropped) {
      for (const file of files)
        removeQuietly(file);
    }
  }
  if (cause === "prompt")
    return dropped;
  let keys = [];
  try {
    keys = fs6.readdirSync(root);
  } catch {}
  for (const key of keys) {
    if (key === own)
      continue;
    const dir = path8.join(root, key);
    if (!(newestOf(markerFiles(dir)) >= now - STALE_SESSION_MS)) {
      removeQuietly(dir);
    }
  }
  return dropped;
}
function touchMarker(file, flag) {
  fs6.mkdirSync(path8.dirname(file), { recursive: true });
  fs6.closeSync(fs6.openSync(file, flag));
}
function markDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "w");
  } catch {}
}
function claimDecisionFlag(session, flag) {
  try {
    touchMarker(sessionPath(session, flag), "wx");
    return true;
  } catch {
    return false;
  }
}
var SIGNOFF_LATEST_JSON = path8.join(".kb", "briefs", "signoff", "latest.json");
function record(value) {
  return typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function isRequirementUpsert(toolInput) {
  const input = record(toolInput);
  if (typeof input?.command === "string") {
    const command = input.command;
    const route = kibiCliOperation(command);
    if (route !== "kb_upsert" || /--dry-run\b|"dryRun"\s*:\s*true/.test(command))
      return false;
    return /(?:^|[\s;&|(/])kibi\s+record\b/.test(command) || /"type"\s*:\s*"req"/.test(command);
  }
  const args = record(input?.arguments) ?? record(input?.args) ?? input;
  const recorded = typeof args?.statement === "string" && typeof args.saidBy === "string";
  if (!args || args.type !== "req" && !recorded)
    return false;
  return args.dryRun !== true;
}
function mtimeMs(file) {
  let time = Number.NaN;
  try {
    time = fs6.statSync(file()).mtimeMs;
  } catch {}
  return time;
}
function claimSignoffReminder(session, workspaceRoot) {
  const recorded = mtimeMs(() => sessionPath(session, "requirement-recorded"));
  if (Number.isNaN(recorded))
    return false;
  const shown = mtimeMs(() => path8.join(workspaceRoot, SIGNOFF_LATEST_JSON));
  if (shown >= recorded)
    return false;
  return claimDecisionFlag(session, "signoff-asked");
}
function signoffReminder() {
  return [
    "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    "A rule the person stated, recorded in their own words (their quote as origin.ref), is approved by those words: when that is all this session recorded, say so in one line and skip the view. Otherwise, before reporting the work done, asking to commit, or opening or merging the pull request, run `kibi signoff` and put its output in the reply unchanged; a requirement the agent wrote waits for the person's approval, so ask for it with this view, never in your own words. When they answer, record their answer on the same branch and push it to the same pull request, never to a separate one. When replies go through a messaging tool, pass the output there as the message text, and share `.kb/briefs/signoff/latest.html` only as a rendered page (the Artifact tool in Claude apps), never as an attached file, which chat apps show as raw source (kibi-decisions, resources/signoff-views.md)."
  ].join(`
`);
}

// ../agent-core/dist/firm-edit-review.js
import { createHash as createHash4 } from "node:crypto";
import fs7 from "node:fs";
import path9 from "node:path";
var FIRM_EDIT_REVIEWS_DIR = ".kb/firm-edit-reviews";
var FIRM_EDIT_RECEIPT_VERSION = 1;
var REQUIREMENT_ID = /^REQ-[A-Za-z0-9._-]+$/;
function sha256(text) {
  return `sha256:${createHash4("sha256").update(text).digest("hex")}`;
}
function firmEditStatementHash(statement) {
  return sha256(statement.replace(/\s+/g, " ").trim());
}
function firmEditCodeHash(content, startLine, endLine) {
  const lines = content.split(/\r?\n/);
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine || endLine > lines.length)
    return;
  return sha256(lines.slice(startLine - 1, endLine).map((line) => line.trimEnd()).join(`
`));
}
function fileSafe(text) {
  return text.replace(/\//g, "__").replace(/[^A-Za-z0-9._-]/g, "_");
}
var RECEIPT_NAME_PREFIX = 48;
var MAX_FILE_NAME = 255;
function firmEditReceiptPath(requirementId, sourceFile, symbol) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const digest = createHash4("sha256").update(`${sourceFile}\x00${symbol}`).digest("hex").slice(0, 32);
  const prefix = fileSafe(symbol).slice(0, RECEIPT_NAME_PREFIX);
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${prefix}--${digest}.json`;
}
function firmEditLegacyReceiptPath(requirementId, sourceFile, symbol) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const name = `${fileSafe(sourceFile)}--${fileSafe(symbol)}.json`;
  if (name.length > MAX_FILE_NAME)
    return;
  return `${FIRM_EDIT_REVIEWS_DIR}/${requirementId}/${name}`;
}
function readFirmEditReceipt(requirementId, sourceFile, symbol, readFile) {
  for (const receiptPath of [
    firmEditReceiptPath(requirementId, sourceFile, symbol),
    firmEditLegacyReceiptPath(requirementId, sourceFile, symbol)
  ]) {
    if (receiptPath === undefined)
      continue;
    const receipt = parseFirmEditReceipt(readFile(receiptPath));
    if (receipt !== undefined && receipt.requirementId === requirementId && receipt.sourceFile === sourceFile && receipt.symbol === symbol)
      return receipt;
  }
  return;
}
function isText(value) {
  return typeof value === "string" && value.length > 0;
}
function parseFirmEditReceipt(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {}
  const receipt = value ?? {};
  if (receipt.version !== FIRM_EDIT_RECEIPT_VERSION || !isText(receipt.requirementId) || !REQUIREMENT_ID.test(receipt.requirementId) || !isText(receipt.sourceFile) || !isText(receipt.symbol) || receipt.verdict !== "keeps" && receipt.verdict !== "changes" || typeof receipt.note !== "string" || receipt.requestQuote !== undefined && typeof receipt.requestQuote !== "string" || !isText(receipt.statementHash) || !isText(receipt.codeHash) || !Number.isInteger(receipt.startLine) || !Number.isInteger(receipt.endLine) || typeof receipt.recordedAt !== "string")
    return;
  return receipt;
}
function receiptCodeFound(receipt, content) {
  const length = receipt.endLine - receipt.startLine;
  const lineCount = content.split(/\r?\n/).length;
  for (let start = 1;start + length <= lineCount; start += 1)
    if (firmEditCodeHash(content, start, start + length) === receipt.codeHash)
      return true;
  return false;
}
function firmEditReceiptMismatch(receipt, current) {
  if (receipt.statementHash !== firmEditStatementHash(current.statement))
    return "statement-changed";
  if (current.codeHash !== undefined)
    return current.codeHash === receipt.codeHash ? undefined : "code-changed";
  return current.content !== undefined && receiptCodeFound(receipt, current.content) ? undefined : "code-changed";
}
var CONTEXT_HEADING = /^(?:context|rationale|why|background|source|notes|evidence)\b/i;
var HEADING_LINE = /^\s{0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
function frontMatterScalar(lines, key) {
  const prefix = new RegExp(`^${key}:(?:\\s+(.*?))?\\s*$`);
  const index = lines.findIndex((line) => prefix.test(line));
  if (index === -1)
    return;
  const raw = prefix.exec(lines[index])[1] ?? "";
  const rest = [];
  for (const line of lines.slice(index + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line))
      break;
    rest.push(line);
  }
  if (/^[>|][0-9+-]*$/.test(raw))
    return rest.map((line) => line.trim()).filter((line) => line !== "").join(" ");
  const text = [raw, ...rest.map((line) => line.trim())].filter((line) => line !== "").join(" ");
  const quote = text[0];
  if (quote === '"') {
    const end = /^"((?:[^"\\]|\\.)*)"/.exec(text);
    const body = end ? end[1] : text.slice(1);
    return body.replace(/\\(.)/g, (_, char) => char === "n" ? `
` : char === "t" ? "\t" : char);
  }
  if (quote === "'") {
    const end = /^'((?:[^']|'')*)'/.exec(text);
    return (end ? end[1] : text.slice(1)).replace(/''/g, "'");
  }
  return text.replace(/\s+#.*$/, "");
}
function requirementStatementFromDocument(text) {
  const lines = text.replace(/\r\n?/g, `
`).split(`
`);
  if (lines[0]?.trim() !== "---")
    return;
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (close === -1)
    return;
  const front = lines.slice(1, close);
  const semantic = frontMatterScalar(front, "semantic_text");
  if (semantic !== undefined && semantic.trim() !== "")
    return semantic;
  const body = [];
  let contextLevel = 0;
  for (const line of lines.slice(close + 1)) {
    const heading = HEADING_LINE.exec(line);
    if (heading === null) {
      if (contextLevel === 0)
        body.push(line.replace(/^\s*(?:(?:[-*+]|\d+[.)])\s+|>\s*)/, ""));
      continue;
    }
    const level = heading[1].length;
    const words = (heading[2] ?? "").replace(/^[*_`\s]+/, "");
    if (level <= contextLevel)
      contextLevel = 0;
    if (contextLevel === 0 && CONTEXT_HEADING.test(words))
      contextLevel = level;
  }
  const derived = body.join(" ").replace(/\s+/g, " ").trim();
  if (derived !== "")
    return derived;
  const title = frontMatterScalar(front, "title");
  return title !== undefined && title.trim() !== "" ? title : undefined;
}
function readRequirementStatement(workspaceRoot, requirementId) {
  if (!REQUIREMENT_ID.test(requirementId))
    return;
  const text = readText3(path9.join(workspaceRoot, ".kb", "requirements", `${requirementId}.md`));
  return requirementStatementFromDocument(text);
}
function firmEditReviewed(workspaceRoot, sourceFile, askedAt) {
  let content;
  return (requirementId, symbol) => {
    const asked = askedAt(requirementId);
    if (asked === undefined)
      return false;
    const receipt = readFirmEditReceipt(requirementId, sourceFile, symbol.title, (relativePath) => readText3(path9.join(workspaceRoot, relativePath)));
    if (receipt?.verdict !== "keeps" || !(Date.parse(receipt.recordedAt) >= asked))
      return false;
    const statement = readRequirementStatement(workspaceRoot, requirementId);
    if (statement === undefined)
      return false;
    content ??= readText3(path9.join(workspaceRoot, sourceFile));
    return firmEditReceiptMismatch(receipt, { statement, content }) === undefined;
  };
}
function readText3(file) {
  try {
    return fs7.readFileSync(file, "utf8");
  } catch {}
  return "";
}

// ../agent-core/dist/level-guard.js
import fs8 from "node:fs";
import path11 from "node:path";

// ../../node_modules/.bun/yaml@2.9.1/node_modules/yaml/dist/index.js
var composer = require_composer();
var Document = require_Document();
var Schema = require_Schema();
var errors = require_errors();
var Alias = require_Alias();
var identity = require_identity();
var Pair = require_Pair();
var Scalar = require_Scalar();
var YAMLMap = require_YAMLMap();
var YAMLSeq = require_YAMLSeq();
var cst = require_cst();
var lexer = require_lexer();
var lineCounter = require_line_counter();
var parser = require_parser();
var publicApi = require_public_api();
var visit = require_visit();
var $Composer = composer.Composer;
var $Document = Document.Document;
var $Schema = Schema.Schema;
var $YAMLError = errors.YAMLError;
var $YAMLParseError = errors.YAMLParseError;
var $YAMLWarning = errors.YAMLWarning;
var $Alias = Alias.Alias;
var $isAlias = identity.isAlias;
var $isCollection = identity.isCollection;
var $isDocument = identity.isDocument;
var $isMap = identity.isMap;
var $isNode = identity.isNode;
var $isPair = identity.isPair;
var $isScalar = identity.isScalar;
var $isSeq = identity.isSeq;
var $Pair = Pair.Pair;
var $Scalar = Scalar.Scalar;
var $YAMLMap = YAMLMap.YAMLMap;
var $YAMLSeq = YAMLSeq.YAMLSeq;
var $Lexer = lexer.Lexer;
var $LineCounter = lineCounter.LineCounter;
var $Parser = parser.Parser;
var $parse = publicApi.parse;
var $parseAllDocuments = publicApi.parseAllDocuments;
var $parseDocument = publicApi.parseDocument;
var $stringify = publicApi.stringify;
var $visit = visit.visit;
var $visitAsync = visit.visitAsync;

// ../agent-core/dist/kibi-level.js
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import * as path10 from "node:path";
var DEFAULT_KIBI_LEVEL = "test";
function isKibiLevel(value) {
  return value === "remember" || value === "test";
}
function readText4(file) {
  try {
    return readFileSync2(file, "utf8");
  } catch {
    return;
  }
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolved(value, source) {
  if (value === undefined)
    return { level: DEFAULT_KIBI_LEVEL, source: "default" };
  if (isKibiLevel(value))
    return { level: value, source };
  return { level: DEFAULT_KIBI_LEVEL, source, invalid: value };
}
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return;
  }
}
function kibiLevelInSettings(text, source) {
  const parsed = parseJson(text);
  if (source === "setup.json")
    return resolved(isRecord3(parsed) ? parsed.level : undefined, source);
  const kibi = isRecord3(parsed) ? parsed.kibi : undefined;
  return resolved(isRecord3(kibi) ? kibi.level : undefined, source);
}
function readKibiLevel(workspaceRoot) {
  const packagePath = path10.join(workspaceRoot, "package.json");
  if (existsSync2(packagePath))
    return kibiLevelInSettings(readText4(packagePath), "package.json");
  return kibiLevelInSettings(readText4(path10.join(workspaceRoot, ".kb", "setup.json")), "setup.json");
}

// ../agent-core/dist/level-guard.js
var EVIDENCE_LEVELS = [
  "unverified",
  "asserted",
  "tested",
  "proved"
];
var MAX_READ_BYTES = 2 * 1024 * 1024;
function readText5(absolutePath) {
  try {
    if (fs8.statSync(absolutePath).size > MAX_READ_BYTES)
      return;
    return fs8.readFileSync(absolutePath, "utf8");
  } catch {
    return;
  }
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isEvidenceLevel(value) {
  return EVIDENCE_LEVELS.includes(value);
}
function rank(level) {
  return EVIDENCE_LEVELS.indexOf(level);
}
function proposedContent(absolutePath, toolInput) {
  if (!isRecord4(toolInput))
    return;
  for (const key of ["content", "contents", "file_text"]) {
    const value = toolInput[key];
    if (typeof value === "string")
      return value;
  }
  const records = [
    toolInput,
    ...Array.isArray(toolInput.edits) ? toolInput.edits : []
  ].filter(isRecord4);
  const replacements = [];
  for (const record of records) {
    const before = record.old_string ?? record.oldString;
    const after = record.new_string ?? record.newString;
    if (typeof before !== "string" || typeof after !== "string")
      continue;
    replacements.push({
      before,
      after,
      all: record.replace_all === true || record.replaceAll === true
    });
  }
  if (replacements.length === 0)
    return;
  let text = readText5(absolutePath);
  if (text === undefined)
    return;
  for (const { before, after, all } of replacements) {
    if (before === "" || !text.includes(before))
      return;
    text = all ? text.split(before).join(after) : text.replace(before, () => after);
  }
  return text;
}
var PATCH_SECTION_HEADER2 = /^\*\*\* (Update|Add|Delete) File: (.+)$/;
function patchLinesFor(toolInput, relativePath) {
  const target = normalizeWorkspacePath(relativePath);
  const found = { added: [], removed: [], sections: [] };
  let matched = false;
  for (const patch of extractPatchTexts(toolInput)) {
    let current;
    let currentSection;
    for (const line of patch.split(/\r?\n/)) {
      const header = PATCH_SECTION_HEADER2.exec(line.trim());
      if (header?.[1] && header[2]) {
        current = normalizeWorkspacePath(header[2]);
        if (current === target) {
          matched = true;
          currentSection = {
            kind: header[1],
            lines: []
          };
          found.sections.push(currentSection);
        } else {
          currentSection = undefined;
        }
        continue;
      }
      if (line.trim() === "*** End Patch") {
        current = undefined;
        currentSection = undefined;
        continue;
      }
      if (current !== target || !currentSection)
        continue;
      currentSection.lines.push(line);
      if (line.startsWith("+"))
        found.added.push(line.slice(1));
      else if (line.startsWith("-"))
        found.removed.push(line.slice(1));
    }
  }
  return matched ? found : undefined;
}
function applyPatchToText(currentText, lines) {
  let text = currentText;
  for (const section of lines.sections) {
    if (section.kind === "Delete") {
      text = "";
      continue;
    }
    if (section.kind === "Add") {
      text = `${section.lines.filter((line) => line.startsWith("+")).map((line) => line.slice(1)).join(`
`)}
`;
      continue;
    }
    if (text === undefined)
      return;
    const hunks = [];
    let currentHunk;
    for (const line of section.lines) {
      if (line.startsWith("@@")) {
        if (currentHunk && currentHunk.length > 0)
          hunks.push(currentHunk);
        currentHunk = [];
      } else if (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-")) {
        currentHunk ??= [];
        currentHunk.push(line);
      }
    }
    if (currentHunk && currentHunk.length > 0)
      hunks.push(currentHunk);
    if (hunks.length === 0)
      return;
    let fileLines = text.split(/\r?\n/);
    for (const hunk of hunks) {
      const before = hunk.filter((line) => !line.startsWith("+")).map((line) => line.slice(1));
      const after = hunk.filter((line) => !line.startsWith("-")).map((line) => line.slice(1));
      if (before.length === 0)
        return;
      let matchAt = -1;
      for (let i = 0;i <= fileLines.length - before.length; i++) {
        if (before.every((line, offset) => fileLines[i + offset] === line)) {
          matchAt = i;
          break;
        }
      }
      if (matchAt < 0)
        return;
      fileLines = [
        ...fileLines.slice(0, matchAt),
        ...after,
        ...fileLines.slice(matchAt + before.length)
      ];
    }
    text = fileLines.join(`
`);
  }
  return text;
}
var LEVEL_LINE = /"level"\s*:\s*("([^"]*)")?/;
function levelInJson(text, settings) {
  return kibiLevelInSettings(text, settings === "package" ? "package.json" : "setup.json").level;
}
function levelChangeOfEdit(workspaceRoot, relativePath, toolInput) {
  const normalized = normalizeWorkspacePath(relativePath);
  const hasPackage = fs8.existsSync(path11.join(workspaceRoot, "package.json"));
  const settings = normalized === "package.json" ? "package" : normalized === ".kb/setup.json" && !hasPackage ? "setup" : undefined;
  if (settings === undefined)
    return;
  const from = readKibiLevel(workspaceRoot).level;
  const absolutePath = path11.join(workspaceRoot, normalized);
  const after = proposedContent(absolutePath, toolInput);
  let to;
  if (after !== undefined) {
    to = levelInJson(after, settings);
  } else {
    const lines = patchLinesFor(toolInput, normalized);
    if (lines === undefined)
      return;
    const patched = applyPatchToText(readText5(absolutePath), lines);
    if (patched !== undefined) {
      to = levelInJson(patched, settings);
    } else {
      const addedLevel = lines.added.map((line) => LEVEL_LINE.exec(line)?.[2]).find(isKibiLevel);
      const removed = lines.removed.some((line) => isKibiLevel(LEVEL_LINE.exec(line)?.[2]));
      if (addedLevel !== undefined) {
        to = addedLevel;
      } else if (removed) {
        to = DEFAULT_KIBI_LEVEL;
      }
    }
  }
  if (to === undefined || to === from)
    return;
  return { kind: "level", path: normalized, from, to };
}
var REQUIREMENT_PATH = /^\.kb\/requirements\/.+\.md$/;
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match?.[1])
    return;
  let parsed;
  try {
    parsed = $parse(match[1]);
  } catch {
    return { malformed: true };
  }
  if (!isRecord4(parsed))
    return { malformed: true };
  const id = typeof parsed.id === "string" && parsed.id.trim() !== "" ? parsed.id.trim() : undefined;
  const rawEvidence = parsed.required_evidence;
  const hasExplicitEvidence = rawEvidence !== undefined && rawEvidence !== null && rawEvidence !== "";
  const requiredEvidenceInvalid = hasExplicitEvidence && !isEvidenceLevel(rawEvidence);
  const firmness = typeof parsed.firmness === "string" ? parsed.firmness : undefined;
  const origin = isRecord4(parsed.origin) ? parsed.origin : undefined;
  const originKind = typeof origin?.kind === "string" ? origin.kind : undefined;
  const approvedBy = typeof origin?.approved_by === "string" ? origin.approved_by : undefined;
  return {
    id,
    required_evidence: rawEvidence,
    requiredEvidenceInvalid,
    firmness,
    originKind,
    approvedBy
  };
}
function evidenceFloor(fields) {
  if (isEvidenceLevel(fields.required_evidence))
    return fields.required_evidence;
  const firmness = typeof fields.firmness === "string" && fields.firmness !== "" ? fields.firmness : undefined;
  if (firmness === "firm")
    return "tested";
  if (firmness === undefined) {
    if (fields.originKind !== "agent")
      return "tested";
    if (typeof fields.approvedBy === "string" && fields.approvedBy !== "")
      return "tested";
  }
  return "unverified";
}
function floorOfDocument(fields) {
  if (fields.malformed || fields.requiredEvidenceInvalid)
    return "unverified";
  return evidenceFloor({
    required_evidence: fields.required_evidence,
    firmness: fields.firmness,
    originKind: fields.originKind,
    approvedBy: fields.approvedBy
  });
}
function walkMarkdownFiles(dir, out) {
  let entries;
  try {
    entries = fs8.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path11.join(dir, entry.name);
    if (entry.isDirectory())
      walkMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md"))
      out.push(full);
  }
}
function currentRequirement(workspaceRoot, requirementId) {
  const directPath = path11.join(workspaceRoot, ".kb", "requirements", `${requirementId}.md`);
  const directText = readText5(directPath);
  if (directText !== undefined) {
    const direct = frontmatter(directText);
    if (direct !== undefined && (direct.id === undefined || direct.id === requirementId))
      return direct;
  }
  const files = [];
  walkMarkdownFiles(path11.join(workspaceRoot, ".kb", "requirements"), files);
  for (const file of files) {
    if (file === directPath)
      continue;
    const text = readText5(file);
    if (text === undefined)
      continue;
    const parsed = frontmatter(text);
    if (parsed?.id === requirementId)
      return parsed;
  }
  return;
}
function lowering(requirementId, from, to) {
  return rank(to) < rank(from) ? { kind: "evidence", requirementId, from, to } : undefined;
}
function parseYamlLine(line) {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#"))
    return;
  try {
    const parsed = $parse(trimmed);
    return isRecord4(parsed) ? parsed : undefined;
  } catch {
    return;
  }
}
function evidenceLoweringOfEdit(workspaceRoot, relativePath, toolInput) {
  const normalized = normalizeWorkspacePath(relativePath);
  if (!REQUIREMENT_PATH.test(normalized))
    return;
  const absolutePath = path11.join(workspaceRoot, normalized);
  const currentText = readText5(absolutePath);
  if (currentText === undefined)
    return;
  const current = frontmatter(currentText);
  if (current === undefined)
    return;
  const requirementId = current.id ?? path11.basename(normalized, ".md");
  const from = floorOfDocument(current);
  const after = proposedContent(absolutePath, toolInput);
  if (after !== undefined) {
    const proposed = frontmatter(after);
    const to = proposed === undefined ? "unverified" : floorOfDocument(proposed);
    return lowering(requirementId, from, to);
  }
  const lines = patchLinesFor(toolInput, normalized);
  if (lines === undefined)
    return;
  const patched = applyPatchToText(currentText, lines);
  if (patched !== undefined) {
    const proposed = frontmatter(patched);
    const to = proposed === undefined ? "unverified" : floorOfDocument(proposed);
    return lowering(requirementId, from, to);
  }
  const next = { ...current };
  let touched = false;
  for (const line of lines.removed) {
    const parsed = parseYamlLine(line);
    if (!parsed)
      continue;
    if ("required_evidence" in parsed) {
      next.required_evidence = undefined;
      next.requiredEvidenceInvalid = false;
      touched = true;
    }
    if ("firmness" in parsed) {
      next.firmness = undefined;
      touched = true;
    }
    if ("approved_by" in parsed) {
      next.approvedBy = undefined;
      touched = true;
    }
    if ("origin" in parsed) {
      next.originKind = undefined;
      next.approvedBy = undefined;
      touched = true;
    }
  }
  for (const line of lines.added) {
    const parsed = parseYamlLine(line);
    if (!parsed)
      continue;
    if ("required_evidence" in parsed) {
      const value = parsed.required_evidence;
      next.required_evidence = value;
      next.requiredEvidenceInvalid = value !== undefined && value !== null && value !== "" && !isEvidenceLevel(value);
      touched = true;
    }
    if ("firmness" in parsed) {
      next.firmness = typeof parsed.firmness === "string" ? parsed.firmness : undefined;
      touched = true;
    }
    if ("approved_by" in parsed) {
      next.approvedBy = typeof parsed.approved_by === "string" ? parsed.approved_by : undefined;
      touched = true;
    }
    if ("origin" in parsed && isRecord4(parsed.origin)) {
      next.originKind = typeof parsed.origin.kind === "string" ? parsed.origin.kind : undefined;
      next.approvedBy = typeof parsed.origin.approved_by === "string" ? parsed.origin.approved_by : undefined;
      touched = true;
    }
  }
  return touched ? lowering(requirementId, from, floorOfDocument(next)) : undefined;
}
function loweringFromUpsertFields(workspaceRoot, id, properties) {
  const current = currentRequirement(workspaceRoot, id);
  if (current === undefined)
    return;
  const sent = properties.required_evidence;
  if (typeof sent === "string" && sent !== "" && !isEvidenceLevel(sent))
    return;
  const next = { ...current };
  if ("required_evidence" in properties) {
    const value = properties.required_evidence;
    next.required_evidence = typeof value === "string" && value !== "" ? value : undefined;
    next.requiredEvidenceInvalid = false;
  }
  if ("firmness" in properties) {
    const value = properties.firmness;
    next.firmness = typeof value === "string" && value !== "" ? value : undefined;
  }
  if ("origin" in properties) {
    next.originKind = undefined;
    next.approvedBy = undefined;
    const origin = properties.origin;
    if (isRecord4(origin)) {
      if (typeof origin.kind === "string")
        next.originKind = origin.kind;
      if (typeof origin.approved_by === "string")
        next.approvedBy = origin.approved_by;
    }
  }
  return lowering(id, floorOfDocument(current), floorOfDocument(next));
}
function loweringFromPlan(workspaceRoot, plan) {
  if (!isRecord4(plan))
    return;
  const lists = [plan.actions, plan.steps, plan.entities].filter(Array.isArray);
  for (const list of lists) {
    for (const item of list) {
      if (!isRecord4(item))
        continue;
      const target = isRecord4(item.payload) ? item.payload : isRecord4(item.entity) ? item.entity : item;
      const id = typeof target.id === "string" ? target.id : typeof item.entityId === "string" ? item.entityId : typeof item.id === "string" ? item.id : undefined;
      if (!id)
        continue;
      const op = String(item.operation ?? item.kind ?? item.action ?? "");
      if (/delete|remove/i.test(op)) {
        const current = currentRequirement(workspaceRoot, id);
        if (current) {
          const found = lowering(id, floorOfDocument(current), "unverified");
          if (found)
            return found;
        }
        continue;
      }
      const props = isRecord4(target.properties) ? target.properties : target;
      const found = loweringFromUpsertFields(workspaceRoot, id, props);
      if (found)
        return found;
    }
  }
  return;
}
function evidenceLoweringOfKbCall(workspaceRoot, operation, toolInput) {
  if (!isRecord4(toolInput))
    return;
  if (toolInput.dryRun === true)
    return;
  const targetWorkspace = kbCallWorkspace(workspaceRoot, toolInput);
  if (operation === "kb_delete") {
    const ids = [];
    if (typeof toolInput.id === "string")
      ids.push(toolInput.id);
    if (Array.isArray(toolInput.ids)) {
      for (const entry of toolInput.ids)
        if (typeof entry === "string")
          ids.push(entry);
    }
    for (const id of ids) {
      const current = currentRequirement(targetWorkspace, id);
      if (current === undefined)
        continue;
      const found = lowering(id, floorOfDocument(current), "unverified");
      if (found)
        return found;
    }
    return;
  }
  if (operation === "kb_apply_plan") {
    return loweringFromPlan(targetWorkspace, toolInput.plan);
  }
  if (operation !== "kb_upsert")
    return;
  const { id, properties } = toolInput;
  if (typeof id !== "string" || !isRecord4(properties))
    return;
  const type = toolInput.type;
  if (type !== undefined && type !== "req")
    return;
  return loweringFromUpsertFields(targetWorkspace, id, properties);
}
function kbCallWorkspace(workspaceRoot, toolInput) {
  const named = toolInput.workspaceRoot;
  return typeof named === "string" && named.trim() !== "" ? path11.resolve(workspaceRoot, named.trim()) : workspaceRoot;
}
var LEVEL_SHELL_HINT = /\b(?:level|remember|test)\b/i;
var EVIDENCE_SHELL_HINT = /\b(?:required_evidence|firmness|origin|approved_by|unverified|asserted|tested)\b/i;
var DESTRUCTIVE_OR_REWRITE_SHELL = /(?:>|>>|\b(?:tee|rm|mv|cp|truncate|dd)\b|\bgit\s+(?:checkout|restore)\b)/;
function guardedChangeOfShellCommand(workspaceRoot, command, cwd = workspaceRoot) {
  const hasPackage = fs8.existsSync(path11.join(workspaceRoot, "package.json"));
  const levelPath = hasPackage ? "package.json" : ".kb/setup.json";
  const fromLevel = readKibiLevel(workspaceRoot).level;
  const initLevel = kibiInitLevelTarget(command)?.trim().toLowerCase();
  if (initLevel !== undefined && isKibiLevel(initLevel) && initLevel !== fromLevel) {
    return {
      kind: "level",
      path: levelPath,
      from: fromLevel,
      to: initLevel
    };
  }
  for (const absolute of commandEditPaths(command, cwd)) {
    const target = toWorkspacePath(workspaceRoot, absolute, cwd);
    if (!target)
      continue;
    const relative = normalizeWorkspacePath(target.relative);
    if (relative === levelPath && (LEVEL_SHELL_HINT.test(command) || DESTRUCTIVE_OR_REWRITE_SHELL.test(command))) {
      return {
        kind: "level",
        path: levelPath,
        from: fromLevel,
        to: fromLevel === "test" ? "remember" : "test"
      };
    }
    if (REQUIREMENT_PATH.test(relative) && (EVIDENCE_SHELL_HINT.test(command) || DESTRUCTIVE_OR_REWRITE_SHELL.test(command))) {
      const text = readText5(absolute);
      const current = text === undefined ? undefined : frontmatter(text);
      if (current === undefined)
        continue;
      const from = floorOfDocument(current);
      if (rank(from) > 0) {
        return {
          kind: "evidence",
          requirementId: current.id ?? path11.basename(relative, ".md"),
          from,
          to: "unverified"
        };
      }
    }
  }
  return;
}
function guardedChangeOf(input) {
  const operation = canonicalKbToolName(input.toolName);
  if (operation !== undefined)
    return evidenceLoweringOfKbCall(input.workspaceRoot, operation, input.toolInput);
  if (input.relativePath === undefined)
    return;
  return levelChangeOfEdit(input.workspaceRoot, input.relativePath, input.toolInput) ?? evidenceLoweringOfEdit(input.workspaceRoot, input.relativePath, input.toolInput);
}
function describe(change) {
  if (change.kind === "level")
    return `changes the Kibi level from ${change.from} to ${change.to} (${change.path})`;
  return `lowers the evidence ${change.requirementId} must reach from ${change.from} to ${change.to}`;
}
function guardedChangeConfirmation(change) {
  if (change.kind === "level")
    return `Kibi: this edit ${describe(change)}. ${change.to === "remember" ? "At remember, Kibi stops asking for the scenarios, tests and proofs that show each requirement holds." : "At test, Kibi asks for the scenarios and linked tests that show each requirement holds, and blocks commits that leave them out."} Allow it only if you chose this level.`;
  return `Kibi: this change ${describe(change)}, so kibi check stops asking for the evidence it asked for before. Allow it only if you agree the requirement needs less evidence.`;
}
function guardedChangeContext(change) {
  return `Kibi asked the person to confirm this change because it ${describe(change)}. That is the person's decision: do not make it again a different way if they decline, and say in your reply what you changed.`;
}

// ../agent-core/dist/read-context.js
import { createHash as createHash5 } from "node:crypto";
import fs9 from "node:fs";
import path12 from "node:path";
var MAX_ROWS_PER_EVENT = 3;
var MAX_WHOLE_FILE_ROWS = 5;
var MAX_EVENT_CHARS = 700;
var MAX_WHOLE_FILE_EVENT_CHARS = 1100;
var MAX_SESSION_ROWS = 10;
var MAX_SESSION_CHARS = 2300;
var MAX_SEARCH_REQUIREMENTS = 6;
var MAX_SEARCH_FILES = 300;
var MAX_SEARCH_FILE_BYTES = 1024 * 1024;
var MAX_TITLE_SYMBOL = 60;
var MAX_BUSY_LINE = 600;
var HEADER = "Kibi requirements for the code in view:";
var HINT = `kb_query({id:"<id>", includeBody:true}) gives a requirement's full text and why it exists.`;
function truncate2(text, limit) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function isCurrent(summarize, id) {
  const summary = summarize(id);
  return !isRetiredStatus(summary.status) && summary.supersededBy === undefined;
}
function isFirm(summarize, id) {
  return summarize(id).firmness === "firm";
}
function matchedSymbols(symbols, lines) {
  return focusedSymbols(symbols, lines.map((line) => ({ start: line, end: line }))).map((symbol) => ({
    symbol,
    count: lines.filter((line) => line >= Number(symbol.line) && line <= Number(symbol.endLine ?? symbol.line)).length
  })).sort((left, right) => right.count - left.count);
}
function rankedCandidates(view, summarize) {
  const ordered = view.matches !== undefined ? matchedSymbols(view.symbols, view.matches).map(({ symbol, count }) => ({
    symbol,
    weight: count
  })) : focusedSymbols(view.symbols, view.focus).map((symbol, index) => ({
    symbol,
    weight: -index
  }));
  const best = new Map;
  for (const { symbol, weight } of ordered) {
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id))
        continue;
      if (best.has(id))
        continue;
      best.set(id, {
        id,
        symbol: symbol.title,
        relativePath: view.relativePath,
        firmFocus: isFirm(summarize, id),
        weight
      });
    }
  }
  return [...best.values()].sort((left, right) => right.weight - left.weight || Number(right.firmFocus) - Number(left.firmFocus) || left.id.localeCompare(right.id)).map(({ weight: _weight, ...candidate }) => candidate);
}
function wholeFileCandidates(view, summarize) {
  const symbolsOf = new Map;
  for (const symbol of view.symbols)
    for (const id of symbol.implements) {
      if (!isCurrent(summarize, id))
        continue;
      symbolsOf.set(id, [...symbolsOf.get(id) ?? [], symbol.title]);
    }
  return [...symbolsOf.entries()].sort(([leftId, left], [rightId, right]) => right.length - left.length || Number(isFirm(summarize, rightId)) - Number(isFirm(summarize, leftId)) || leftId.localeCompare(rightId)).map(([id, symbols]) => ({
    id,
    symbol: symbols[0],
    relativePath: view.relativePath,
    firmFocus: false
  }));
}
function ledgerFile(stateDir, sessionKey) {
  const key = createHash5("sha256").update(String(sessionKey)).digest("hex").slice(0, 32);
  return path12.join(stateDir, "read-rows", `${key}.jsonl`);
}
function readLedger(stateDir, sessionKey) {
  const total = { rows: 0, chars: 0 };
  if (!stateDir)
    return total;
  let text;
  try {
    text = fs9.readFileSync(ledgerFile(stateDir, sessionKey), "utf8");
  } catch {
    return total;
  }
  for (const line of text.split(`
`)) {
    try {
      const entry = JSON.parse(line);
      total.rows += Number(entry.rows) || 0;
      total.chars += Number(entry.chars) || 0;
    } catch {}
  }
  return total;
}
function appendLedger(stateDir, sessionKey, entry) {
  if (!stateDir)
    return;
  const file = ledgerFile(stateDir, sessionKey);
  try {
    fs9.mkdirSync(path12.dirname(file), { recursive: true });
    fs9.appendFileSync(file, `${JSON.stringify(entry)}
`);
  } catch {}
}
function slotKey(sessionKey, ...parts) {
  return [String(sessionKey), "read-row", ...parts].join("\x00");
}
function slotTaken(stateDir, key) {
  if (!stateDir)
    return false;
  const marker = path12.join(stateDir, "shown-snippets", createHash5("sha256").update(key).digest("hex").slice(0, 32));
  return fs9.existsSync(marker);
}
function rowText(candidate, summarize, withPath) {
  const where = withPath ? `${truncate2(candidate.symbol, MAX_TITLE_SYMBOL)} (${candidate.relativePath})` : truncate2(candidate.symbol, MAX_TITLE_SYMBOL);
  return `- ${describeEntity(summarize(candidate.id))} — ${where}`;
}
function busyLine(view, ids) {
  const line = `- ${view.relativePath} implements ${ids.length} requirements: ${ids.join(", ")}; reading a line range narrows them to the code in view.`;
  return truncate2(line, MAX_BUSY_LINE);
}
function readContext(input) {
  const { summarize, stateDir, sessionKey } = input;
  const alreadyShown = input.alreadyShown ?? new Set;
  const ledger = readLedger(stateDir, sessionKey);
  if (ledger.rows >= MAX_SESSION_ROWS || ledger.chars >= MAX_SESSION_CHARS)
    return;
  const search = input.views.filter((view) => view.matches !== undefined);
  const reads = input.views.filter((view) => view.matches === undefined);
  const candidates = [];
  const busy = [];
  let wholeFile = false;
  if (search.length > 0) {
    const ranked = search.flatMap((view) => rankedCandidates(view, summarize).map((candidate, rank) => ({
      candidate,
      count: matchedSymbols(view.symbols, view.matches ?? []).find((entry) => entry.symbol.implements.includes(candidate.id))?.count ?? 0,
      rank
    }))).sort((left, right) => right.count - left.count || left.rank - right.rank);
    const distinct = new Set(ranked.map((entry) => entry.candidate.id));
    if (distinct.size <= MAX_SEARCH_REQUIREMENTS)
      candidates.push(...ranked.map((entry) => entry.candidate));
  }
  for (const view of reads) {
    if (view.focus !== undefined) {
      candidates.push(...rankedCandidates(view, summarize));
      continue;
    }
    const all = wholeFileCandidates(view, summarize);
    if (all.length <= MAX_WHOLE_FILE_ROWS) {
      wholeFile = wholeFile || all.length > 0;
      candidates.push(...all);
    } else
      busy.push({ view, ids: all.map((candidate) => candidate.id) });
  }
  const perEvent = wholeFile && search.length === 0 && !reads.some((view) => view.focus) ? MAX_WHOLE_FILE_ROWS : MAX_ROWS_PER_EVENT;
  const eventChars = perEvent === MAX_WHOLE_FILE_ROWS ? MAX_WHOLE_FILE_EVENT_CHARS : MAX_EVENT_CHARS;
  const hintKey = slotKey(sessionKey, "hint");
  const hint = slotTaken(stateDir, hintKey) ? undefined : HINT;
  const withPath = new Set(input.views.map((view) => view.relativePath)).size > 1;
  const lines = [HEADER];
  const ids = [];
  const paths = new Set;
  const seen = new Set;
  const fixed = (extra) => lines.join(`
`).length + extra;
  let rows = 0;
  for (const candidate of candidates) {
    if (rows >= perEvent || ledger.rows + rows >= MAX_SESSION_ROWS)
      break;
    if (seen.has(candidate.id))
      continue;
    seen.add(candidate.id);
    if (alreadyShown.has(candidate.id) && !candidate.firmFocus)
      continue;
    const row = rowText(candidate, summarize, withPath);
    const length = fixed(row.length + 1);
    if (length > eventChars || ledger.chars + length > MAX_SESSION_CHARS)
      continue;
    if (!claimSnippetSlot(stateDir, slotKey(sessionKey, candidate.id)))
      continue;
    lines.push(row);
    ids.push(candidate.id);
    paths.add(candidate.relativePath);
    rows++;
  }
  for (const { view, ids: busyIds } of busy) {
    if (ledger.rows + rows >= MAX_SESSION_ROWS)
      break;
    const line = busyLine(view, busyIds);
    const length = fixed(line.length + 1);
    if (length > MAX_WHOLE_FILE_EVENT_CHARS || ledger.chars + length > MAX_SESSION_CHARS)
      continue;
    if (!claimSnippetSlot(stateDir, slotKey(sessionKey, "busy", view.relativePath)))
      continue;
    lines.push(line);
    paths.add(view.relativePath);
    rows++;
  }
  if (rows === 0)
    return;
  const withHint = fixed((hint?.length ?? 0) + 1);
  if (hint && withHint <= eventChars && ledger.chars + withHint <= MAX_SESSION_CHARS && claimSnippetSlot(stateDir, hintKey))
    lines.push(hint);
  const text = lines.join(`
`);
  appendLedger(stateDir, sessionKey, { rows, chars: text.length });
  return { text, ids, paths: [...paths] };
}
var MAX_SEARCH_LINE_CHARS = 1000;
var MAX_REGEX_SOURCE_CHARS = 512;
var MAX_SEARCH_TIME_MS = 50;
function isSafeRegexSource(source) {
  if (source.length > MAX_REGEX_SOURCE_CHARS)
    return false;
  const stack = [];
  let inClass = false;
  for (let index = 0;index < source.length; index++) {
    const char = source[index];
    if (char === "\\") {
      const next = source[index + 1];
      if (next !== undefined && next >= "1" && next <= "9")
        return false;
      index++;
      continue;
    }
    if (inClass) {
      if (char === "]")
        inClass = false;
      continue;
    }
    if (char === "[") {
      inClass = true;
      continue;
    }
    if (char === "(") {
      stack.push({ hasQuantifier: false, hasAlternation: false });
      continue;
    }
    if (char === ")") {
      const frame = stack.pop();
      const next = source[index + 1];
      const quantified = next === "+" || next === "*" || next === "{";
      if (frame) {
        if (quantified && (frame.hasQuantifier || frame.hasAlternation))
          return false;
        const parent = stack.at(-1);
        if (parent) {
          if (frame.hasQuantifier || quantified)
            parent.hasQuantifier = true;
          if (frame.hasAlternation)
            parent.hasAlternation = true;
        }
      }
      continue;
    }
    const current = stack.at(-1);
    if (!current)
      continue;
    if (char === "|")
      current.hasAlternation = true;
    else if (char === "+" || char === "*" || char === "{")
      current.hasQuantifier = true;
  }
  return true;
}
function grepRegExp(grep) {
  const flags = grep.ignoreCase ? "i" : "";
  const literal = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let source;
  if (grep.fixed)
    source = literal(grep.pattern);
  else if (grep.basic) {
    source = "";
    for (let index = 0;index < grep.pattern.length; index++) {
      const char = grep.pattern[index];
      const next = grep.pattern[index + 1];
      if (char === "\\" && next !== undefined && "|()+?{}".includes(next)) {
        source += next;
        index++;
      } else if (char === "\\" && next !== undefined) {
        source += `\\${next}`;
        index++;
      } else if ("|()+?{}".includes(char))
        source += `\\${char}`;
      else
        source += char;
    }
  } else
    source = grep.pattern;
  if (!isSafeRegexSource(source))
    source = literal(grep.pattern);
  if (grep.word)
    source = `\\b(?:${source})\\b`;
  try {
    return new RegExp(source, flags);
  } catch {
    return new RegExp(literal(grep.pattern), flags);
  }
}
function matchingLines(absolute, grep, deadlineMs = Date.now() + MAX_SEARCH_TIME_MS) {
  const pattern = grepRegExp(grep);
  const content = readText(absolute);
  if (content === undefined || content.length > MAX_SEARCH_FILE_BYTES)
    return [];
  const lines = [];
  for (const [index, line] of content.split(`
`).entries()) {
    if (Date.now() > deadlineMs)
      break;
    if (line.length > MAX_SEARCH_LINE_CHARS)
      continue;
    if (pattern.test(line))
      lines.push(index + 1);
  }
  return lines;
}
function linkedFilesUnder(files, relativeDirectory) {
  const prefix = relativeDirectory === "" ? "" : `${relativeDirectory}/`;
  return Object.keys(files).filter((file) => file.startsWith(prefix) && implementedRequirementIds(files[file] ?? []).length > 0).sort().slice(0, MAX_SEARCH_FILES);
}
function relativeTo(root, absolute) {
  const relative = path12.relative(root, absolute).split(path12.sep).join("/");
  if (relative.startsWith("..") || path12.isAbsolute(relative))
    return;
  return relative;
}
function resolveReadViews(reads, input) {
  const views = new Map;
  const deadlineMs = Date.now() + MAX_SEARCH_TIME_MS;
  for (const read of reads) {
    const relative = relativeTo(input.workspaceRoot, read.absolute);
    if (relative === undefined)
      continue;
    if (read.grep) {
      const targets = read.directory ? linkedFilesUnder(input.files, relative) : [relative];
      for (const file of targets) {
        if (Date.now() > deadlineMs)
          break;
        if (!input.isSource(file) || !(input.admits?.(file) ?? true))
          continue;
        const symbols = input.files[file] ?? [];
        if (implementedRequirementIds(symbols).length === 0)
          continue;
        const matches = matchingLines(path12.join(input.workspaceRoot, file), read.grep, deadlineMs);
        if (matches.length === 0)
          continue;
        views.set(file, { relativePath: file, symbols, matches });
      }
      continue;
    }
    if (read.directory || !input.isSource(relative))
      continue;
    const symbols = input.files[relative] ?? [];
    if (implementedRequirementIds(symbols).length === 0)
      continue;
    if (views.has(relative))
      continue;
    views.set(relative, {
      relativePath: relative,
      symbols,
      ...read.focus ? { focus: read.focus } : {}
    });
  }
  return [...views.values()];
}
function globFilter(glob) {
  let source = "";
  let depth = 0;
  for (let index = 0;index < glob.length; index++) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      source += ".*";
      index++;
      if (glob[index + 1] === "/")
        index++;
    } else if (char === "*")
      source += "[^/]*";
    else if (char === "?")
      source += "[^/]";
    else if (char === "{") {
      source += "(?:";
      depth++;
    } else if (char === "}" && depth > 0) {
      source += ")";
      depth--;
    } else if (char === "," && depth > 0)
      source += "|";
    else
      source += char.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  const anchored = glob.includes("/") ? new RegExp(`^${source}$`) : new RegExp(`(?:^|/)${source}$`);
  return (relativePath) => anchored.test(relativePath);
}
function hookReadRows(reads, input) {
  const views = resolveReadViews(reads, input);
  if (views.length === 0)
    return;
  const alreadyShown = new Set(input.shownIds ?? []);
  for (const view of views)
    if (input.shownPaths?.has(view.relativePath) || slotTaken(input.stateDir, `${String(input.sessionKey)}\x00edit\x00${view.relativePath}`))
      for (const id of implementedRequirementIds(view.symbols))
        alreadyShown.add(id);
  return readContext({
    views,
    summarize: input.summarize,
    stateDir: input.stateDir,
    sessionKey: input.sessionKey,
    alreadyShown
  });
}
function searchToolRead(search) {
  if (typeof search.pattern !== "string" || search.pattern.length === 0)
    return;
  const absolute = typeof search.path === "string" && search.path.trim().length > 0 ? path12.resolve(search.cwd, search.path) : search.cwd;
  let directory;
  try {
    directory = fs9.statSync(absolute).isDirectory();
  } catch {
    return;
  }
  return {
    absolute,
    directory,
    grep: {
      pattern: search.pattern,
      ignoreCase: search.ignoreCase === true,
      fixed: search.fixed === true,
      basic: false,
      word: false
    }
  };
}

// ../agent-core/dist/hook-usage-log.js
import { randomUUID as randomUUID4 } from "node:crypto";
import fs12 from "node:fs";
import path15 from "node:path";

// ../agent-core/dist/telemetry-signals.js
import { createHash as createHash6, randomUUID as randomUUID2 } from "node:crypto";
import fs10 from "node:fs";
import path13 from "node:path";
var RETRY_WINDOW_MS = 10 * 60 * 1000;
var SEARCH_REPEAT_WINDOW_MS = 2 * 60 * 1000;
var SKILL_WINDOW_MS = 30 * 60 * 1000;
var MAX_RECENT_ENTRIES = 200;
var RECENT_FILE = "telemetry-recent.json";
var KIBI_SKILL_NAMES = new Set([
  "kibi-bootstrap",
  "kibi-commit-review",
  "kibi-decisions",
  "kibi-freshness",
  "kibi-provable-code",
  "kibi-traceability",
  "kibi-usage"
]);
var RESULT_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, 10, "6-10"],
  [11, Number.POSITIVE_INFINITY, "11+"]
];
var RELATIONSHIP_COUNT_BUCKETS = [
  [0, 0, "0"],
  [1, 1, "1"],
  [2, 5, "2-5"],
  [6, Number.POSITIVE_INFINITY, "6+"]
];
var SMALL_COUNT_BUCKETS = [
  [1, 1, "1"],
  [2, 2, "2"],
  [3, 3, "3"],
  [4, Number.POSITIVE_INFINITY, "4+"]
];
var KIBI_SOURCE_PACKAGES = "agent-core|cli|mcp|core|runtime|claude|codex|cursor|opencode|zcode|vscode|plugin-[a-z0-9-]+|lang-[a-z0-9-]+";
var SOURCE_FRAME = new RegExp(`(?:^|/)packages/(${KIBI_SOURCE_PACKAGES})/((?:src|dist|bin)/.+)$`);
function isRecord5(value) {
  return typeof value === "object" && value !== null;
}
var SKILL_FILE = /(?:^|[\\/])(kibi-[a-z0-9-]+)[\\/]SKILL\.md\b/i;
function skillName(name) {
  return KIBI_SKILL_NAMES.has(name) ? name : "other";
}
function skillInStrings(value, depth) {
  if (typeof value === "string") {
    const match = SKILL_FILE.exec(value);
    return match ? skillName(match[1].toLowerCase()) : undefined;
  }
  if (depth <= 0)
    return;
  for (const child of Object.values(value ?? {}).slice(0, 50)) {
    const found = skillInStrings(child, depth - 1);
    if (found)
      return found;
  }
  return;
}
function kibiSkillLoad(toolName, toolInput) {
  if (/^skill$/i.test(String(toolName).trim()) && isRecord5(toolInput)) {
    for (const key of ["skill", "name", "command"]) {
      const value = toolInput[key];
      if (typeof value !== "string")
        continue;
      const bare = value.trim().split(":").at(-1).toLowerCase();
      if (/^kibi-[a-z0-9-]+$/.test(bare))
        return skillName(bare);
    }
  }
  return skillInStrings(toolInput, 3);
}
function recentPath(directory) {
  return path13.join(directory, RECENT_FILE);
}
function entries(value) {
  return Array.isArray(value) ? value : [];
}
function fresh(entry, now, windowMs) {
  return isRecord5(entry) && typeof entry.t === "number" && now - entry.t <= windowMs;
}
function readRecent(directory, now) {
  let parsed = {};
  try {
    parsed = JSON.parse(String(fs10.readFileSync(recentPath(directory)))) ?? parsed;
  } catch {}
  return {
    calls: entries(parsed.calls).filter((entry) => fresh(entry, now, RETRY_WINDOW_MS) && typeof entry.o === "string"),
    skills: entries(parsed.skills).filter((entry) => fresh(entry, now, SKILL_WINDOW_MS))
  };
}
function writeRecent(directory, recent) {
  try {
    fs10.mkdirSync(directory, { recursive: true });
    const file = recentPath(directory);
    const temporary = `${file}.${process.pid}.${randomUUID2()}.tmp`;
    fs10.writeFileSync(temporary, JSON.stringify({
      calls: recent.calls.slice(-MAX_RECENT_ENTRIES),
      skills: recent.skills.slice(-MAX_RECENT_ENTRIES)
    }));
    fs10.renameSync(temporary, file);
  } catch {}
}
function rememberSkillLoad(directory, workspaceHash, now = Date.now()) {
  const recent = readRecent(directory, now);
  recent.skills.push({ w: workspaceHash, t: now });
  writeRecent(directory, recent);
}

// ../agent-core/dist/usage-telemetry.js
import { createHash as createHash7, randomUUID as randomUUID3 } from "node:crypto";
import fs11 from "node:fs";
import os from "node:os";
import path14 from "node:path";
import { fileURLToPath } from "node:url";
var DEFAULT_TELEMETRY_KEY = "phc_A5z8jRhD528abGJiTtPfgu4d4hpbEbfiJr9iUGn9TMsY";
var DEFAULT_TELEMETRY_HOST = "https://eu.i.posthog.com";
var QUEUE_FILE = "telemetry-queue.jsonl";
var SESSIONS_FILE = "telemetry-sessions.json";
var SESSION_MARKER_MAX_AGE_MS = 30 * 60 * 1000;
var MAX_SESSION_MARKERS = 200;
var CONFIG_FILE = "telemetry.json";
var SENDING_SUFFIX = ".sending";
var FLUSH_BATCH_EVENTS = 20;
var FLUSH_MAX_AGE_MS = 5 * 60 * 1000;
var STALE_CLAIM_MS = 10 * 60 * 1000;
var MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
var MAX_QUEUE_BYTES = 1024 * 1024;
var DEFAULT_FLUSH_TIMEOUT_MS = 1500;
var TELEMETRY_EVENT_VERSION = 2;
var REJECTED_CATEGORIES = new Set([
  "bootstrap_plan_rejected",
  "branch_unresolved",
  "check_violations",
  "coarse_symbol_linkage",
  "conflicting_input",
  "detached_head",
  "entity_not_found",
  "entity_validation_failed",
  "firm_decision_locked",
  "generated_artifacts_stale",
  "git_conflicts_unresolved",
  "git_not_available",
  "git_repository_unreadable",
  "git_required",
  "incomplete_propositions",
  "input_read_failed",
  "integration_failed",
  "inventory_ingestion_failed",
  "invalid_project_config",
  "invalid_relationship",
  "legacy_branch_storage",
  "migration_plan_refused",
  "missing_input",
  "query_limit_exceeded",
  "relationship_source_mismatch",
  "relationship_validation_failed",
  "semantic_contradiction",
  "symbol_granularity_violation",
  "tests_failed",
  "uncompiled_source",
  "unknown_operation",
  "upsert_dry_run_invalid",
  "validation_failed"
]);
function flagValue(value) {
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized))
    return true;
  if (["0", "false", "no", "off"].includes(normalized))
    return false;
  return;
}
var CI_ENV_KEYS = [
  "CI",
  "CONTINUOUS_INTEGRATION",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "BUILDKITE",
  "CIRCLECI",
  "TRAVIS",
  "TF_BUILD",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "BITBUCKET_BUILD_NUMBER",
  "CODEBUILD_BUILD_ID",
  "DRONE",
  "APPVEYOR",
  "SEMAPHORE",
  "BUILDKITE_BUILD_ID",
  "CF_BUILD_ID",
  "HEROKU_TEST_RUN_ID"
];
var TEST_ENV_KEYS = [
  "NODE_ENV=test",
  "JEST_WORKER_ID",
  "VITEST",
  "VITEST_WORKER_ID",
  "NODE_TEST_CONTEXT"
];
function automationName(env, keys) {
  for (const key of keys) {
    const [name, expected] = key.split("=");
    const value = env[name]?.trim();
    if (!value)
      continue;
    if (expected !== undefined) {
      if (value === expected)
        return key;
      continue;
    }
    if (flagValue(value) !== false)
      return name;
  }
  return;
}
var HOST_ENV_KEYS = [
  ["CLAUDECODE=1", "claude-code"],
  ["CURSOR_AGENT=1", "cursor"],
  ["CODEX_SANDBOX", "codex"],
  ["CODEX_THREAD_ID", "codex"],
  ["GEMINI_CLI=1", "gemini-cli"],
  ["OPENCODE=1", "opencode"]
];
var SESSION_ENV_KEYS = [
  "KIBI_SESSION_ID",
  "CLAUDE_CODE_SESSION_ID",
  "CODEX_THREAD_ID"
];
function hostKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function detectTelemetryHost(env = process.env) {
  const explicit = env.KIBI_HOST?.trim() || env.KIBI_MCP_HOST?.trim();
  if (explicit)
    return hostKey(explicit) || undefined;
  for (const [key, host] of HOST_ENV_KEYS) {
    if (automationName(env, [key]))
      return host;
  }
  const agent = env.AI_AGENT?.trim().split("_")[0];
  return agent ? hostKey(agent) || undefined : undefined;
}
function detectTelemetrySession(env = process.env) {
  for (const key of SESSION_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value)
      return value;
  }
  return;
}
function remoteEnvironment(env) {
  return flagValue(env.CLAUDE_CODE_REMOTE) === true || flagValue(env.CODESPACES) === true || Boolean(env.GITPOD_WORKSPACE_ID?.trim());
}
function realDirectory(directory) {
  try {
    return fs11.realpathSync(directory);
  } catch {
    return path14.resolve(directory);
  }
}
function sandboxedHome(env) {
  const home = (env.HOME ?? env.USERPROFILE)?.trim();
  if (!home)
    return false;
  const temp = realDirectory(os.tmpdir());
  const resolved = realDirectory(home);
  return resolved.startsWith(`${temp}${path14.sep}`);
}
var KIBI_REPOSITORY_PACKAGE = "kibi";
function moduleFileFromUrl(readUrl) {
  let file;
  try {
    const url = readUrl();
    if (typeof url === "string")
      file = fileURLToPath(url);
  } catch {}
  return file;
}
function thisModuleFile() {
  return moduleFileFromUrl(() => import.meta.url);
}
function insideKibiCheckout(file) {
  const resolved = realDirectory(file);
  if (resolved.split(/[\\/]/).includes("node_modules"))
    return false;
  let current = path14.dirname(resolved);
  for (;; ) {
    try {
      const manifest = JSON.parse(fs11.readFileSync(path14.join(current, "package.json"), "utf8"));
      if (manifest.name === KIBI_REPOSITORY_PACKAGE && fs11.existsSync(path14.join(current, "packages", "agent-core"))) {
        return true;
      }
    } catch {}
    const parent = path14.dirname(current);
    if (parent === current)
      return false;
    current = parent;
  }
}
var checkoutCache = new Map;
function detectTelemetryChannel(env = process.env, moduleFile = thisModuleFile() ?? null) {
  return telemetryChannel(env, moduleFile).channel;
}
function telemetryChannel(env = process.env, moduleFile = thisModuleFile() ?? null) {
  const explicit = env.KIBI_TELEMETRY_CHANNEL?.trim();
  if (explicit)
    return {
      channel: telemetryCategory(explicit),
      source: "KIBI_TELEMETRY_CHANNEL"
    };
  if (!moduleFile)
    return { channel: "release", source: "installed" };
  let fromCheckout = checkoutCache.get(moduleFile);
  if (fromCheckout === undefined) {
    fromCheckout = insideKibiCheckout(moduleFile);
    checkoutCache.set(moduleFile, fromCheckout);
  }
  return fromCheckout ? { channel: "source", source: "checkout" } : { channel: "release", source: "installed" };
}
function telemetryDirectory(env = process.env) {
  const explicit = env.KIBI_TELEMETRY_DIR?.trim();
  if (explicit)
    return explicit;
  if (process.platform === "win32" && env.LOCALAPPDATA) {
    return path14.join(env.LOCALAPPDATA, "kibi");
  }
  const stateHome = env.XDG_STATE_HOME?.trim();
  return path14.join(stateHome || path14.join(env.HOME || os.homedir(), ".local", "state"), "kibi");
}
function readTelemetryConfig(env = process.env) {
  try {
    const parsed = JSON.parse(String(fs11.readFileSync(path14.join(telemetryDirectory(env), CONFIG_FILE))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function writeTelemetryConfig(config, env) {
  const directory = telemetryDirectory(env);
  fs11.mkdirSync(directory, { recursive: true });
  fs11.writeFileSync(path14.join(directory, CONFIG_FILE), `${JSON.stringify(config, null, 2)}
`);
}
function telemetryStatus(env = process.env) {
  const directory = telemetryDirectory(env);
  const { channel, source } = telemetryChannel(env);
  const status = (enabled, reason) => ({
    enabled,
    reason,
    directory,
    channel,
    channelSource: source
  });
  const explicit = flagValue(env.KIBI_TELEMETRY);
  if (explicit === false)
    return status(false, "KIBI_TELEMETRY=0");
  if (flagValue(env.DO_NOT_TRACK) === true) {
    return status(false, "DO_NOT_TRACK=1");
  }
  const preference = readTelemetryConfig(env).preference;
  if (preference === "disabled") {
    return status(false, "disabled with `kibi telemetry disable`");
  }
  if (telemetryKey(env) === "")
    return status(false, "no telemetry key");
  if (explicit === true)
    return status(true, "KIBI_TELEMETRY=1");
  const processEnv = process.env;
  const ciName = automationName(env, CI_ENV_KEYS) ?? automationName(processEnv, CI_ENV_KEYS);
  if (ciName)
    return status(false, `CI environment (${ciName})`);
  const testName = automationName(env, TEST_ENV_KEYS) ?? automationName(processEnv, TEST_ENV_KEYS);
  if (testName)
    return status(false, `test environment (${testName})`);
  if (sandboxedHome(env)) {
    return status(false, "sandboxed home in the temp directory (harness run)");
  }
  if (preference === "enabled") {
    return status(true, "enabled with `kibi telemetry enable`");
  }
  return status(true, "on by default; anonymous, opt-out");
}
function telemetryEnabled(env = process.env) {
  return telemetryStatus(env).enabled;
}
function telemetryKey(env) {
  const override = env.KIBI_TELEMETRY_KEY;
  return (override === undefined ? DEFAULT_TELEMETRY_KEY : override).trim();
}
function telemetryHost(env) {
  return (env.KIBI_TELEMETRY_HOST?.trim() || DEFAULT_TELEMETRY_HOST).replace(/\/+$/, "");
}
function installId(env) {
  const config = readTelemetryConfig(env);
  if (typeof config.installId === "string" && config.installId !== "") {
    return config.installId;
  }
  const created = randomUUID3();
  try {
    writeTelemetryConfig({ ...config, installId: created }, env);
  } catch {}
  return created;
}
function hashTelemetryId(value) {
  return createHash7("sha256").update("kibi-telemetry\x00").update(value).digest("hex").slice(0, 16);
}
function runtimeName() {
  return typeof globalThis.Bun === "undefined" ? "node" : "bun";
}
function sessionMarkersPath(env) {
  return path14.join(telemetryDirectory(env), SESSIONS_FILE);
}
function readSessionMarkers(env) {
  try {
    const parsed = JSON.parse(String(fs11.readFileSync(sessionMarkersPath(env))));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function workspaceKey(workspaceRoot) {
  return hashTelemetryId(`workspace\x00${realDirectory(workspaceRoot)}`);
}
function rememberHookSession(workspaceRoot, sessionId, env = process.env) {
  if (!sessionId.trim() || !telemetryEnabled(env))
    return;
  const now = Date.now();
  const markers = readSessionMarkers(env);
  markers[workspaceKey(workspaceRoot)] = {
    session: hashTelemetryId(sessionId.trim()),
    at: now
  };
  const kept = Object.entries(markers).filter(([, marker]) => typeof marker?.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS).sort(([, left], [, right]) => right.at - left.at).slice(0, MAX_SESSION_MARKERS);
  try {
    const file = sessionMarkersPath(env);
    fs11.mkdirSync(path14.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID3()}.tmp`;
    fs11.writeFileSync(temporary, JSON.stringify(Object.fromEntries(kept)));
    fs11.renameSync(temporary, file);
  } catch {}
}
function workspaceSessionHash(startDirectory, env = process.env) {
  const markers = readSessionMarkers(env);
  const now = Date.now();
  let current = path14.resolve(startDirectory);
  for (;; ) {
    const marker = markers[workspaceKey(current)];
    if (marker && typeof marker.session === "string" && typeof marker.at === "number" && now - marker.at <= SESSION_MARKER_MAX_AGE_MS) {
      return marker.session;
    }
    const parent = path14.dirname(current);
    if (parent === current)
      return;
    current = parent;
  }
}
function sessionProperty(source, env) {
  const sessionId = source.sessionId?.trim() || detectTelemetrySession(env);
  if (sessionId)
    return hashTelemetryId(sessionId);
  return source.workspaceRoot ? workspaceSessionHash(source.workspaceRoot, env) ?? null : null;
}
function baseProperties(source, env) {
  return {
    distinct_id: installId(env),
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: "kibi",
    telemetry_version: TELEMETRY_EVENT_VERSION,
    package: source.packageName,
    package_version: source.packageVersion ?? null,
    host: source.host && hostKey(source.host) || detectTelemetryHost(env) || "unknown",
    remote: remoteEnvironment(env),
    channel: detectTelemetryChannel(env),
    session: sessionProperty(source, env),
    os: process.platform,
    arch: process.arch,
    runtime: runtimeName(),
    runtime_version: process.versions.node.split(".")[0]
  };
}
function queuePath(env) {
  return path14.join(telemetryDirectory(env), QUEUE_FILE);
}
function appendEvent(event, env) {
  try {
    const file = queuePath(env);
    fs11.mkdirSync(path14.dirname(file), { recursive: true });
    try {
      if (fs11.statSync(file).size > MAX_QUEUE_BYTES)
        return;
    } catch {}
    fs11.appendFileSync(file, `${JSON.stringify(event)}
`);
  } catch {}
}
function telemetryCategory(value) {
  const trimmed = value?.trim();
  if (!trimmed)
    return null;
  return /^[A-Za-z0-9_.:+-]{1,160}$/.test(trimmed) ? trimmed.toLowerCase() : "unclassified";
}
function rememberTelemetrySkillLoad(workspaceRoot, env = process.env) {
  if (!telemetryEnabled(env))
    return;
  rememberSkillLoad(telemetryDirectory(env), workspaceKey(workspaceRoot));
}
function recordHookTelemetry(source, hook, env = process.env) {
  if (!telemetryEnabled(env))
    return;
  appendEvent({
    event: "kibi_hook",
    timestamp: new Date().toISOString(),
    properties: {
      ...baseProperties(source, env),
      hook_event: hook.hookEvent,
      hook_action: hook.hookAction,
      path_kind: hook.pathKind ?? null,
      kb_operation: hook.kbOperation ?? null,
      kb_used_before: hook.kbUsedBefore ?? null,
      requirement_count: hook.requirementCount ?? null,
      skill: hook.skill ?? null
    }
  }, env);
}
function parseQueued(text, now) {
  const events = [];
  for (const line of text.split(`
`)) {
    try {
      const event = JSON.parse(line);
      const age = now - Date.parse(event.timestamp);
      if (Number.isFinite(age) && age <= MAX_EVENT_AGE_MS)
        events.push(event);
    } catch {}
  }
  return events;
}
function flushDue(file, now) {
  let text;
  try {
    text = fs11.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const lines = text.split(`
`).filter((line) => line.trim() !== "");
  if (lines.length === 0)
    return false;
  if (lines.length >= FLUSH_BATCH_EVENTS)
    return true;
  try {
    const first = JSON.parse(lines[0]);
    return now - Date.parse(first.timestamp) >= FLUSH_MAX_AGE_MS;
  } catch {
    return true;
  }
}
function claimBatches(directory, now) {
  const claimed = [];
  let names;
  try {
    names = fs11.readdirSync(directory);
  } catch {
    return claimed;
  }
  for (const name of names) {
    if (!name.endsWith(SENDING_SUFFIX))
      continue;
    const file = path14.join(directory, name);
    try {
      if (now - fs11.statSync(file).mtimeMs < STALE_CLAIM_MS)
        continue;
      const reclaimed = `${file}.${randomUUID3()}${SENDING_SUFFIX}`;
      fs11.renameSync(file, reclaimed);
      claimed.push(reclaimed);
    } catch {}
  }
  const queue = path14.join(directory, QUEUE_FILE);
  const target = path14.join(directory, `${QUEUE_FILE}.${process.pid}.${randomUUID3()}${SENDING_SUFFIX}`);
  try {
    fs11.renameSync(queue, target);
    claimed.push(target);
  } catch {}
  return claimed;
}
async function flushTelemetry(options = {}, env = process.env) {
  if (!telemetryEnabled(env))
    return 0;
  const directory = telemetryDirectory(env);
  const now = Date.now();
  if (!options.force && !flushDue(queuePath(env), now))
    return 0;
  const claimed = claimBatches(directory, now);
  const events = [];
  for (const file of claimed) {
    try {
      events.push(...parseQueued(fs11.readFileSync(file, "utf8"), now));
    } catch {}
  }
  const release = () => {
    for (const file of claimed)
      fs11.rmSync(file, { force: true });
  };
  if (events.length === 0) {
    release();
    return 0;
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController;
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS);
  timer.unref();
  try {
    const response = await fetchImpl(`${telemetryHost(env)}/batch/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: telemetryKey(env),
        historical_migration: false,
        batch: events
      }),
      signal: controller.signal
    });
    if (!response.ok && response.status >= 500)
      throw new Error;
    release();
    return response.ok ? events.length : 0;
  } catch {
    release();
    for (const event of events)
      appendEvent(event, env);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// ../agent-core/dist/hook-usage-log.js
var HOOK_ACTION_SKILL_LOADED = "skill_loaded";
function hookTelemetryEnabled(env = process.env) {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}
function adapterPackage(host) {
  return host === "claude-code" ? "kibi-claude" : `kibi-${host}`;
}
function appendHookUsage(row, env = process.env) {
  if (row.trace.action === undefined)
    return;
  recordHookTelemetry({
    packageName: row.packageName ?? adapterPackage(row.host),
    packageVersion: row.packageVersion,
    host: row.host,
    sessionId: row.sessionId
  }, {
    hookEvent: row.event,
    hookAction: row.trace.action,
    pathKind: row.trace.pathKind,
    kbOperation: row.trace.kbOperation,
    kbUsedBefore: row.trace.kbUsedBefore,
    requirementCount: row.trace.requirementIds?.length,
    skill: row.trace.skill
  }, env);
  if (row.trace.action === HOOK_ACTION_SKILL_LOADED) {
    rememberTelemetrySkillLoad(row.workspaceRoot, env);
  }
  if (!hookTelemetryEnabled(env))
    return;
  const finishedAt = new Date;
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID4()}`,
    tool: `hook_${row.event}`,
    interface: "hook",
    host: row.host,
    package_version: row.packageVersion ?? null,
    workspace_root: row.workspaceRoot,
    session_id: row.sessionId ?? null,
    hook_event: row.event,
    host_tool: row.hostTool ?? null,
    hook_action: trace.action,
    path: trace.path ?? null,
    path_kind: trace.pathKind ?? null,
    requirement_ids: trace.requirementIds ?? [],
    kb_operation: trace.kbOperation ?? null,
    kb_used_before: trace.kbUsedBefore ?? null,
    status: "success",
    duration_ms: finishedAt.getTime() - row.startedAt.getTime()
  };
  try {
    const logPath = path15.join(row.workspaceRoot, ".kb", "usage.log");
    fs12.mkdirSync(path15.dirname(logPath), { recursive: true });
    fs12.appendFileSync(logPath, `${JSON.stringify(record)}
`);
  } catch {}
}
function skillLoadTrace(toolName, toolInput) {
  const skill = kibiSkillLoad(toolName, toolInput);
  return skill ? { action: HOOK_ACTION_SKILL_LOADED, skill } : undefined;
}
var TURN_END_EVENTS = new Set(["stop", "sessionend"]);
async function finishHookTelemetry(input, env = process.env) {
  try {
    if (input.workspaceRoot && input.sessionId) {
      rememberHookSession(input.workspaceRoot, input.sessionId, env);
    }
    const turnEnd = TURN_END_EVENTS.has(input.event.toLowerCase().replace(/[^a-z]/g, ""));
    await flushTelemetry({ force: turnEnd }, env);
  } catch {}
}
function readPackageVersion(packageJsonPath) {
  try {
    const parsed = JSON.parse(String(fs12.readFileSync(packageJsonPath)));
    const version = parsed.version;
    if (typeof version === "string")
      return version;
  } catch {}
  return null;
}

// ../agent-core/dist/workspace-optin.js
import fs13 from "node:fs";
import path16 from "node:path";
var KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT"
];
function nextAncestorDirectory(current) {
  const parent = path16.dirname(current);
  return parent === current ? undefined : parent;
}
function hasKibiManifest(directory) {
  return fs13.existsSync(path16.join(directory, ".kb", "manifest.json"));
}
function hasGitBoundary(directory) {
  return fs13.existsSync(path16.join(directory, ".git"));
}
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      const root = path16.resolve(value);
      return { root, optedIn: hasKibiManifest(root) };
    }
  }
  const start = path16.resolve(startDir?.trim() ? startDir : process.cwd());
  let current = start;
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }
  return { root: start, optedIn: false };
}

// src/kb-tools.ts
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value) {
  if (typeof value === "string")
    return value.length > 0 ? [value] : [];
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}
function canonicalKbOperation(toolName) {
  const operation = canonicalKbToolName(toolName);
  return /^kb_[a-z_]+$/.test(String(operation)) ? operation : undefined;
}
function payloadOf(toolInput) {
  if (!isRecord6(toolInput))
    return {};
  const nested = toolInput.arguments ?? toolInput.args;
  return isRecord6(nested) ? nested : toolInput;
}
function usageFromPayload(operation, payload) {
  const paths = [
    ...strings(payload.sourceFile),
    ...strings(payload.sourceFiles)
  ];
  if (Array.isArray(payload.sourceLocations)) {
    for (const location of payload.sourceLocations) {
      if (isRecord6(location))
        paths.push(...strings(location.path));
    }
  }
  const ids = [...strings(payload.id), ...strings(payload.ids)];
  const check = operation === "kb_check";
  return {
    operation,
    paths,
    ids,
    check,
    checkAll: check && paths.length === 0 && (payload.includeWorkingTreeDiff === true || payload.changed === true)
  };
}
function extractMcpKbUsage(toolName, toolInput) {
  const operation = canonicalKbOperation(toolName);
  if (!operation)
    return;
  const payload = payloadOf(toolInput);
  return usageFromPayload(effectiveKbOperation(operation, payload), payload);
}
function isVerifiedGitCommit(command) {
  const gitCommit = /(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$|[;&|)])/;
  if (!gitCommit.test(command))
    return false;
  return !/\s(?:--no-verify|-n)(?=\s|$)/.test(command);
}
function extractCliKbUsage(command) {
  const operation = kibiCliOperation(command);
  if (!operation)
    return;
  let payload = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline) {
    const json = inline[1];
    try {
      payload = JSON.parse(json);
    } catch {}
  }
  const usage = usageFromPayload(operation, payload);
  if (operation === "kb_check" && usage.paths.length === 0) {
    usage.checkAll = true;
  }
  return usage;
}

// src/knowledge-index.ts
function loadKnowledgeIndex2(workspaceRoot, cacheDir) {
  return loadKnowledgeIndex(workspaceRoot, cacheDir);
}

// src/path-policy.ts
function toWorkspacePath2(workspaceRoot, rawPath, eventCwd) {
  return toWorkspacePath(workspaceRoot, rawPath, eventCwd);
}
function classifyPath2(relativePath) {
  return classifyPath(relativePath);
}

// src/session-state.ts
import { createHash as createHash8 } from "node:crypto";
import fs14 from "node:fs";
import path17 from "node:path";
var JOURNAL = "session.jsonl";
function workspaceDataDir(pluginData, workspaceRoot) {
  if (!pluginData)
    return;
  const key = createHash8("sha256").update(path17.resolve(workspaceRoot)).digest("hex").slice(0, 32);
  return path17.join(pluginData, "workspaces", key);
}
function sessionDir(workspaceDir, sessionId) {
  if (!workspaceDir)
    return;
  const trimmed = sessionId?.trim() ?? "";
  const key = trimmed.length > 0 ? createHash8("sha256").update(trimmed).digest("hex").slice(0, 32) : "unattributed";
  return path17.join(workspaceDir, "sessions", key);
}
function emptySessionState() {
  return {
    shownRead: new Set,
    shownEdit: new Set,
    notices: new Set,
    kbUsed: false,
    exploredPaths: new Set,
    exploredIds: new Set,
    pendingSource: [],
    reminded: new Set,
    commandStartedAt: undefined,
    requestWords: [],
    rulePhrase: undefined,
    ruleReason: undefined,
    firmAsked: new Map,
    firmAskedAt: new Map,
    firmAskedEdit: new Map,
    firmConfirmed: new Set,
    sourceEdited: false,
    kbRecorded: false,
    contextResets: 0
  };
}
function applyEvent(state, event) {
  switch (event.kind) {
    case "shown":
      (event.surface === "read" ? state.shownRead : state.shownEdit).add(event.path);
      return;
    case "notice":
      state.notices.add(event.name);
      return;
    case "kb":
      state.kbUsed = true;
      if (event.operation === "kb_upsert")
        state.kbRecorded = true;
      for (const explored of event.paths)
        state.exploredPaths.add(explored);
      for (const id of event.ids)
        state.exploredIds.add(id);
      return;
    case "edited": {
      for (const id of state.firmAsked.get(event.path) ?? []) {
        if (event.edit !== undefined && state.firmAskedEdit.get(id) === event.edit)
          state.firmConfirmed.add(id);
      }
      state.firmAsked.delete(event.path);
      if (event.pathKind !== "source")
        return;
      state.sourceEdited = true;
      state.pendingSource = [
        ...state.pendingSource.filter((pending) => pending !== event.path),
        event.path
      ];
      state.reminded.delete(event.path);
      return;
    }
    case "checked":
      state.pendingSource = event.all ? [] : state.pendingSource.filter((pending) => !event.paths.includes(pending));
      return;
    case "reminded":
      for (const reminded of event.paths)
        state.reminded.add(reminded);
      return;
    case "command_started":
      state.commandStartedAt = Math.max(state.commandStartedAt ?? 0, event.at);
      return;
    case "prompt":
      state.requestWords = event.words;
      if (event.phrase) {
        state.rulePhrase = event.phrase;
        state.ruleReason = event.reason || undefined;
      }
      return;
    case "firm_asked":
      state.firmAsked.set(event.path, [
        ...new Set([...state.firmAsked.get(event.path) ?? [], ...event.ids])
      ]);
      if (event.at !== undefined)
        for (const id of event.ids)
          state.firmAskedAt.set(id, event.at);
      for (const id of event.ids)
        if (event.edit === undefined)
          state.firmAskedEdit.delete(id);
        else
          state.firmAskedEdit.set(id, event.edit);
      return;
    case "firm_reviewed": {
      const left = (state.firmAsked.get(event.path) ?? []).filter((id) => !event.ids.includes(id));
      if (left.length > 0)
        state.firmAsked.set(event.path, left);
      else
        state.firmAsked.delete(event.path);
      return;
    }
    case "context_reset":
      state.contextResets++;
      state.shownRead.clear();
      state.shownEdit.clear();
      state.notices.clear();
      state.exploredPaths.clear();
      state.exploredIds.clear();
      return;
  }
}
function sessionJournal(dir) {
  return dir ? [path17.join(dir, JOURNAL)] : [];
}
function loadSessionState(dir) {
  const state = emptySessionState();
  if (!dir)
    return state;
  let journal;
  try {
    journal = fs14.readFileSync(path17.join(dir, JOURNAL), "utf8");
  } catch {
    return state;
  }
  for (const line of journal.split(`
`)) {
    try {
      applyEvent(state, JSON.parse(line));
    } catch {}
  }
  return state;
}
function appendSessionEvents(dir, events) {
  if (!dir || events.length === 0)
    return;
  try {
    fs14.mkdirSync(dir, { recursive: true });
    fs14.appendFileSync(path17.join(dir, JOURNAL), events.map((event) => `${JSON.stringify(event)}
`).join(""));
  } catch {}
}
// ../agent-core/dist/session-brief.js
var SESSION_BRIEF_LINES = [
  "Kibi records this repository's requirements and decisions with their reasons.",
  "- Before changing behaviour, kb_search for the recorded intent and kb_query the requirement that governs it.",
  "- Record a rule the person states with kb_record in the same turn, with their reason; it needs no permission.",
  "- Before your final message, run the tests linked to the code you changed, then kb_check with changed: true.",
  "- A request that would make a recorded requirement or decision false (narrowing it or adding an exception counts; touching its code does not) is a question, not a task: name the rule and ask."
];
var SESSION_BRIEF = SESSION_BRIEF_LINES.join(`
`);
var CHECK_STEP_PREFIX = "- Before your final message,";
var REMEMBER_FINISH_LINE = "- Before your final message, run kb_check with changed: true.";
function sessionBriefWith(hostLines, level) {
  const brief = level === "remember" ? SESSION_BRIEF_LINES.map((line) => line.startsWith(CHECK_STEP_PREFIX) ? REMEMBER_FINISH_LINE : line).join(`
`) : SESSION_BRIEF;
  return [brief, ...hostLines.filter((line) => line.length > 0)].join(`
`);
}

// src/snippets.ts
function searchTip(linkedFileCount) {
  return `Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (${linkedFileCount} source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.`;
}
var DIRECT_KB_ACCESS_NOTE = "Kibi: .kb/ holds Kibi-managed knowledge. kb_query/kb_search read it and kb_upsert writes it while keeping the branch store, relationships, and validation consistent; direct file reads miss relationships and direct edits bypass validation.";
function sessionStartContext(linkedFileCount) {
  return sessionBriefWith([
    `Kibi hooks show requirement snippets before reads and edits of the ${linkedFileCount} linked source files. MCP tools: mcp__plugin_kibi-claude_kibi__kb_*; CLI peer: \`npx --no-install kibi <route> --input -\`. Guidance: the kibi-claude:kibi-usage skill.`
  ]);
}
function stopReminder(paths) {
  const shown = paths.slice(0, 8);
  const more = paths.length > shown.length ? ` +${paths.length - shown.length}` : "";
  return [
    `Kibi: ${paths.length} source ${paths.length === 1 ? "file" : "files"} changed this session without a Kibi impact check: ${shown.join(", ")}${more}.`,
    `kb_check({changed:true, sourceFiles:${JSON.stringify(shown)}}) gives the commit gate's verdict on ${paths.length === 1 ? "it" : "them"}: each finding says whether it blocks the commit. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`
  ].join(`
`);
}

// src/usage-log.ts
import path18 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var pluginVersion = readPackageVersion(path18.join(path18.dirname(fileURLToPath2(import.meta.url)), "..", "package.json"));
function appendHookUsage2(row, env = process.env) {
  appendHookUsage({
    ...row,
    host: "claude-code",
    packageVersion: pluginVersion
  }, env);
}
var flushHookTelemetry = finishHookTelemetry;

// src/hook-runner.ts
var readTools = new Set(["Read"]);
var editTools = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "NotebookEdit"
]);
var searchTools = new Set(["Grep", "Glob"]);
function context(event, text) {
  return {
    hookSpecificOutput: { hookEventName: event, additionalContext: text }
  };
}
function fieldsOf(toolInput) {
  return toolInput ?? {};
}
function toolPath(toolInput) {
  const fields = fieldsOf(toolInput);
  const candidate = fields.file_path ?? fields.notebook_path;
  return typeof candidate === "string" ? candidate : undefined;
}
function bashCommand(toolInput) {
  return String(fieldsOf(toolInput).command);
}
function symbolsFor(workspace, relativePath) {
  return workspace.index().files[relativePath] ?? [];
}
function linkedFileCount(index) {
  return Object.values(index.files).filter((symbols) => symbols.some((symbol) => symbol.implements.length > 0)).length;
}
function readFocus(toolInput) {
  const fields = fieldsOf(toolInput);
  const offset = typeof fields.offset === "number" ? fields.offset : undefined;
  const limit = typeof fields.limit === "number" ? fields.limit : undefined;
  if (offset === undefined && limit === undefined)
    return;
  const start = Math.max(1, offset ?? 1);
  return [{ start, end: limit !== undefined ? start + limit - 1 : start }];
}
function editFocus2(absolutePath, toolInput) {
  return editFocus(absolutePath, toolInput);
}
function isExplored(state, relativePath) {
  return state.exploredPaths.has(relativePath);
}
function requirementIds(symbols) {
  return implementedRequirementIds(symbols);
}
function editFingerprint(toolName, toolInput) {
  return createHash9("sha256").update(JSON.stringify([toolName ?? null, toolInput ?? null])).digest("hex");
}
function firmEdit(relativePath, symbols, focus, wholeFile, state, workspace, edit) {
  if (!workspace.confirmFirm)
    return;
  const touched = {
    symbols,
    focus,
    wholeFile,
    absolutePath: path19.join(workspace.root, relativePath),
    summarize: workspace.summarize,
    confirmed: state.firmConfirmed
  };
  const { ids, symbol } = firmRequirementsTouched({
    ...touched,
    reviewed: firmEditReviewed(workspace.root, relativePath, (id) => state.firmAskedEdit.get(id) === edit ? state.firmAskedAt.get(id) : undefined)
  });
  const reviewedIds = firmRequirementsTouched(touched).ids.filter((id) => !ids.includes(id));
  if (reviewedIds.length > 0)
    appendSessionEvents(workspace.stateDir, [
      { kind: "firm_reviewed", path: relativePath, ids: reviewedIds }
    ]);
  if (ids.length === 0)
    return;
  return {
    path: relativePath,
    where: symbol ? `${symbol.title} in ${relativePath}` : relativePath,
    ids,
    edit
  };
}
function withFirmConfirmation(output, firm, workspace, trace) {
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "firm_asked",
      path: firm.path,
      ids: firm.ids,
      at: Date.now(),
      edit: firm.edit
    }
  ]);
  trace.action = "edit_firm_ask";
  trace.requirementIds = firm.ids;
  const describe = (id) => workspace.summarize(id);
  const agentContext = [
    output.hookSpecificOutput?.additionalContext,
    firmEditContext(firm.ids)
  ].filter((part) => part !== undefined).join(`

`);
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: firmEditConfirmation(firm.where, firm.ids.map(describe)),
      additionalContext: agentContext
    }
  };
}
function guardedChangeAsk(change, trace, updatedInput) {
  trace.action = change.kind === "level" ? "level_change_ask" : "evidence_lowering_ask";
  if (change.kind === "evidence")
    trace.requirementIds = [change.requirementId];
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: guardedChangeConfirmation(change),
      additionalContext: guardedChangeContext(change),
      ...updatedInput ? { updatedInput } : {}
    }
  };
}
function preToolUse(input, workspace, trace = {}) {
  const toolName = input.toolName;
  if (isKibiMcpToolName(toolName)) {
    const stamped = stampKibiWorkspace(toolName, input.toolInput, workspace.root);
    const lowering = guardedChangeOf({
      workspaceRoot: workspace.root,
      toolName,
      toolInput: input.toolInput
    });
    if (lowering)
      return guardedChangeAsk(lowering, trace, stamped);
    return stamped === undefined ? {} : {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: stamped
      }
    };
  }
  const state = loadSessionState(workspace.stateDir);
  trace.kbUsedBefore = state.kbUsed;
  const events = [];
  const emit = (text, action) => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };
  if (toolName === "Bash") {
    return bashPreToolUse(input, workspace, state, trace);
  }
  if (searchTools.has(toolName)) {
    trace.action = "search_silent";
    const rows = toolName === "Grep" ? grepToolRows(input, state, workspace, trace, events) : undefined;
    if (rows) {
      spendSearchTip(state, events);
      return emit(rows, "read_snippet");
    }
    if (state.kbUsed || state.notices.has("search-tip"))
      return {};
    const linked = linkedFileCount(workspace.index());
    if (linked === 0)
      return {};
    events.push({ kind: "notice", name: "search-tip" });
    return emit(searchTip(linked), "search_tip");
  }
  const isRead = readTools.has(toolName);
  const isEdit = editTools.has(toolName);
  if (!isRead && !isEdit)
    return {};
  const rawPath = toolPath(input.toolInput);
  const target = rawPath ? toWorkspacePath2(workspace.root, rawPath, input.cwd) : undefined;
  if (!target)
    return {};
  const kind = classifyPath2(target.relative);
  trace.path = target.relative;
  trace.pathKind = kind;
  if (isEdit) {
    const change = guardedChangeOf({
      workspaceRoot: workspace.root,
      toolName,
      toolInput: input.toolInput,
      relativePath: target.relative
    });
    if (change)
      return guardedChangeAsk(change, trace);
  }
  if (kind === "kb") {
    trace.action = "kb_direct_silent";
    if (state.notices.has("kb-direct"))
      return {};
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (kind === "other")
    return {};
  const relativePath = target.relative;
  const symbols = symbolsFor(workspace, relativePath);
  trace.requirementIds = requirementIds(symbols);
  if (isRead) {
    trace.action = "read_silent";
    const focus = readFocus(input.toolInput);
    const rows = requirementRows([
      {
        absolute: target.absolute,
        directory: false,
        ...focus ? { focus } : {}
      }
    ], state, workspace, trace, events);
    if (!rows)
      return {};
    return emit(rows, "read_snippet");
  }
  trace.action = "edit_silent";
  const focus = toolName === "Edit" || toolName === "MultiEdit" ? editFocus2(target.absolute, input.toolInput) : undefined;
  const firm = removesOnlyDeadImplementsComments(target.absolute, input.toolInput, input.cwd ?? workspace.root) ? undefined : firmEdit(relativePath, symbols, focus, toolName === "Write", state, workspace, editFingerprint(toolName, input.toolInput));
  const output = editPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, emit);
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}
function editPreToolUse(relativePath, kind, symbols, focus, state, workspace, events, emit) {
  if (state.shownEdit.has(relativePath)) {
    const symbol = focusedSymbols(symbols, focus)[0];
    if (!symbol || symbol.implements.length === 0)
      return {};
    const key = `${relativePath}#${symbol.id}`;
    if (state.shownEdit.has(key))
      return {};
    const update = focusUpdate(relativePath, symbols, focus);
    events.push({ kind: "shown", surface: "edit", path: key });
    return emit(update, "edit_focus_update");
  }
  const alreadyKnown = state.shownRead.has(relativePath) || isExplored(state, relativePath);
  const focusSymbol = focusedSymbols(symbols, focus)[0];
  if (focusSymbol) {
    events.push({
      kind: "shown",
      surface: "edit",
      path: `${relativePath}#${focusSymbol.id}`
    });
  }
  events.push({ kind: "shown", surface: "edit", path: relativePath });
  const snippetInput = {
    relativePath,
    symbols,
    surface: "edit",
    focus,
    summarize: workspace.summarize
  };
  if (alreadyKnown) {
    const update = editKnowledgeUpdate(snippetInput);
    if (update)
      return emit(update, "edit_update_snippet");
    appendSessionEvents(workspace.stateDir, events);
    return {};
  }
  const snippet = fileKnowledgeSnippet(snippetInput);
  if (snippet)
    return emit(snippet, "edit_snippet");
  if (kind === "source") {
    const index = workspace.index();
    const unread = index.manifest === "unreadable" || index.coordinateFiles.includes(relativePath) && !index.unlinkedFiles.includes(relativePath);
    if (!unread) {
      return emit(unownedSourceNote(relativePath, requirementCandidatesForPath(workspace.root, relativePath, undefined, state.requestWords)), "edit_unowned_note");
    }
    if (!state.notices.has("manifest-unreadable")) {
      events.push({ kind: "notice", name: "manifest-unreadable" });
      return emit(unreadableManifestNote(relativePath), "edit_manifest_note");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function spendSearchTip(state, events) {
  if (!state.notices.has("search-tip"))
    events.push({ kind: "notice", name: "search-tip" });
}
function requirementRows(reads, state, workspace, trace, events, admits) {
  const rows = hookReadRows(reads, {
    workspaceRoot: workspace.root,
    files: workspace.index().files,
    isSource: (relativePath) => classifyPath2(relativePath) === "source",
    admits,
    summarize: workspace.summarize,
    stateDir: workspace.stateDir,
    sessionKey: `context-${state.contextResets}`,
    shownIds: state.exploredIds,
    shownPaths: new Set([...state.exploredPaths, ...state.shownEdit])
  });
  if (!rows)
    return;
  for (const shown of rows.paths)
    events.push({ kind: "shown", surface: "read", path: shown });
  trace.path = rows.paths[0];
  trace.pathKind = "source";
  trace.requirementIds = rows.ids;
  return rows.text;
}
function grepToolRows(input, state, workspace, trace, events) {
  const fields = fieldsOf(input.toolInput);
  const read = searchToolRead({
    pattern: fields.pattern,
    path: fields.path,
    cwd: input.cwd ?? workspace.root,
    ignoreCase: fields["-i"] === true
  });
  if (!read)
    return;
  const glob = typeof fields.glob === "string" ? fields.glob : undefined;
  return requirementRows([read], state, workspace, trace, events, glob ? globFilter(glob) : undefined);
}
function bashPreToolUse(input, workspace, state, trace) {
  const events = [{ kind: "command_started", at: Date.now() }];
  const command = bashCommand(input.toolInput);
  const emit = (text, action) => {
    trace.action = action;
    appendSessionEvents(workspace.stateDir, events);
    return context("PreToolUse", text);
  };
  const cwd = input.cwd ?? workspace.root;
  const guarded = guardedChangeOfShellCommand(workspace.root, command, cwd);
  const edited = new Set(commandEditPaths(command, cwd));
  const firm = [...edited].map((absolute) => {
    const target = toWorkspacePath2(workspace.root, absolute, input.cwd);
    if (!target || classifyPath2(target.relative) !== "source")
      return;
    const symbols = symbolsFor(workspace, target.relative);
    return firmEdit(target.relative, symbols, undefined, true, state, workspace, editFingerprint("Bash", command));
  }).find((candidate) => candidate !== undefined);
  const output = bashContext(input, workspace, state, trace, command, edited, events, emit);
  if (guarded)
    return guardedChangeAsk(guarded, trace);
  return firm ? withFirmConfirmation(output, firm, workspace, trace) : output;
}
function bashContext(input, workspace, state, trace, command, edited, events, emit) {
  let namesKb = false;
  const cwd = input.cwd ?? workspace.root;
  const reads = commandReadViews(command, cwd);
  const inspected = new Set([
    ...edited,
    ...reads.filter((r) => !r.directory).map((r) => r.absolute)
  ]);
  for (const absolute of inspected) {
    const target = toWorkspacePath2(workspace.root, absolute, input.cwd);
    if (!target)
      continue;
    const kind = classifyPath2(target.relative);
    if (kind === "kb")
      namesKb = true;
    if (kind === "kb" || kind === "other")
      continue;
    const symbols = symbolsFor(workspace, target.relative);
    if (edited.has(absolute)) {
      if (state.shownEdit.has(target.relative))
        continue;
      const alreadyKnown = state.shownRead.has(target.relative) || isExplored(state, target.relative);
      const snippetInput = {
        relativePath: target.relative,
        symbols,
        surface: "edit",
        summarize: workspace.summarize
      };
      const note = alreadyKnown ? editKnowledgeUpdate(snippetInput) : fileKnowledgeSnippet(snippetInput);
      if (!note)
        continue;
      trace.path = target.relative;
      trace.pathKind = kind;
      trace.requirementIds = requirementIds(symbols);
      events.push({ kind: "shown", surface: "edit", path: target.relative });
      return emit(note, alreadyKnown ? "edit_update_snippet" : "edit_snippet");
    }
  }
  const rows = requirementRows(reads.filter(({ absolute }) => !edited.has(absolute)), state, workspace, trace, events);
  if (rows) {
    if (isSearchCommand(command))
      spendSearchTip(state, events);
    return emit(rows, "read_snippet");
  }
  if (namesKb && !state.notices.has("kb-direct")) {
    events.push({ kind: "notice", name: "kb-direct" });
    return emit(DIRECT_KB_ACCESS_NOTE, "kb_direct_note");
  }
  if (isSearchCommand(command) && !state.kbUsed && !state.notices.has("search-tip")) {
    const linked = linkedFileCount(workspace.index());
    if (linked > 0) {
      events.push({ kind: "notice", name: "search-tip" });
      return emit(searchTip(linked), "search_tip");
    }
  }
  appendSessionEvents(workspace.stateDir, events);
  return {};
}
function bashChanges(workspace, events, trace, edit) {
  const state = loadSessionState(workspace.stateDir);
  if (state.commandStartedAt === undefined)
    return;
  let note;
  for (const relative of filesChangedSince(workspace.root, state.commandStartedAt)) {
    const pathKind = classifyPath2(relative);
    if (pathKind === "kb" || pathKind === "other")
      continue;
    events.push({ kind: "edited", path: relative, pathKind, edit });
    const symbols = symbolsFor(workspace, relative);
    const owners = requirementIds(symbols);
    if (trace.action === undefined && owners.length > 0) {
      trace.action = "edited";
      trace.kbUsedBefore = state.kbUsed;
      trace.path = relative;
      trace.pathKind = pathKind;
      trace.requirementIds = owners;
    }
    if (note !== undefined || state.shownEdit.has(relative))
      continue;
    const alreadyKnown = state.shownRead.has(relative) || isExplored(state, relative);
    const snippetInput = {
      relativePath: relative,
      symbols,
      surface: "edit",
      summarize: workspace.summarize
    };
    const snippet = alreadyKnown ? editKnowledgeUpdate(snippetInput) : fileKnowledgeSnippet(snippetInput);
    if (snippet) {
      note = snippet;
    } else if (pathKind === "source" && workspace.index().manifest !== "unreadable") {
      note = unownedSourceNote(relative, requirementCandidatesForPath(workspace.root, relative, undefined, state.requestWords));
    }
    if (note !== undefined) {
      events.push({ kind: "shown", surface: "edit", path: relative });
    }
  }
  return note;
}
function captureTemplateNote(workspace, events) {
  const field = (event, name) => event[name];
  if (!events.some((event) => field(event, "pathKind") === "source") || events.some((event) => field(event, "operation") === "kb_upsert"))
    return;
  const state = loadSessionState(workspace.stateDir);
  if (state.rulePhrase === undefined || state.kbRecorded || state.notices.has("capture-template"))
    return;
  events.push({ kind: "notice", name: "capture-template" });
  return ruleCaptureTemplate(state.rulePhrase, state.ruleReason);
}
function recordKbUsage(usage, workspace, events) {
  const paths = usage.paths.map((candidate) => toWorkspacePath2(workspace.root, candidate, workspace.root)?.relative).filter((candidate) => candidate !== undefined);
  events.push({
    kind: "kb",
    operation: usage.operation,
    paths,
    ids: usage.ids
  });
  if (usage.check) {
    events.push({ kind: "checked", paths, all: usage.checkAll });
  }
}
function postToolUse(input, workspace, trace = {}) {
  const toolName = input.toolName;
  const events = [];
  const kbUsedBefore = () => workspace.telemetry ? loadSessionState(workspace.stateDir).kbUsed : undefined;
  const recordUsage = (usage) => {
    trace.kbUsedBefore = kbUsedBefore();
    trace.action = "kb_usage";
    trace.kbOperation = usage.operation;
    recordKbUsage(usage, workspace, events);
  };
  if (editTools.has(toolName)) {
    const rawPath = toolPath(input.toolInput);
    const target = rawPath ? toWorkspacePath2(workspace.root, rawPath, input.cwd) : undefined;
    if (target) {
      const pathKind = classifyPath2(target.relative);
      events.push({
        kind: "edited",
        path: target.relative,
        pathKind,
        edit: editFingerprint(toolName, input.toolInput)
      });
      if (pathKind !== "other") {
        trace.kbUsedBefore = kbUsedBefore();
        trace.action = "edited";
        trace.path = target.relative;
        trace.pathKind = pathKind;
        if (workspace.telemetry && pathKind !== "kb") {
          trace.requirementIds = requirementIds(symbolsFor(workspace, target.relative));
        }
      }
    }
  } else if (toolName === "Bash") {
    const command = bashCommand(input.toolInput);
    const usage = extractCliKbUsage(command);
    if (usage)
      recordUsage(usage);
    if (isRequirementUpsert({ command })) {
      markDecisionFlag({ stateDir: workspace.stateDir, sessionId: input.sessionId }, "requirement-recorded");
    }
    const changed = bashChanges(workspace, events, trace, editFingerprint("Bash", command));
    const note = changed ?? captureTemplateNote(workspace, events);
    if (isVerifiedGitCommit(command) && hasKibiPreCommitGate(workspace.root)) {
      events.push({ kind: "checked", paths: [], all: true });
    }
    appendSessionEvents(workspace.stateDir, events);
    return note ? context("PostToolUse", note) : {};
  } else {
    const usage = extractMcpKbUsage(toolName, input.toolInput);
    if (usage)
      recordUsage(usage);
    if (usage?.operation === "kb_upsert" && isRequirementUpsert(input.toolInput)) {
      markDecisionFlag({ stateDir: workspace.stateDir, sessionId: input.sessionId }, "requirement-recorded");
    }
  }
  const template = captureTemplateNote(workspace, events);
  appendSessionEvents(workspace.stateDir, events);
  return template ? context("PostToolUse", template) : {};
}
function stop(input, workspace, trace = {}) {
  if (input.stopHookActive)
    return {};
  const state = loadSessionState(workspace.stateDir);
  const unreminded = state.pendingSource.filter((pending) => !state.reminded.has(pending));
  const capture = state.sourceEdited && !state.kbRecorded && !state.notices.has("capture-stop");
  const signoff = !capture && claimSignoffReminder({ stateDir: workspace.stateDir, sessionId: input.sessionId }, workspace.root);
  if (unreminded.length === 0 && !capture && !signoff)
    return {};
  const events = [];
  const parts = [];
  if (capture) {
    events.push({ kind: "notice", name: "capture-stop" });
    parts.push(captureReminder(state.rulePhrase));
  }
  if (signoff)
    parts.push(signoffReminder());
  if (unreminded.length > 0) {
    events.push({ kind: "reminded", paths: unreminded });
    parts.push(stopReminder(unreminded));
  }
  appendSessionEvents(workspace.stateDir, events);
  trace.action = capture ? "stop_capture_reminder" : signoff ? "stop_signoff_reminder" : "stop_reminder";
  trace.kbUsedBefore = state.kbUsed;
  return context("Stop", parts.join(`
`));
}
function userPromptSubmit(input, workspace, trace) {
  const prompt = input.prompt ?? "";
  const rule = statedRule(prompt, workspace.root);
  const reason = statedReason(prompt, workspace.root);
  startDecisionSession({ stateDir: workspace.stateDir, sessionId: input.sessionId }, "prompt", { hostFiles: sessionJournal(workspace.stateDir) });
  appendSessionEvents(workspace.stateDir, [
    {
      kind: "prompt",
      words: requestTopicWords(prompt),
      rule: rule !== undefined,
      phrase: rule ?? "",
      reason
    }
  ]);
  if (rule === undefined) {
    trace.action = "prompt_silent";
    return {};
  }
  trace.action = "prompt_rule_note";
  return context("UserPromptSubmit", rulePromptNote(rule, reason));
}
async function runHook(rawInput, environment = {}) {
  const startedAt = new Date;
  const input = parseHookInput(rawInput);
  const pluginData = environment.pluginData ?? process.env.CLAUDE_PLUGIN_DATA ?? path19.join(os2.tmpdir(), `kibi-claude-${process.getuid?.() ?? "user"}`);
  const projectDir = environment.projectDir ?? process.env.CLAUDE_PROJECT_DIR;
  const resolved = resolveKibiWorkspace(input.cwd ?? projectDir ?? process.cwd());
  if (!resolved.optedIn)
    return {};
  const dataDir = workspaceDataDir(pluginData, resolved.root);
  let index;
  const workspace = {
    root: resolved.root,
    stateDir: sessionDir(dataDir, input.sessionId),
    index: () => {
      index ??= loadKnowledgeIndex2(resolved.root, dataDir);
      return index;
    },
    telemetry: hookTelemetryEnabled(environment.env),
    confirmFirm: confirmFirmEdits(environment.env ?? process.env),
    summarize: createEntitySummarizer(resolved.root)
  };
  const trace = {};
  const output = dispatchHook(input, workspace, trace);
  appendHookUsage2({
    workspaceRoot: resolved.root,
    event: input.event,
    sessionId: input.sessionId,
    hostTool: input.toolName,
    trace,
    startedAt
  }, environment.env);
  await flushHookTelemetry({
    event: input.event,
    workspaceRoot: resolved.root,
    sessionId: input.sessionId
  }, environment.env);
  return output;
}
function dispatchHook(input, workspace, trace) {
  switch (input.event) {
    case "SessionStart": {
      trace.action = "session_start";
      startDecisionSession({ stateDir: workspace.stateDir, sessionId: input.sessionId }, input.source === "resume" || input.source === "compact" ? "resume" : "startup", { hostFiles: sessionJournal(workspace.stateDir) });
      if (input.source === "compact" || input.source === "clear") {
        appendSessionEvents(workspace.stateDir, [{ kind: "context_reset" }]);
      }
      return context("SessionStart", [
        sessionStartContext(linkedFileCount(workspace.index())),
        checkoutSessionNote(workspace.root)
      ].filter((line) => line !== null).join(`
`));
    }
    case "UserPromptSubmit":
      return userPromptSubmit(input, workspace, trace);
    case "PreToolUse": {
      const output = preToolUse(input, workspace, trace);
      if (trace.action === undefined) {
        Object.assign(trace, skillLoadTrace(input.toolName, input.toolInput));
      }
      return output;
    }
    case "PostToolUse":
      return postToolUse(input, workspace, trace);
    case "Stop":
      return stop(input, workspace, trace);
    default:
      return {};
  }
}
async function main() {
  const result = await runHook(parseStdinJson(await readStdin()));
  process.stdout.write(`${JSON.stringify(result)}
`);
}
function isInvokedAsCli(argv1, moduleUrl) {
  const invokedPath = argv1 ? pathToFileURL(path19.resolve(argv1)).href : "";
  return moduleUrl === invokedPath;
}
async function runHookCli() {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`kibi-claude hook error: ${message}
`);
    process.stdout.write(`{}
`);
  }
}
async function runHookCliIfMain(isMain = isInvokedAsCli(process.argv[1], import.meta.url), start = runHookCli) {
  if (isMain)
    await start();
}
runHookCliIfMain();
export {
  CONFIRM_FIRM_EDITS_ENV,
  editFocus2 as editFocus,
  guardedChangeAsk,
  isInvokedAsCli,
  main,
  readFocus,
  requirementRows,
  runHook,
  runHookCli,
  runHookCliIfMain,
  spendSearchTip
};
