# DeltaDOM

**DeltaDOM** is vanilla JavaScript library for computing differences (diffs) between DOM trees and efficiently applying those changes (patches) to the real DOM. It provides intelligent change detection, structural analysis, and optimized patching strategies to minimize browser reflows and repaints.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Advanced Usage](#advanced-usage)
- [Performance Considerations](#performance-considerations)
- [Examples](#examples)

## Features

- **Efficient Diffing Algorithm**: Uses key-based matching and intelligent heuristics to minimize DOM operations
- **Structural Change Detection**: Automatically detects insertions, deletions, and movements
- **Heavy Element Preservation**: Special handling for iframes, videos, and images with blob URLs
- **Immutable Element Support**: Protects designated elements from unwanted modifications
- **Virtual DOM Compatible**: Works with both real DOM and virtual DOM representations
- **Media Processing**: Built-in support for media element lifecycle management
- **Zero Dependencies**: Pure JavaScript with no external dependencies

## Installation

```bash
npm install deltadom
```

Or use ES modules directly:

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';
```

## Quick Start

### Basic Usage

```javascript
import DeltaDOM from 'deltadom';

// Create instance
const deltaDOM = new DeltaDOM();

// Get your old and new DOM elements
const oldElement = document.getElementById('content');
const newElement = createNewContent(); // Your function that creates updated content

// Compute differences
const changes = deltaDOM.diff(oldElement, newElement);
console.log(`Found ${changes.length} changes`);

// Apply changes
deltaDOM.patch(changes);
```

### One-Step Update

```javascript
import DeltaDOM from 'deltadom';

const deltaDOM = new DeltaDOM();

// Diff and patch in one operation
const changes = deltaDOM.update(oldElement, newElement);
```

## Core Concepts

### 1. Diffing Process

DeltaDOM compares two DOM trees and generates a list of changes. The diffing algorithm:

1. **Node Type Comparison**: Checks if nodes are of the same type (element, text, etc.)
2. **Element Matching**: Uses multiple strategies to match elements:
   - Exact node ID matching
   - Equivalence checking (attributes, content)
   - Simple element matching (fallback for basic elements)
3. **Structural Analysis**: Detects insertions, deletions, and moves
4. **Attribute Comparison**: Identifies changed, added, or removed attributes
5. **Child Reconciliation**: Recursively processes child nodes

### 2. Change Types

DeltaDOM generates different types of change operations:

```javascript
{
  type: 'updateText',      // Text content changed
  type: 'updateAttributes', // Attributes changed
  type: 'replace',         // Entire element replaced
  type: 'insertChild',     // Child element inserted
  type: 'removeChild',     // Child element removed
  type: 'insert',          // New element inserted
  type: 'remove'           // Element removed
}
```

### 3. Patching Strategy

The patching process applies changes in a specific order to ensure consistency:

1. **Removals** (highest priority)
2. **Updates** (text, attributes)
3. **Replacements**
4. **Insertions** (lowest priority)

This ordering prevents issues with invalid DOM states during patching.

## API Reference

### DeltaDOM Class

#### Constructor

```javascript
new DeltaDOM(options)
```

**Parameters:**
- `options` (Object, optional)
  - `processMediaElement` (Function): Callback for custom media element processing

**Example:**
```javascript
const deltaDOM = new DeltaDOM({
  processMediaElement: (element) => {
    console.log('Processing media:', element.tagName);
    // Custom media processing logic
  }
});
```

#### Methods

##### `diff(oldElement, newElement)`

Computes differences between two DOM elements.

**Parameters:**
- `oldElement` (Element): Current DOM element
- `newElement` (Element): New DOM element to compare

**Returns:** `Array` - Array of change operations

**Example:**
```javascript
const changes = deltaDOM.diff(
  document.getElementById('old'),
  document.getElementById('new')
);

// Output structure:
// [
//   { type: 'updateText', path: 'div > p', element: <node>, 
//     oldContent: 'Hello', newContent: 'Hello World' },
//   { type: 'insertChild', path: 'div', parent: <node>, 
//     child: <node>, index: 2 }
// ]
```

##### `patch(changes)`

Applies an array of change operations to the DOM.

**Parameters:**
- `changes` (Array): Array of change operations from `diff()`

**Example:**
```javascript
const changes = deltaDOM.diff(oldElement, newElement);
deltaDOM.patch(changes);
```

##### `update(oldElement, newElement)`

Computes differences and applies them in one operation.

**Parameters:**
- `oldElement` (Element): Current DOM element
- `newElement` (Element): New DOM element

**Returns:** `Array` - Array of applied changes

**Example:**
```javascript
const changes = deltaDOM.update(oldElement, newElement);
console.log(`Applied ${changes.length} changes`);
```

##### `patchVirtualNodes(realParent, oldVNode, newVNode, newRealElement)`

Advanced method for patching virtual DOM nodes directly.

**Parameters:**
- `realParent` (Element): Real DOM parent element
- `oldVNode` (Object): Old virtual node representation
- `newVNode` (Object): New virtual node representation
- `newRealElement` (Element): New real element corresponding to newVNode

**Example:**
```javascript
deltaDOM.patchVirtualNodes(
  document.getElementById('container'),
  oldVirtualNode,
  newVirtualNode,
  newRealElement
);
```

### Exported Utilities

For advanced usage, you can import individual components:

```javascript
import {
  Differ,              // Core diffing engine
  Patcher,             // Core patching engine
  NodeComparator,      // Node comparison utilities
  StructuralComparator,// Structural change detection
  NodeUtils,           // DOM node utilities
  MediaProcessor       // Media element processing
} from 'deltadom';
```

## Architecture

### Module Structure

```
DeltaDOM/
├── src/
│   ├── core/
│   │   ├── Differ.js           # Diffing algorithm implementation
│   │   └── Patcher.js          # Patching algorithm implementation
│   ├── comparison/
│   │   ├── NodeComparator.js   # Node equivalence checking
│   │   └── StructuralComparator.js # Structural change detection
│   ├── utils/
│   │   ├── NodeUtils.js        # DOM node utility functions
│   │   └── MediaProcessor.js   # Media element handling
│   └── index.js                # Main export file
├── package.json
└── README.md
```

### Component Responsibilities

#### Differ (Core Diffing Engine)

Responsible for:
- Comparing DOM elements recursively
- Generating change operation lists
- Detecting structural modifications
- Handling edge cases (null elements, type mismatches)

#### Patcher (Core Patching Engine)

Responsible for:
- Applying change operations to real DOM
- Key-based reconciliation algorithm
- Node movement and reordering
- Heavy element preservation

#### NodeComparator

Provides node comparison strategies:
- `nodesAreEquivalent()`: Strict equivalence checking
- `isSimpleElementMatch()`: Flexible matching for basic elements
- `childrenMatch()`: Child node comparison
- `compareAttributes()`: Attribute-level comparison

#### StructuralComparator

Specializes in detecting:
- Single and multiple insertions
- Single and multiple deletions
- Position-based structural changes
- When to use full replacement vs. incremental updates

#### NodeUtils

Utility functions for:
- Node description and logging
- Heavy element detection (iframes, videos, blob images)
- Media processing requirements
- Attribute updates

#### MediaProcessor

Handles:
- Media element lifecycle
- Image URL validation
- Local file path detection
- Custom media processing callbacks

## Advanced Usage

### Working with Virtual DOM

DeltaDOM can work with virtual DOM representations:

```javascript
const oldVNode = {
  type: 'element',
  tagName: 'div',
  attributes: { class: 'container' },
  children: [
    { type: 'text', content: 'Hello' }
  ],
  _nodeId: 'unique-id-1'
};

const newVNode = {
  type: 'element',
  tagName: 'div',
  attributes: { class: 'container active' },
  children: [
    { type: 'text', content: 'Hello World' }
  ],
  _nodeId: 'unique-id-1'
};

const deltaDOM = new DeltaDOM();
deltaDOM.patchVirtualNodes(
  realDOMElement,
  oldVNode,
  newVNode,
  newRealElement
);
```

### Protecting Elements from Changes

Mark elements as immutable to prevent modifications:

```html
<div data-immutable="true">
  This content will never be modified by DeltaDOM
</div>
```

```javascript
// In your code
const codeBlock = document.createElement('pre');
codeBlock.dataset.immutable = 'true';
codeBlock.textContent = 'const x = 42;';
```

### Custom Media Processing

```javascript
const deltaDOM = new DeltaDOM({
  processMediaElement: (element) => {
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src');
      
      // Convert local paths to blob URLs
      if (src.startsWith('file://')) {
        fetch(src)
          .then(r => r.blob())
          .then(blob => {
            element.src = URL.createObjectURL(blob);
          });
      }
    }
  }
});
```

### Heavy Element Handling

DeltaDOM automatically preserves "heavy" elements to avoid expensive reloads:

```javascript
// These elements are automatically preserved:
// - <iframe>
// - <video>
// - <img> with blob: or data: URLs
// - Elements with data-immutable="true"
// - Elements with data-processed-media="true"

const iframe = document.createElement('iframe');
iframe.src = 'https://example.com';
// DeltaDOM will not remove/recreate this unless absolutely necessary
```

### Detecting Specific Change Types

```javascript
const changes = deltaDOM.diff(oldElement, newElement);

// Filter by change type
const textChanges = changes.filter(c => c.type === 'updateText');
const insertions = changes.filter(c => c.type === 'insertChild');
const removals = changes.filter(c => c.type === 'removeChild');

console.log(`Text changes: ${textChanges.length}`);
console.log(`Insertions: ${insertions.length}`);
console.log(`Removals: ${removals.length}`);
```

## Performance Considerations

### Best Practices

1. **Use Node IDs**: Assign unique `_nodeId` to virtual nodes for better matching
   ```javascript
   const vNode = {
     type: 'element',
     tagName: 'div',
     _nodeId: 'unique-id-123', // Improves matching performance
     children: []
   };
   ```

2. **Batch Updates**: Accumulate changes and apply them together
   ```javascript
   const changes = [];
   changes.push(...deltaDOM.diff(element1, newElement1));
   changes.push(...deltaDOM.diff(element2, newElement2));
   deltaDOM.patch(changes); // Apply all at once
   ```

3. **Mark Immutable Content**: Prevent unnecessary comparisons
   ```javascript
   codeBlock.dataset.immutable = 'true';
   ```

4. **Avoid Deep Nesting**: Very deep DOM trees increase comparison time
   ```javascript
   // Prefer this
   <div>
     <item />
     <item />
   </div>
   
   // Over this
   <div><div><div><div><item /></div></div></div></div>
   ```

### Performance Characteristics

- **Time Complexity**: O(n*m) where n and m are node counts in old and new trees
- **Space Complexity**: O(n+m) for storing change operations
- **Optimizations**:
  - Early exit for equivalent nodes
  - Heavy element skipping
  - Structural change detection (O(n) instead of O(n²) for insertions/deletions)
  - Key-based matching reduces unnecessary comparisons

## Examples

### Example 1: Real-time Preview Updates

```javascript
import DeltaDOM from 'deltadom';

class MarkdownPreview {
  constructor(previewElement) {
    this.preview = previewElement;
    this.deltaDOM = new DeltaDOM();
  }
  
  update(markdownContent) {
    // Convert markdown to HTML
    const newHTML = this.markdownToHTML(markdownContent);
    
    // Create temporary element with new content
    const temp = document.createElement('div');
    temp.innerHTML = newHTML;
    
    // Apply diff
    this.deltaDOM.update(this.preview, temp);
  }
  
  markdownToHTML(md) {
    // Your markdown conversion logic
    return convertedHTML;
  }
}

// Usage
const preview = new MarkdownPreview(document.getElementById('preview'));
preview.update('# Hello\n\nWorld');
```

### Example 2: Form State Synchronization

```javascript
import DeltaDOM from 'deltadom';

class FormSync {
  constructor(formElement) {
    this.form = formElement;
    this.deltaDOM = new DeltaDOM();
  }
  
  syncFromState(formState) {
    // Create new form structure from state
    const newForm = this.buildFormFromState(formState);
    
    // Compute and apply changes
    const changes = this.deltaDOM.diff(this.form, newForm);
    
    // Log what changed
    console.log('Form changes:', changes.map(c => ({
      type: c.type,
      path: c.path
    })));
    
    this.deltaDOM.patch(changes);
  }
  
  buildFormFromState(state) {
    const form = document.createElement('form');
    
    for (const [key, value] of Object.entries(state)) {
      const input = document.createElement('input');
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    
    return form;
  }
}

// Usage
const formSync = new FormSync(document.getElementById('myForm'));
formSync.syncFromState({
  username: 'john',
  email: 'john@example.com'
});
```

### Example 3: List with Insertions and Deletions

```javascript
import DeltaDOM from 'deltadom';

class TodoList {
  constructor(listElement) {
    this.list = listElement;
    this.deltaDOM = new DeltaDOM();
  }
  
  render(todos) {
    const newList = document.createElement('ul');
    
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.textContent = todo.text;
      li.dataset.id = todo.id; // Important for matching
      if (todo.completed) {
        li.classList.add('completed');
      }
      newList.appendChild(li);
    });
    
    // Efficiently update list
    this.deltaDOM.update(this.list, newList);
  }
}

// Usage
const todoList = new TodoList(document.getElementById('todos'));

// Initial render
todoList.render([
  { id: 1, text: 'Buy milk', completed: false },
  { id: 2, text: 'Walk dog', completed: false }
]);

// Update (only changes are applied)
todoList.render([
  { id: 1, text: 'Buy milk', completed: true }, // Status changed
  { id: 2, text: 'Walk dog', completed: false },
  { id: 3, text: 'Read book', completed: false } // New item
]);
```

### Example 4: Content Editor with Preserved Elements

```javascript
import DeltaDOM from 'deltadom';

class RichTextEditor {
  constructor(editorElement) {
    this.editor = editorElement;
    this.deltaDOM = new DeltaDOM({
      processMediaElement: this.handleMedia.bind(this)
    });
  }
  
  updateContent(htmlContent) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    
    // Mark code blocks as immutable
    temp.querySelectorAll('pre code').forEach(block => {
      block.closest('pre').dataset.immutable = 'true';
    });
    
    this.deltaDOM.update(this.editor, temp);
  }
  
  handleMedia(element) {
    if (element.tagName === 'IMG') {
      // Lazy load images
      element.loading = 'lazy';
    }
  }
}

// Usage
const editor = new RichTextEditor(document.getElementById('editor'));
editor.updateContent(`
  <h1>Article Title</h1>
  <p>Some text...</p>
  <pre><code>const x = 42;</code></pre>
  <img src="image.jpg" />
`);
```

### Example 5: Debugging Changes

```javascript
import DeltaDOM from 'deltadom';

const deltaDOM = new DeltaDOM();

// Enable detailed logging
function logChanges(changes) {
  console.group('DOM Changes Detected');
  
  const stats = {
    insertions: 0,
    deletions: 0,
    updates: 0
  };
  
  changes.forEach(change => {
    console.log(`[${change.type}]`, change.path || 'root');
    
    if (change.type.includes('insert')) stats.insertions++;
    else if (change.type.includes('remove')) stats.deletions++;
    else stats.updates++;
    
    // Log detailed information
    switch (change.type) {
      case 'updateText':
        console.log(`  Old: "${change.oldContent}"`);
        console.log(`  New: "${change.newContent}"`);
        break;
      case 'updateAttributes':
        console.table(change.changes);
        break;
    }
  });
  
  console.table(stats);
  console.groupEnd();
}

// Use it
const changes = deltaDOM.diff(oldElement, newElement);
logChanges(changes);
deltaDOM.patch(changes);
```

## Browser Compatibility

DeltaDOM uses standard DOM APIs and ES6 features:

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: 14+
- Node.js: 14+ (with jsdom)

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

1. Code follows existing style
2. Add tests for new features
3. Update documentation
4. Run linting before committing

## Credits

Developed as part of a larger project management system with real-time preview capabilities.

