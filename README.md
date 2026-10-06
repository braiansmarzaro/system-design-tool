# System Design Tool

A browser-based workspace for creating, connecting, and explaining system architecture diagrams. The product draws inspiration from draw.io's flexible canvas, dbdiagram's structured modeling, and [Subnet Studio](https://subnetstudio.smarzaro.com/)'s focused visual workflow.

This document is the initial project charter. It defines the Scope of Project (SoP), objectives, and the guidelines that should shape product and engineering decisions.

## Scope of Project (SoP)

### Product statement

System Design Tool enables users to model software systems by placing reusable blocks on a canvas, configuring them, and connecting them to express relationships and data flow. It should make common architecture work fast while keeping diagrams clear enough to review, share, and evolve.

### Target users

- Software engineers designing or documenting systems
- Architects reviewing boundaries, dependencies, and data flow
- Technical teams collaborating during planning and design reviews
- Students learning system design concepts

### Core use cases

1. Create a diagram on an infinite or practically unbounded canvas.
2. Add common system components such as clients, services, databases, queues, caches, gateways, and external systems.
3. Move, resize, duplicate, group, and delete components.
4. Connect components with directed or undirected edges.
5. Label and configure blocks and connections.
6. Navigate large diagrams using pan, zoom, fit-to-view, and selection tools.
7. Save and reopen a diagram without losing its structure or layout.
8. Export a diagram for documentation or presentation.

### MVP deliverables

- A responsive diagram editor optimized for desktop use
- A block library containing essential system design components
- Drag-and-drop block creation
- Block selection, movement, resizing, duplication, and deletion
- Connection creation, editing, and deletion
- Editable names and concise metadata for blocks and connections
- Canvas pan, zoom, fit-to-view, grid, and snap behavior
- Undo and redo for editing operations
- Local persistence and a versioned diagram file format
- Import and export of the native diagram format
- Image export, initially PNG or SVG
- Keyboard-accessible commands for primary editing workflows

### Outside the initial scope

- Real-time multi-user editing
- User accounts, cloud synchronization, and permissions
- Automatic infrastructure provisioning
- Runtime monitoring or live topology discovery
- Full draw.io file compatibility
- Simulation, capacity planning, or cost estimation
- Mobile-first diagram authoring
- AI-generated architectures

These items may be reconsidered after the core editor is stable and validated.

## Objectives

### Product objectives

- **Fast creation:** A user should be able to produce a readable service-level architecture with minimal setup.
- **Clear communication:** Diagrams should emphasize relationships, direction, and system boundaries over decoration.
- **Low friction:** Common actions should be discoverable through direct manipulation, familiar controls, and keyboard shortcuts.
- **Reliable editing:** Undo, redo, persistence, and import/export must preserve user work predictably.
- **Extensibility:** New block types, properties, and export formats should be addable without redesigning the editor core.
- **Portability:** The native document format should be documented, versioned, and independent from the rendered UI.

### Initial success criteria

- A new user can create and connect a small architecture without instructions.
- Common canvas operations remain responsive with at least 200 blocks and 400 connections on a typical development machine.
- Saving and reopening a document reproduces its content and layout.
- Every destructive editing action can be reversed through undo until the configured history limit is reached.
- Exported diagrams remain legible at presentation and documentation sizes.
- Primary editing workflows can be completed without a mouse.

## Product Guidelines

### Model the system, not the drawing

Treat a diagram as structured domain data rather than a collection of pixels. Blocks, ports, connections, groups, and metadata are first-class entities. Rendering and export are projections of that model.

### Prefer progressive disclosure

Keep the canvas and frequent controls immediately available. Put advanced styling and metadata in contextual panels or menus so that the main workflow stays focused.

### Make state visible

Clearly communicate selection, connection direction, valid drop targets, unsaved changes, disabled actions, and errors. Editing modes must never be ambiguous.

### Preserve user intent

Avoid surprising automatic layout changes. Snapping, routing, and alignment aids should assist the user without moving unrelated content. Potentially destructive actions require undo support and, when undo is not possible, explicit confirmation.

### Optimize for readability

Use consistent spacing, restrained color, clear labels, and distinguishable connection styles. A diagram should remain understandable when exported without editor chrome.

### Use domain language consistently

- **Diagram:** The complete saved document.
- **Canvas:** The spatial editing surface.
- **Block:** A positioned visual entity representing a system component.
- **Port:** A connection point owned by a block.
- **Connection:** A relationship between two ports or blocks.
- **Group:** A visual or semantic boundary containing blocks.
- **Palette:** The library from which blocks are created.
- **Inspector:** The contextual editor for selected entities.

Avoid introducing synonyms for these concepts in code or UI copy without updating this glossary.

## Interaction Guidelines

- Use direct manipulation for placement, movement, resizing, and connecting.
- Keep selection behavior consistent with established diagram tools: click selects, drag creates a marquee, and modifier keys extend selection.
- Provide visible ports or connection handles when a block is selected or hovered.
- Make connection direction and endpoints visually unambiguous.
- Support standard shortcuts for select all, copy, paste, duplicate, delete, undo, redo, and zoom.
- Ensure pointer targets are large enough to use without precise positioning.
- Do not rely on color alone to communicate type, status, selection, or errors.
- Keep the canvas usable at common laptop resolutions and prevent panels from covering the active selection where practical.
- Use concise labels and tooltips for unfamiliar icon-only actions.
- Respect reduced-motion preferences and avoid animation that interferes with precise editing.

## Engineering Guidelines

### Architecture

- Keep the document model independent from Vue components and the rendering library.
- Separate domain operations from interaction state and presentation state.
- Represent editor changes as explicit commands or transactions so undo and redo remain reliable.
- Use stable identifiers for all persisted entities.
- Version the native document schema from its first release and provide migrations when it changes.
- Validate imported documents at the boundary before adding them to application state.
- Isolate persistence and export behind interfaces so local storage can later be replaced or supplemented.
- Prefer proven libraries for graph interaction, geometry, routing, and serialization when they satisfy the product constraints.

### Suggested document model

At minimum, a persisted diagram should contain:

- Schema version and document metadata
- Blocks with stable IDs, type, position, dimensions, properties, and optional parent group
- Ports with stable IDs and placement information
- Connections with stable IDs, source, target, direction, label, and style metadata
- Groups with stable IDs, bounds, label, and contained entities
- View-independent settings required to reproduce the diagram

Transient state such as hover, current selection, open menus, and viewport animation must not be stored as document content.

### Code quality

- Use Vue 3 Composition API and TypeScript with strict type checking.
- Keep components focused; move reusable domain behavior into typed modules or composables.
- Avoid coupling domain types to component props, DOM events, or rendering-library types.
- Prefer pure functions for document transformations and geometry calculations.
- Treat accessibility, loading, empty, error, and disabled states as part of feature completeness.
- Add dependencies only when they remove meaningful complexity and are actively maintained.
- Record major architectural decisions in short decision records under `docs/decisions/`.

### Testing

- Unit test document transformations, validation, migrations, and geometry logic.
- Component test controls and inspector behavior.
- End-to-end test critical workflows: create, connect, edit, undo, save, reopen, import, and export.
- Include keyboard-only coverage for primary workflows.
- Add performance checks for representative large diagrams before optimizing implementation details.
- Every `it()` or `test()` block must begin with `expect.hasAssertions()` or `expect.assertions(n)`.

### Performance

- Keep pointer-move work small and avoid unnecessary reactive updates during drag operations.
- Render only what is needed for the visible viewport when diagram size makes full rendering expensive.
- Batch related model changes into a single history operation.
- Measure interaction latency with realistic documents before adding caching or memoization.

### Security and privacy

- Treat imported diagram files as untrusted input.
- Never execute content from labels, metadata, or imported documents.
- Sanitize any user content included in SVG or HTML exports.
- Keep local documents on the device unless the user explicitly chooses to export or a future cloud feature states otherwise.
- Do not log diagram contents or potentially sensitive architecture metadata by default.

## Delivery Guidelines

Deliver the product in thin, usable increments:

1. Establish the typed document model and static canvas rendering.
2. Add block creation, selection, movement, and deletion.
3. Add ports and connections.
4. Add history, keyboard commands, and clipboard operations.
5. Add persistence, native import/export, and schema validation.
6. Add image export and accessibility coverage.
7. Test and tune large-diagram performance.

A feature is complete when its main workflow, keyboard behavior, empty/error states, persistence implications, tests, and documentation have been considered.

## Decision Priorities

When requirements conflict, use this order:

1. Prevent data loss or corruption.
2. Preserve correctness of the document model.
3. Maintain clear and predictable interaction behavior.
4. Meet accessibility requirements.
5. Maintain performance for the target document size.
6. Improve visual polish and convenience.

## Development Setup

### Prerequisites

- Node.js `^22.18.0` or `>=24.12.0`
- Bun

### Install dependencies

```sh
bun install
```

### Start development server

```sh
bun dev
```

### Type-check and build

```sh
bun run build
```
