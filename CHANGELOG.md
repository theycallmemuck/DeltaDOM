# Changelog

All notable changes to DeltaDOM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-10-30

### Added
- Initial release of DeltaDOM
- Core diffing engine with intelligent change detection
- Core patching engine with key-based reconciliation
- Node comparison utilities with multiple matching strategies
- Structural change detection (insertions, deletions, movements)
- Heavy element preservation (iframes, videos, blob images)
- Immutable element support via `data-immutable` attribute
- Media processing hooks for custom media handling
- Virtual DOM support with virtual node patching
- Comprehensive documentation and examples
- MIT License

### Features
- **Efficient Diffing**: O(n*m) complexity with early exit optimizations
- **Smart Patching**: Minimal DOM operations with strategic ordering
- **Structural Analysis**: Automatic detection of list insertions/deletions
- **Heavy Element Handling**: Preserves expensive elements (iframes, videos)
- **Attribute Comparison**: Granular attribute-level change detection
- **Text Node Optimization**: Fast path for simple text updates
- **Media Processing**: Extensible media element lifecycle management
- **Zero Dependencies**: Pure JavaScript implementation

### Performance
- Key-based node matching reduces unnecessary comparisons
- Structural change detection avoids O(n²) operations for lists
- Heavy element skipping prevents expensive re-renders
- Batch operation sorting minimizes reflows
- Early exit strategies for equivalent nodes

### Documentation
- Comprehensive README with API reference
- 15+ detailed examples covering common use cases
- Architecture documentation explaining module structure
- Performance considerations and best practices
- Integration guides for custom virtual DOM systems

### Module Structure
- `core/Differ.js`: Main diffing algorithm
- `core/Patcher.js`: DOM patching implementation
- `comparison/NodeComparator.js`: Node equivalence checking
- `comparison/StructuralComparator.js`: Structural change detection
- `utils/NodeUtils.js`: DOM utility functions
- `utils/MediaProcessor.js`: Media element handling

## [Unreleased]

### Planned
- TypeScript type definitions
- Performance benchmarks vs other libraries
- Browser extension for visual debugging
- Plugin system for custom node types
- Fragment support for efficient bulk operations
- Shadow DOM compatibility
- Web Components integration
- React/Vue/Svelte adapter packages

