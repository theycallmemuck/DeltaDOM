# DeltaDOM Examples

This document provides detailed examples of using DeltaDOM in various scenarios.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Real-World Scenarios](#real-world-scenarios)
- [Performance Patterns](#performance-patterns)
- [Integration Examples](#integration-examples)

## Basic Examples

### Example 1: Simple Text Update

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

// Create a DeltaDOM instance
const deltaDOM = new DeltaDOM();

// Original element
const oldDiv = document.createElement('div');
oldDiv.innerHTML = '<p>Hello</p>';

// Updated element
const newDiv = document.createElement('div');
newDiv.innerHTML = '<p>Hello World</p>';

// Compute differences
const changes = deltaDOM.diff(oldDiv, newDiv);

console.log('Changes detected:', changes);
// Output: [{ type: 'updateText', element: <p>, oldContent: 'Hello', newContent: 'Hello World' }]

// Apply changes
deltaDOM.patch(changes);
```

### Example 2: Adding and Removing Elements

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

const deltaDOM = new DeltaDOM();

// Original list
const oldList = document.createElement('ul');
oldList.innerHTML = `
  <li>Item 1</li>
  <li>Item 2</li>
`;

// Updated list with insertion and deletion
const newList = document.createElement('ul');
newList.innerHTML = `
  <li>Item 1</li>
  <li>Item 1.5</li>
  <li>Item 2</li>
  <li>Item 3</li>
`;

// Apply update
const changes = deltaDOM.update(oldList, newList);

console.log(`Applied ${changes.length} changes`);
```

### Example 3: Attribute Changes

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

const deltaDOM = new DeltaDOM();

// Original button
const oldButton = document.createElement('button');
oldButton.className = 'btn';
oldButton.textContent = 'Click me';

// Updated button
const newButton = document.createElement('button');
newButton.className = 'btn btn-primary';
newButton.textContent = 'Click me';
newButton.disabled = true;

// Detect changes
const changes = deltaDOM.diff(oldButton, newButton);

changes.forEach(change => {
  if (change.type === 'updateAttributes') {
    console.log('Attribute changes:', change.changes);
    // Output: [
    //   { name: 'class', oldValue: 'btn', newValue: 'btn btn-primary' },
    //   { name: 'disabled', oldValue: undefined, newValue: 'true' }
    // ]
  }
});

deltaDOM.patch(changes);
```

## Real-World Scenarios

### Scenario 1: Live Markdown Editor

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';
import { marked } from 'marked'; // Example markdown parser

class LiveMarkdownEditor {
  constructor(textareaId, previewId) {
    this.textarea = document.getElementById(textareaId);
    this.preview = document.getElementById(previewId);
    this.deltaDOM = new DeltaDOM({
      processMediaElement: this.handleMediaElement.bind(this)
    });
    
    this.setupListeners();
  }
  
  setupListeners() {
    let timeout;
    this.textarea.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.updatePreview(), 300);
    });
  }
  
  updatePreview() {
    const markdown = this.textarea.value;
    const html = marked(markdown);
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Protect code blocks from modification
    temp.querySelectorAll('pre').forEach(pre => {
      pre.dataset.immutable = 'true';
      pre.dataset.blockPosition = pre.textContent.substring(0, 50);
    });
    
    // Efficiently update preview
    const changes = this.deltaDOM.update(this.preview, temp);
    
    console.log(`Preview updated with ${changes.length} changes`);
  }
  
  handleMediaElement(element) {
    if (element.tagName === 'IMG') {
      element.loading = 'lazy';
      element.onerror = () => {
        element.src = '/placeholder.png';
      };
    }
  }
}

// Initialize editor
const editor = new LiveMarkdownEditor('markdown-input', 'preview-pane');
```

### Scenario 2: Dynamic Table Updates

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

class DataTable {
  constructor(tableElement) {
    this.table = tableElement;
    this.deltaDOM = new DeltaDOM();
    this.data = [];
  }
  
  setData(newData) {
    this.data = newData;
    this.render();
  }
  
  updateRow(rowId, newValues) {
    const rowIndex = this.data.findIndex(row => row.id === rowId);
    if (rowIndex !== -1) {
      this.data[rowIndex] = { ...this.data[rowIndex], ...newValues };
      this.render();
    }
  }
  
  render() {
    const newTable = this.buildTable(this.data);
    const changes = this.deltaDOM.update(this.table, newTable);
    
    // Log performance metrics
    const changeTypes = changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Table update stats:', changeTypes);
  }
  
  buildTable(data) {
    const table = document.createElement('table');
    
    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0] || {}).forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.dataset.rowId = row.id; // Important for matching
      
      Object.values(row).forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    return table;
  }
}

// Usage
const table = new DataTable(document.getElementById('data-table'));

// Initial data
table.setData([
  { id: 1, name: 'John', age: 30, city: 'NYC' },
  { id: 2, name: 'Jane', age: 25, city: 'LA' }
]);

// Update a row (only changed cells will be updated)
setTimeout(() => {
  table.updateRow(1, { age: 31 });
}, 2000);

// Add a new row
setTimeout(() => {
  table.setData([
    { id: 1, name: 'John', age: 31, city: 'NYC' },
    { id: 2, name: 'Jane', age: 25, city: 'LA' },
    { id: 3, name: 'Bob', age: 35, city: 'Chicago' }
  ]);
}, 4000);
```

### Scenario 3: Component-Based UI Updates

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

class UIComponent {
  constructor(element) {
    this.element = element;
    this.deltaDOM = new DeltaDOM();
    this.state = {};
  }
  
  setState(newState) {
    const oldState = this.state;
    this.state = { ...this.state, ...newState };
    
    console.log('State changed:', {
      old: oldState,
      new: this.state
    });
    
    this.update();
  }
  
  update() {
    const newElement = this.render();
    this.deltaDOM.update(this.element, newElement);
  }
  
  render() {
    // Override in subclass
    return document.createElement('div');
  }
}

class CounterComponent extends UIComponent {
  constructor(element) {
    super(element);
    this.state = { count: 0 };
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'counter';
    
    const display = document.createElement('h2');
    display.textContent = `Count: ${this.state.count}`;
    
    const btnInc = document.createElement('button');
    btnInc.textContent = '+';
    btnInc.onclick = () => this.setState({ count: this.state.count + 1 });
    
    const btnDec = document.createElement('button');
    btnDec.textContent = '-';
    btnDec.onclick = () => this.setState({ count: this.state.count - 1 });
    
    const btnReset = document.createElement('button');
    btnReset.textContent = 'Reset';
    btnReset.onclick = () => this.setState({ count: 0 });
    
    container.appendChild(display);
    container.appendChild(btnInc);
    container.appendChild(btnDec);
    container.appendChild(btnReset);
    
    return container;
  }
}

// Usage
const counter = new CounterComponent(document.getElementById('counter'));
counter.update(); // Initial render
```

## Performance Patterns

### Pattern 1: Batch Updates

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

class BatchUpdater {
  constructor() {
    this.deltaDOM = new DeltaDOM();
    this.pendingUpdates = [];
    this.updateScheduled = false;
  }
  
  scheduleUpdate(oldElement, newElement) {
    this.pendingUpdates.push({ oldElement, newElement });
    
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }
  
  flush() {
    console.log(`Processing ${this.pendingUpdates.length} pending updates`);
    
    const startTime = performance.now();
    
    // Compute all diffs
    const allChanges = this.pendingUpdates.flatMap(({ oldElement, newElement }) => 
      this.deltaDOM.diff(oldElement, newElement)
    );
    
    // Apply all patches at once
    this.deltaDOM.patch(allChanges);
    
    const endTime = performance.now();
    console.log(`Batch update completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    this.pendingUpdates = [];
    this.updateScheduled = false;
  }
}

// Usage
const batcher = new BatchUpdater();

// Schedule multiple updates
for (let i = 0; i < 100; i++) {
  const oldElement = document.getElementById(`item-${i}`);
  const newElement = createUpdatedElement(i);
  batcher.scheduleUpdate(oldElement, newElement);
}

// All updates will be batched and applied in next animation frame
```

### Pattern 2: Selective Updates with Shouldupdate

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

class SmartComponent {
  constructor(element) {
    this.element = element;
    this.deltaDOM = new DeltaDOM();
    this.previousProps = {};
  }
  
  update(props) {
    if (this.shouldUpdate(props)) {
      const newElement = this.render(props);
      this.deltaDOM.update(this.element, newElement);
      this.previousProps = props;
      
      console.log('Component updated');
    } else {
      console.log('Update skipped (no changes)');
    }
  }
  
  shouldUpdate(newProps) {
    // Only update if props actually changed
    return JSON.stringify(newProps) !== JSON.stringify(this.previousProps);
  }
  
  render(props) {
    const div = document.createElement('div');
    div.innerHTML = `
      <h3>${props.title}</h3>
      <p>${props.description}</p>
    `;
    return div;
  }
}

// Usage
const component = new SmartComponent(document.getElementById('smart-component'));

component.update({ title: 'Hello', description: 'World' }); // Updates
component.update({ title: 'Hello', description: 'World' }); // Skipped
component.update({ title: 'Hi', description: 'World' });    // Updates
```

### Pattern 3: Virtual Scrolling with DeltaDOM

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

class VirtualList {
  constructor(containerElement, itemHeight = 50) {
    this.container = containerElement;
    this.itemHeight = itemHeight;
    this.deltaDOM = new DeltaDOM();
    this.items = [];
    this.visibleRange = { start: 0, end: 0 };
    
    this.setupScrollListener();
  }
  
  setItems(items) {
    this.items = items;
    this.render();
  }
  
  setupScrollListener() {
    this.container.addEventListener('scroll', () => {
      requestAnimationFrame(() => this.render());
    });
  }
  
  calculateVisibleRange() {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    
    const start = Math.floor(scrollTop / this.itemHeight);
    const end = Math.ceil((scrollTop + viewportHeight) / this.itemHeight);
    
    return { start, end };
  }
  
  render() {
    const newRange = this.calculateVisibleRange();
    
    // Only update if range changed
    if (
      newRange.start === this.visibleRange.start &&
      newRange.end === this.visibleRange.end
    ) {
      return;
    }
    
    this.visibleRange = newRange;
    
    const newList = this.buildVisibleList();
    this.deltaDOM.update(this.container.firstChild, newList);
  }
  
  buildVisibleList() {
    const list = document.createElement('div');
    list.style.height = `${this.items.length * this.itemHeight}px`;
    list.style.position = 'relative';
    
    const visibleItems = this.items.slice(
      this.visibleRange.start,
      this.visibleRange.end
    );
    
    visibleItems.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.style.position = 'absolute';
      itemElement.style.top = `${(this.visibleRange.start + index) * this.itemHeight}px`;
      itemElement.style.height = `${this.itemHeight}px`;
      itemElement.textContent = item;
      itemElement.dataset.index = this.visibleRange.start + index;
      
      list.appendChild(itemElement);
    });
    
    return list;
  }
}

// Usage
const virtualList = new VirtualList(document.getElementById('virtual-list'));

// Generate large dataset
const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
virtualList.setItems(items);

// Only visible items are rendered and efficiently updated on scroll
```

## Integration Examples

### Integration with Custom Virtual DOM

```javascript
import DeltaDOM from './DeltaDOM/src/index.js';

// Your virtual DOM representation
class VNode {
  constructor(tagName, props = {}, children = []) {
    this.type = 'element';
    this.tagName = tagName;
    this.attributes = props;
    this.children = children.map(child => 
      typeof child === 'string' 
        ? { type: 'text', content: child }
        : child
    );
    this._nodeId = props.key || `${tagName}-${Math.random()}`;
  }
}

// Virtual DOM to real DOM converter
function vNodeToDOM(vNode) {
  if (vNode.type === 'text') {
    return document.createTextNode(vNode.content);
  }
  
  const element = document.createElement(vNode.tagName);
  
  for (const [key, value] of Object.entries(vNode.attributes)) {
    if (key !== 'key') {
      element.setAttribute(key, value);
    }
  }
  
  vNode.children.forEach(child => {
    element.appendChild(vNodeToDOM(child));
  });
  
  return element;
}

// Usage with DeltaDOM
class VirtualDOMApp {
  constructor(rootElement) {
    this.root = rootElement;
    this.deltaDOM = new DeltaDOM();
    this.currentVNode = null;
  }
  
  render(vNode) {
    if (!this.currentVNode) {
      // Initial render
      const realDOM = vNodeToDOM(vNode);
      this.root.appendChild(realDOM);
      this.currentVNode = vNode;
    } else {
      // Update with DeltaDOM
      const oldRealDOM = this.root.firstChild;
      const newRealDOM = vNodeToDOM(vNode);
      
      this.deltaDOM.patchVirtualNodes(
        this.root,
        this.currentVNode,
        vNode,
        newRealDOM
      );
      
      this.currentVNode = vNode;
    }
  }
}

// Example usage
const app = new VirtualDOMApp(document.getElementById('app'));

// Initial render
app.render(
  new VNode('div', { class: 'container' }, [
    new VNode('h1', {}, ['Hello World']),
    new VNode('p', {}, ['This is a paragraph'])
  ])
);

// Update
setTimeout(() => {
  app.render(
    new VNode('div', { class: 'container' }, [
      new VNode('h1', {}, ['Hello Universe']),
      new VNode('p', {}, ['This is an updated paragraph']),
      new VNode('p', {}, ['New paragraph added'])
    ])
  );
}, 2000);
```

These examples demonstrate the flexibility and power of DeltaDOM in various real-world scenarios. The library can be adapted to fit many different use cases while maintaining high performance.

