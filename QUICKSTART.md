# DeltaDOM Quick Start Guide

Get up and running with DeltaDOM in 5 minutes!

## Installation

```bash
# NPM
npm install deltadom

# Or use directly with ES modules
import DeltaDOM from './DeltaDOM/src/index.js';
```

## Basic Usage - Three Steps

### Step 1: Create a DeltaDOM Instance

```javascript
import DeltaDOM from 'deltadom';

const deltaDOM = new DeltaDOM();
```

### Step 2: Get Your Elements

```javascript
// Your current DOM element
const oldElement = document.getElementById('content');

// Create the updated version
const newElement = document.createElement('div');
newElement.innerHTML = '<h1>Updated Content</h1>';
```

### Step 3: Apply the Update

```javascript
// Option A: Update in one step
deltaDOM.update(oldElement, newElement);

// Option B: Diff first, then patch
const changes = deltaDOM.diff(oldElement, newElement);
console.log(`Found ${changes.length} changes`);
deltaDOM.patch(changes);
```

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>DeltaDOM Example</title>
</head>
<body>
    <div id="app">
        <h1>Hello</h1>
        <p>Original content</p>
    </div>

    <button onclick="update()">Update</button>

    <script type="module">
        import DeltaDOM from './DeltaDOM/src/index.js';
        
        const deltaDOM = new DeltaDOM();
        
        window.update = function() {
            const app = document.getElementById('app');
            
            // Create updated content
            const newApp = document.createElement('div');
            newApp.innerHTML = `
                <h1>Hello World</h1>
                <p>Updated content at ${new Date().toLocaleTimeString()}</p>
            `;
            
            // Apply changes efficiently
            deltaDOM.update(app, newApp);
        };
    </script>
</body>
</html>
```

## Common Use Cases

### 1. Text Content Updates

```javascript
const deltaDOM = new DeltaDOM();

const paragraph = document.getElementById('text');
const updated = document.createElement('p');
updated.textContent = 'New text';

deltaDOM.update(paragraph, updated);
```

### 2. List Updates

```javascript
const deltaDOM = new DeltaDOM();

function renderList(items) {
    const list = document.getElementById('list');
    const newList = document.createElement('ul');
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        newList.appendChild(li);
    });
    
    deltaDOM.update(list, newList);
}

// Use it
renderList(['Item 1', 'Item 2', 'Item 3']);
```

### 3. Attribute Changes

```javascript
const deltaDOM = new DeltaDOM();

const button = document.getElementById('myButton');
const updated = button.cloneNode(true);

// Modify attributes
updated.className = 'btn btn-primary active';
updated.disabled = true;

deltaDOM.update(button, updated);
```

### 4. Protect Heavy Elements

Mark elements that should never be recreated:

```html
<!-- This iframe will be preserved during updates -->
<iframe data-immutable="true" src="https://example.com"></iframe>

<!-- This code block won't be modified -->
<pre data-immutable="true">
    <code>const x = 42;</code>
</pre>
```

### 5. Custom Media Processing

```javascript
const deltaDOM = new DeltaDOM({
    processMediaElement: (element) => {
        if (element.tagName === 'IMG') {
            // Add lazy loading
            element.loading = 'lazy';
            
            // Add error handler
            element.onerror = () => {
                element.src = '/placeholder.png';
            };
        }
    }
});
```

## Performance Tips

### 1. Use Node IDs for Better Matching

```javascript
// In your virtual node structure
const vNode = {
    type: 'element',
    tagName: 'div',
    _nodeId: 'unique-id-123',  // This helps DeltaDOM match nodes efficiently
    children: []
};
```

### 2. Batch Multiple Updates

```javascript
const deltaDOM = new DeltaDOM();
const changes = [];

// Collect all changes
changes.push(...deltaDOM.diff(element1, newElement1));
changes.push(...deltaDOM.diff(element2, newElement2));
changes.push(...deltaDOM.diff(element3, newElement3));

// Apply all at once
deltaDOM.patch(changes);
```

### 3. Mark Immutable Content

```javascript
// Prevent unnecessary comparisons
codeBlock.dataset.immutable = 'true';
```

## API Quick Reference

### DeltaDOM Class

```javascript
// Constructor
const deltaDOM = new DeltaDOM(options);

// Methods
deltaDOM.diff(oldElement, newElement)     // Returns: Array of changes
deltaDOM.patch(changes)                    // Returns: void
deltaDOM.update(oldElement, newElement)    // Returns: Array of changes
```

### Change Types

```javascript
// Changes returned by diff()
{
  type: 'updateText',       // Text content changed
  type: 'updateAttributes',  // Attributes changed
  type: 'replace',          // Element replaced
  type: 'insertChild',      // Child inserted
  type: 'removeChild',      // Child removed
  type: 'insert',           // Element inserted
  type: 'remove'            // Element removed
}
```

## Debugging

### Log Changes

```javascript
const changes = deltaDOM.diff(oldElement, newElement);

console.log(`Total changes: ${changes.length}`);

changes.forEach(change => {
    console.log(`Type: ${change.type}, Path: ${change.path || 'root'}`);
    
    if (change.type === 'updateText') {
        console.log(`  Old: "${change.oldContent}"`);
        console.log(`  New: "${change.newContent}"`);
    }
});

deltaDOM.patch(changes);
```

### Measure Performance

```javascript
const start = performance.now();
const changes = deltaDOM.update(oldElement, newElement);
const time = performance.now() - start;

console.log(`Updated in ${time.toFixed(2)}ms with ${changes.length} changes`);
```

## Next Steps

- Read the [full documentation](README.md) for advanced features
- Check out [detailed examples](EXAMPLES.md) for real-world scenarios
- Explore the [architecture guide](ARCHITECTURE.md) to understand internals
- Try the [interactive demo](demo.html) in your browser

## Need Help?

- **Issues**: Report bugs or request features on GitHub
- **Questions**: Check existing issues or create a new one
- **Contributing**: See CONTRIBUTING.md for guidelines

## Quick Troubleshooting

### Elements Not Updating?

Check if they're marked as immutable:
```javascript
element.dataset.immutable = 'false'; // or remove the attribute
```

### Performance Issues?

1. Use explicit node IDs
2. Batch updates
3. Mark static content as immutable
4. Avoid very deep nesting (> 10 levels)

### Changes Not Applied?

Make sure you're calling `patch()` after `diff()`:
```javascript
const changes = deltaDOM.diff(old, new);
deltaDOM.patch(changes); // Don't forget this!

// Or use update() to do both:
deltaDOM.update(old, new);
```

## License

MIT - See [LICENSE](LICENSE) for details

