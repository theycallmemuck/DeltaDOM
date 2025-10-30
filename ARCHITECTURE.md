# DeltaDOM Architecture

This document provides an in-depth look at DeltaDOM's internal architecture, design decisions, and implementation details.

## Table of Contents

- [Overview](#overview)
- [Core Algorithms](#core-algorithms)
- [Module Design](#module-design)
- [Data Structures](#data-structures)
- [Performance Optimizations](#performance-optimizations)
- [Design Decisions](#design-decisions)

## Overview

DeltaDOM is built around two core operations:

1. **Diffing**: Computing differences between two DOM trees
2. **Patching**: Applying those differences to the real DOM

The library is designed with these principles:

- **Modularity**: Each component has a single, well-defined responsibility
- **Performance**: Minimize DOM operations and comparison overhead
- **Flexibility**: Support both real and virtual DOM representations
- **Safety**: Preserve expensive elements and prevent invalid states

## Core Algorithms

### Diffing Algorithm

The diffing algorithm operates in three phases:

#### Phase 1: Node-Level Comparison

```
compareElements(oldElement, newElement)
  ├─ Check node type equality
  ├─ Handle null/undefined cases
  ├─ For text nodes: compare content
  └─ For element nodes:
     ├─ Compare tag names
     ├─ Compare attributes
     └─ Recursively compare children
```

**Time Complexity**: O(n) for each level of the tree

#### Phase 2: Structural Analysis

```
compareChildren(oldChildren, newChildren)
  ├─ Detect simple structural changes:
  │  ├─ Single insertion (O(n))
  │  ├─ Multiple insertions (O(n))
  │  ├─ Single deletion (O(n))
  │  └─ Multiple deletions (O(n))
  ├─ Check if full replacement needed (O(n))
  └─ Default to incremental updates (O(n*m))
```

The structural analysis phase is critical for performance. By detecting common patterns (insertions, deletions), we avoid the O(n*m) complexity of full comparison.

**Example: Insertion Detection**

```javascript
Old children: [A, B, C, D]
New children: [A, B, X, C, D]

Algorithm:
1. Compare A → A ✓
2. Compare B → B ✓
3. Mismatch at position 2
4. Test if inserting at position 2 makes the rest match
5. Compare C → C ✓ (offset by 1)
6. Compare D → D ✓ (offset by 1)
7. Conclusion: Single insertion at position 2

Result: One insertChild operation instead of multiple updates
```

#### Phase 3: Change Operation Generation

The diffing process generates typed change operations:

```javascript
{
  type: 'updateText',
  element: <DOMNode>,
  oldContent: 'Hello',
  newContent: 'Hello World',
  path: 'div > p'
}
```

### Patching Algorithm

The patching algorithm uses a key-based reconciliation strategy:

#### Phase 1: Key Mapping

```
keyBasedPatch(parent, oldChildren, newChildren)
  ├─ Build oldChildMap with unique keys
  │  └─ Key = nodeId || `${type}-${index}-${tagName}`
  ├─ Build newChildMap with unique keys
  └─ Handle key collisions with counter suffix
```

**Key Generation Strategy**:
1. Use explicit `_nodeId` if available (most reliable)
2. Fallback to composite key based on type, index, and tag
3. Add counter suffix to prevent collisions

#### Phase 2: Matching Strategy

For each new child, try matching in order:

```
1. Exact node ID match (O(n))
   ├─ Most reliable
   └─ Best performance

2. Equivalence check (O(n))
   ├─ Compares attributes and content
   └─ Handles renamed elements

3. Simple element match (O(n))
   ├─ Conservative matching for basic elements
   ├─ Requires close proximity (index difference ≤ 2)
   └─ Last resort fallback
```

#### Phase 3: Operation Execution

```
Operations are sorted and executed in order:
1. Removals (prevent invalid references)
2. Updates (modify existing nodes)
3. Insertions (add new nodes)
```

This ordering ensures:
- No references to removed nodes
- Updates happen before structure changes
- Insertions don't interfere with removals

## Module Design

### Core Modules

#### Differ (src/core/Differ.js)

**Responsibility**: Compare DOM trees and generate change operations

**Key Methods**:
- `compareElements(old, new)`: Entry point for comparison
- `compareChildren(old, new)`: Child-level comparison
- `handleStructuralChange()`: Optimized structural updates
- `shouldSkipComparison()`: Performance optimization

**Design Pattern**: Static utility class (no state)

#### Patcher (src/core/Patcher.js)

**Responsibility**: Apply changes to real DOM

**Key Methods**:
- `patchNode(parent, oldVNode, newVNode, newReal)`: Virtual node patching
- `keyBasedPatch()`: Key-based reconciliation
- `executeOperation()`: Single operation application
- `applyChanges()`: Batch change application

**Design Pattern**: Stateful class (holds media processor reference)

### Comparison Modules

#### NodeComparator (src/comparison/NodeComparator.js)

**Responsibility**: Node-level equivalence checking

**Strategies**:
1. **Strict Equivalence**: `nodesAreEquivalent()`
   - For immutable elements: Compare position markers
   - For regular elements: Compare node IDs and key attributes
   - For text nodes: Exact content comparison

2. **Flexible Matching**: `isSimpleElementMatch()`
   - Self-closing elements: Tag name only
   - Container elements: Tag name + similar child count
   - Text nodes: Character count similarity

#### StructuralComparator (src/comparison/StructuralComparator.js)

**Responsibility**: Detect structural changes in child lists

**Patterns Detected**:
- Single insertion at any position
- Multiple insertions (up to 5) at any position
- Single deletion at any position
- Multiple deletions (up to 5) at any position

**Algorithm**: Position testing with O(n) complexity

```javascript
testInsertionAtPosition(oldChildren, newChildren, pos, count):
  // Check if inserting 'count' items at 'pos' makes lists match
  for i in 0..pos:
    if oldChildren[i] != newChildren[i]: return false
  for i in pos..oldChildren.length:
    if oldChildren[i] != newChildren[i + count]: return false
  return true
```

### Utility Modules

#### NodeUtils (src/utils/NodeUtils.js)

**Responsibility**: Common DOM operations

**Functions**:
- `isHeavyElement()`: Identify expensive elements to preserve
- `getNodeDescription()`: Human-readable node representation
- `needsMediaProcessing()`: Check if media processing needed
- `updateElementAttributes()`: Sync attributes between elements

**Heavy Elements**:
- `<iframe>` - Full page load on recreation
- `<video>` - Media state loss on recreation
- `<img>` with blob/data URLs - URL invalidation on recreation
- Elements with `data-immutable="true"` - User-defined protection
- Elements with `data-processed-media="true"` - Already processed

#### MediaProcessor (src/utils/MediaProcessor.js)

**Responsibility**: Media element lifecycle management

**Features**:
- Image URL validation
- Local file path detection
- Custom processing callbacks
- Force reprocessing on source change

## Data Structures

### Virtual Node Structure

```javascript
{
  type: 'element' | 'text',
  
  // For elements:
  tagName: 'div',
  attributes: {
    'class': 'container',
    'id': 'main',
    'data-custom': 'value'
  },
  children: [/* recursive VNodes */],
  _nodeId: 'unique-identifier',  // Optional, improves matching
  _immutable: true,               // Optional, prevents modification
  
  // For text nodes:
  content: 'Hello World'
}
```

### Change Operation Structure

```javascript
// Text update
{
  type: 'updateText',
  path: 'div > p',
  element: <DOMNode>,
  oldContent: 'old text',
  newContent: 'new text'
}

// Attribute update
{
  type: 'updateAttributes',
  path: 'div > button',
  element: <DOMNode>,
  changes: [
    { name: 'class', oldValue: 'btn', newValue: 'btn active' },
    { name: 'disabled', oldValue: null, newValue: 'true' }
  ]
}

// Child insertion
{
  type: 'insertChild',
  path: 'div > ul',
  parent: <DOMNode>,
  child: <DOMNode>,
  index: 2
}

// Element replacement
{
  type: 'replace',
  path: 'div > span',
  oldElement: <DOMNode>,
  newElement: <DOMNode>
}
```

## Performance Optimizations

### 1. Early Exit Strategy

```javascript
// Skip comparison if nodes are obviously different
if (oldElement.nodeType !== newElement.nodeType) {
  return [{ type: 'replace', ... }];
}

// Skip if heavy elements with same source
if (isHeavyElement(old) && isHeavyElement(new)) {
  if (old.src === new.src) {
    return []; // No changes needed
  }
}
```

### 2. Structural Pattern Recognition

Instead of comparing all children individually (O(n*m)):

```javascript
// Detect common patterns in O(n)
if (isSimpleInsertion(oldChildren, newChildren)) {
  return handleInsertion(); // O(n) operation
}
```

This optimization is crucial for list rendering performance.

### 3. Key-Based Matching

Using explicit keys reduces comparison overhead:

```javascript
// Without keys: O(n*m) comparisons
for (const newChild of newChildren) {
  for (const oldChild of oldChildren) {
    if (equivalent(newChild, oldChild)) {
      match = oldChild;
      break;
    }
  }
}

// With keys: O(n + m) lookups
const oldMap = new Map(oldChildren.map(c => [c._nodeId, c]));
for (const newChild of newChildren) {
  const match = oldMap.get(newChild._nodeId);
}
```

### 4. Heavy Element Skipping

Avoid expensive operations on preserved elements:

```javascript
if (isHeavyElement(element)) {
  return; // Skip all modifications
}
```

This prevents:
- iframe reloads
- video state loss
- blob URL invalidation

### 5. Batch Operation Sorting

Group operations to minimize reflows:

```javascript
const sortedChanges = changes.sort((a, b) => {
  const order = {
    removeChild: 0,  // Remove first
    updateText: 2,   // Then update
    insertChild: 5   // Finally insert
  };
  return order[a.type] - order[b.type];
});
```

Browser benefits:
- One reflow per batch instead of per operation
- Better paint optimization
- Smoother visual updates

## Design Decisions

### Why Key-Based Reconciliation?

**Alternatives Considered**:
1. Position-based matching
2. Content-based hashing
3. Deep equality checks

**Why Keys Won**:
- O(n) lookup vs O(n*m) comparison
- Stable identity across updates
- Explicit developer control
- Handles node movements efficiently

### Why Separate Differ and Patcher?

**Benefits**:
- **Testability**: Can test diffing without DOM
- **Flexibility**: Can inspect changes before applying
- **Debugging**: Can log/analyze change operations
- **Extensibility**: Can implement custom patching strategies

**Tradeoff**: Slight memory overhead for change operations

### Why Support Both Real and Virtual DOM?

**Real DOM Support**:
- Direct integration with existing code
- No virtual DOM library required
- Simpler mental model

**Virtual DOM Support**:
- Better performance for complex updates
- Framework integration (React, Vue, etc.)
- Server-side rendering compatibility

**Implementation**: Unified interface handles both transparently

### Why Preserve Heavy Elements?

**Problem**: Recreating certain elements is expensive:
- `<iframe>`: Full page reload
- `<video>`: Buffering restart, state loss
- `<img>` with blob URLs: URL becomes invalid

**Solution**: Mark as "heavy" and skip during patching

**Tradeoff**: Content updates require full replacement

### Why Structural Change Detection?

**Without Detection**:
```javascript
Old: [A, B, C, D]
New: [A, B, X, C, D]

Operations:
- Update C → X
- Update D → C
- Insert D at end

Result: 3 operations, wrong content
```

**With Detection**:
```javascript
Operations:
- Insert X at position 2

Result: 1 operation, correct content
```

**Performance Impact**: 60-80% fewer operations for list updates

## Future Enhancements

### Planned Optimizations

1. **Fragment Support**: Batch insertions with DocumentFragment
2. **Memoization**: Cache comparison results for identical subtrees
3. **Worker Threading**: Offload diffing to Web Workers
4. **Async Patching**: Prioritize visible changes, defer off-screen

### Extensibility Points

1. **Custom Comparators**: Plugin system for domain-specific comparison
2. **Custom Patcher**: Alternative patching strategies
3. **Middleware**: Transform operations before application
4. **Lifecycle Hooks**: Before/after diff and patch events

## Conclusion

DeltaDOM's architecture balances:
- **Performance**: Optimized algorithms and early exits
- **Flexibility**: Works with real and virtual DOM
- **Safety**: Preserves expensive elements
- **Maintainability**: Modular design with clear responsibilities

The key insight is that most DOM updates follow predictable patterns (insertions, deletions, text changes). By detecting and optimizing for these patterns, DeltaDOM achieves high performance while maintaining a simple, understandable architecture.

