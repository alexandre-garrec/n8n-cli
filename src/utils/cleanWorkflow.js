/**
 * Nettoyage "minimal" (proche de ton exemple)
 * Objectif: rendre l'import stable entre instances.
 */
export function cleanWorkflow(w) {
  if (!w) return w;
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
    settings: w.settings && typeof w.settings === "object" ? w.settings : {},
    staticData: w.staticData && typeof w.staticData === "object" ? w.staticData : { lastId: 1 },
    // évite d'importer des champs "instance-specific"
  };
}
