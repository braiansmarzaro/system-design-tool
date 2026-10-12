# System Studio

System Studio is a workspace for modeling software systems as structured diagrams that can be edited, reviewed, saved, and shared.

## Language

**Diagram**:
The complete saved document containing the modeled system and its layout.
_Avoid_: Drawing, board

**Canvas**:
The spatial surface on which a Diagram is arranged and edited.
_Avoid_: Board, workspace

**Block**:
A positioned entity representing a system component.
_Avoid_: Node, card, shape

**Connection**:
A directed or undirected relationship between Blocks.
_Avoid_: Edge, link, line

**Annotation**:
Explanatory content placed on the Canvas that is not part of the modeled system.
_Avoid_: Block, decoration

**Inspector**:
The contextual editor for the currently selected entity.
_Avoid_: Properties panel, sidebar

**Edit**:
A user operation that changes Diagram content or layout and can be reversed as one unit.
_Avoid_: Action, mutation