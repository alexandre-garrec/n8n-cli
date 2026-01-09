export function cleanWorkflow(w) {
  return {
    name: w.name,
    nodes: (w.nodes || []).map((n) => ({
      name: n.name,
      type: n.type,
      position: n.position,
      parameters: n.parameters || {},
      notes: n.notes || "",
      notesInFlow: n.notesInFlow || false,
      disabled: n.disabled || false,
      typeVersion: n.typeVersion || 1,
    })),
    connections: w.connections || {},
    settings: w.settings || {},
    staticData: w.staticData || { lastId: 1 },
  };
}
